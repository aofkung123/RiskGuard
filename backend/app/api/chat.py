from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from pydantic import BaseModel
import sqlite3
from datetime import datetime
from app.core.config import settings
from app.core.security import get_current_user

router = APIRouter()
APP_DB = settings.database_file_path

def get_db():
    conn = sqlite3.connect(APP_DB, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

class MessageSend(BaseModel):
    sender_id: int
    receiver_id: int
    content: str
    type: str = "text"
    action_data: Optional[dict] = None

class ActionUpdate(BaseModel):
    message_id: str
    action: str

def parse_message(r, user1: int) -> dict:
    content = r["content"] or ""
    msg_type = "text"
    action_data = None
    display_text = content

    if content.startswith("quotation|"):
        msg_type = "quotation"
        body = content[len("quotation|"):]
        try:
            # Format: quotation|title|description|amount|status
            # Split off status and amount from the right first to avoid breaking on escaped "|" in description
            rparts = body.rsplit("|", 2)
            if len(rparts) >= 3:
                status = rparts[2].strip()
                try:
                    amount = int(float(rparts[1].strip()))
                except (ValueError, IndexError):
                    amount = 0
                left = rparts[0]
                left_parts = left.split("|", 1)
                if len(left_parts) >= 2:
                    title       = left_parts[0].strip()
                    description = left_parts[1].strip().replace("||", "|").replace("//", "|")
                else:
                    title       = left.strip()
                    description = ""
            else:
                title = body
                description = ""
                amount = 0
                status = "pending"

        except Exception:
            title, description, amount, status = "", "", 0, "pending"

        action_data = {
            "title":       title,
            "description": description,
            "amount":      amount,
            "status":      status,
        }
        display_text = "ใบเสนอราคา"

    elif content.startswith("system_update|"):
        msg_type = "system_update"
        display_text = content[len("system_update|"):]

    elif content.startswith("image|"):
        msg_type = "image"
        display_text = content[len("image|"):]

    ts_raw = r["timestamp"]
    try:
        ts_dt = datetime.fromisoformat(ts_raw) if ts_raw else datetime.now()
        ts_str = ts_dt.strftime("%d/%m/%Y %H:%M น.")
    except Exception:
        ts_str = "—"

    sender_id = r["sender_id"]
    conn = get_db()
    sender_user = conn.execute("SELECT full_name, email FROM users WHERE id = ?", (sender_id,)).fetchone()
    receiver_user = conn.execute("SELECT full_name, email FROM users WHERE id = ?", (r["receiver_id"],)).fetchone()
    conn.close()

    return {
        "id": f"msg_{r['id']}",
        "sender": "me" if sender_id == user1 else "contractor",
        "sender_id": sender_id,
        "receiver_id": r["receiver_id"],
        "sender_name": sender_user["full_name"] if sender_user else "",
        "receiver_name": receiver_user["full_name"] if receiver_user else "",
        "type": msg_type,
        "text": display_text,
        "content": content,
        "timestamp": ts_str,
        "actionData": action_data,
    }

@router.get("/messages")
def get_messages(user1: int = 0, user2: int = 0, authorization: str = Header(None)):
    user = get_current_user(authorization)
    user1 = user["id"]  # Always use the authenticated user's ID
    conn = get_db()
    rows = conn.execute("""
        SELECT * FROM messages
        WHERE (sender_id = ? AND receiver_id = ?)
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY id ASC
    """, (user1, user2, user2, user1)).fetchall()
    conn.close()
    return [parse_message(r, user1) for r in rows]

@router.get("/contacts")
def get_contacts(user_id: int = 0, authorization: str = Header(None)):
    """Return unique conversation partners for a user."""
    user = get_current_user(authorization)
    user_id = user["id"]  # Always use the authenticated user's ID
    conn = get_db()
    rows = conn.execute("""
        SELECT DISTINCT
            CASE
                WHEN sender_id = ? THEN receiver_id
                ELSE sender_id
            END AS partner_id
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        ORDER BY id DESC
    """, (user_id, user_id, user_id)).fetchall()
    conn.close()

    partners = []
    for r in rows:
        pid = r["partner_id"]
        conn2 = get_db()
        user = conn2.execute(
            "SELECT u.id, u.full_name, u.email, u.role, up.avatar_url "
            "FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id "
            "WHERE u.id = ?",
            (pid,)
        ).fetchone()
        conn2.close()

        if user:
            partners.append({
                "id": user["id"],
                "name": user["full_name"] or user["email"],
                "role": user["role"],
                "avatar": user["avatar_url"] or "",
            })

    return partners

@router.get("/quotations")
def get_quotations(authorization: str = Header(None)):
    """Return all quotation messages sent to this employer (from auth token)."""
    user = get_current_user(authorization)
    conn = get_db()
    rows = conn.execute("""
        SELECT * FROM messages
        WHERE receiver_id = ?
          AND content LIKE 'quotation|%'
        ORDER BY id DESC
    """, (user["id"],)).fetchall()
    conn.close()

    results = []
    for r in rows:
        parsed = parse_message(r, user["id"])
        if parsed.get("actionData"):
            conn2 = get_db()
            sender_user = conn2.execute("SELECT full_name, role FROM users WHERE id = ?", (r["sender_id"],)).fetchone()
            conn2.close()
            results.append({
                "id": parsed["id"],
                "sender_id": r["sender_id"],
                "sender_name": sender_user["full_name"] if sender_user else "",
                "timestamp": parsed["timestamp"],
                "status": parsed["actionData"]["status"],
                "title": parsed["actionData"]["title"],
                "description": parsed["actionData"]["description"],
                "amount": parsed["actionData"]["amount"],
            })
    return results

@router.post("/messages")
def send_message(msg: MessageSend, authorization: str = Header(None)):
    user = get_current_user(authorization)
    conn = get_db()
    receiver = conn.execute("SELECT id, role FROM users WHERE id = ?", (msg.receiver_id,)).fetchone()
    if not receiver or msg.receiver_id == user["id"]:
        conn.close()
        raise HTTPException(status_code=400, detail="ผู้รับข้อความไม่ถูกต้อง")
    content_str = msg.content

    if msg.type == "quotation" and msg.action_data:
        if user["role"] != "contractor" or receiver["role"] != "employer":
            conn.close()
            raise HTTPException(status_code=403, detail="ใบเสนอราคาต้องส่งจากผู้รับเหมาไปยังผู้ว่าจ้าง")
        ad = msg.action_data
        title  = ad.get("title", "")
        desc   = ad.get("description", "")
        desc   = desc.replace("|", "||")
        amount = int(ad.get("amount", 0))
        status = ad.get("status", "pending")
        content_str = f"quotation|{title}|{desc}|{amount}|{status}"

    conn.execute(
        "INSERT INTO messages (sender_id, receiver_id, content, timestamp) VALUES (?, ?, ?, datetime('now'))",
        (user["id"], msg.receiver_id, content_str)
    )
    conn.commit()
    conn.close()
    return {"status": "success"}

@router.post("/action")
def update_action(update: ActionUpdate, authorization: str = Header(None)):
    user = get_current_user(authorization)
    if user["role"] != "employer":
        raise HTTPException(status_code=403, detail="เฉพาะผู้ว่าจ้างเท่านั้นที่ยืนยันใบเสนอราคาได้")
    if update.action not in {"approve", "reject"}:
        raise HTTPException(status_code=400, detail="คำสั่งไม่ถูกต้อง")
    conn = get_db()
    raw_id = update.message_id.replace("msg_", "")
    if not raw_id.isdigit():
        conn.close()
        return {"status": "error", "message": "invalid message id"}
    msg_id = int(raw_id)

    row = conn.execute("SELECT * FROM messages WHERE id = ?", (msg_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบข้อความ")

    # Only the receiver (employer) can approve/reject
    if row["receiver_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ดำเนินการนี้")

    if row and row["content"].startswith("quotation|"):
        body = row["content"][len("quotation|"):]
        rparts = body.rsplit("|", 2)
        if len(rparts) >= 3:
            current_status = rparts[2].strip()
            if current_status != "pending":
                conn.close()
                raise HTTPException(status_code=409, detail="ใบเสนอราคานี้ถูกดำเนินการแล้ว")
            left = rparts[0]
            amount = rparts[1]
            left_parts = left.split("|", 1)
            if len(left_parts) >= 2:
                title       = left_parts[0]
                description = left_parts[1]
            else:
                title       = left
                description = ""

            new_status  = "approved" if update.action == "approve" else "rejected"
            new_body    = f"{title}|{description}|{amount}|{new_status}"
            new_content = "quotation|" + new_body
            conn.execute("UPDATE messages SET content = ? WHERE id = ?", (new_content, msg_id))

            # ── Auto-create project + tracking stages when approved ──
            if update.action == "approve":
                sender_id   = row["sender_id"]      # contractor
                receiver_id = row["receiver_id"]     # employer
                budget      = int(float(amount)) if amount else 0
                days_str    = "14"
                try:
                    parts = description.split("|")
                    for p in parts:
                        if "วัน" in p or "day" in p.lower():
                            import re
                            m = re.search(r"(\d+)", p)
                            if m: days_str = m.group(1)
                except: pass

                from datetime import datetime, timedelta
                start_d = datetime.now().strftime("%Y-%m-%d")
                end_d   = (datetime.now() + timedelta(days=int(days_str))).strftime("%Y-%m-%d")

                # Insert project linked to quotation
                existing_project = conn.execute(
                    "SELECT id FROM projects WHERE quotation_id = ?", (msg_id,)
                ).fetchone()
                if existing_project:
                    conn.close()
                    raise HTTPException(status_code=409, detail="ใบเสนอราคานี้สร้างโครงการแล้ว")

                conn.execute("""
                    INSERT INTO projects (title, description, budget, start_date, end_date, status, owner_id, contractor_id, quotation_id)
                    VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?)
                """, (title, description, budget, start_d, end_d, receiver_id, sender_id, msg_id))

                proj_row = conn.execute("SELECT last_insert_rowid() as id").fetchone()
                proj_id  = proj_row["id"]

                # Insert tracking stages
                stages = ["เสนอราคาและทำสัญญา", "เริ่มงาน — สำรวจพื้นที่", "จัดหาวัสดุ", "เริ่มก่อสร้าง", "ตรวจรับและส่งมอบ"]
                for i, s in enumerate(stages):
                    status2 = "completed" if i == 0 else ("active" if i == 1 else "pending")
                    conn.execute(
                        "INSERT INTO project_tracking (project_id, stage_name, status, awaiting_confirm) VALUES (?, ?, ?, 0)",
                        (proj_id, s, status2)
                    )

                # ── Insert initial EVM snapshot (Week 1) ──
                # PV = 10% of budget (planned value at project start)
                # EV = 0 (no earned value yet), AC = 0 (no actual cost yet)
                initial_pv = round(budget * 0.10, 2)
                conn.execute("""
                    INSERT INTO project_analytics (project_id, date, pv, ev, ac)
                    VALUES (?, ?, ?, 0, 0)
                """, (proj_id, start_d, initial_pv))

            conn.commit()
    conn.close()
    return {"status": "success"}

# ── Chat Image Upload Endpoints ──────────────────────────────────────────────
import os
import shutil
import uuid
from fastapi import File, UploadFile
from fastapi.responses import FileResponse

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "chat")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_chat_image(file: UploadFile = File(...), authorization: str = Header(None)):
    """Upload an image file for a chat message. Returns the file URL."""
    # Verify user is logged in
    user = get_current_user(authorization)
    
    # Validate file type
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์รูปภาพ (jpg, png, gif, webp)")
        
    # Generate unique filename
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save file
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
        
    file_url = f"/api/chat/images/{filename}"
    return {"url": file_url}

@router.get("/images/{filename}")
def serve_chat_image(filename: str):
    """Serve uploaded chat images."""
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์")
    return FileResponse(filepath)
