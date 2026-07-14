from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from pydantic import BaseModel
from typing import Optional
import sqlite3
import os
import uuid
import shutil
import json
import time
from datetime import datetime
from fastapi.responses import FileResponse, StreamingResponse
from app.core.config import settings
from app.core.security import get_current_user

router = APIRouter()
APP_DB = settings.database_file_path

# Upload folder
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "tracking")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_db():
    conn = sqlite3.connect(APP_DB, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def require_contractor(user: dict):
    if user["role"] != "contractor":
        raise HTTPException(status_code=403, detail="Contractor access required")


def require_employer(user: dict):
    if user["role"] != "employer":
        raise HTTPException(status_code=403, detail="Employer access required")

# ── Upload proof image for a stage ─────────────────────────────────────────────
@router.post("/upload_proof")
async def upload_proof(project_id: int, stage_name: str, file: UploadFile = File(...), authorization: str = Header(None)):
    """Upload a proof image for a tracking stage. Returns the file URL."""
    user = get_current_user(authorization)
    require_contractor(user)

    # Verify contractor owns this project
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    if not proj or proj["contractor_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ในโครงการนี้")

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

    file_url = f"/api/tracking/images/{filename}"
    return {"url": file_url}

# ── Serve uploaded images ────────────────────────────────────────────────────────
@router.get("/images/{filename}")
def serve_image(filename: str):
    """Serve uploaded proof images."""
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์")
    return FileResponse(filepath)

class StageUpdate(BaseModel):
    project_id: int
    stage_name: str
    status: str
    proof_image_url: Optional[str] = None

class StageConfirm(BaseModel):
    project_id: int
    stage_name: str

def _send_chat_message(conn, sender_id: int, receiver_id: int, content: str):
    """Insert a system message into chat."""
    conn.execute(
        "INSERT INTO messages (sender_id, receiver_id, content, timestamp) VALUES (?, ?, ?, datetime('now'))",
        (sender_id, receiver_id, content)
    )

def _get_project_info(conn, project_id: int):
    return conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()

# ── Get projects for user ──────────────────────────────────────────────────────
@router.get("/projects")
def get_projects(user_id: int = 0, role: str = "employer", authorization: str = Header(None)):
    user = get_current_user(authorization)
    user_id = user["id"]  # Always use the authenticated user's ID
    role = user["role"]
    if role not in {"employer", "contractor"}:
        raise HTTPException(status_code=403, detail="บทบาทนี้ไม่สามารถดูโครงการได้")
    conn = get_db()
    if role == "employer":
        rows = conn.execute("""
            SELECT p.*, u.full_name as contractor_name
            FROM projects p
            LEFT JOIN users u ON p.contractor_id = u.id
            WHERE p.owner_id = ? AND p.status IN ('in_progress', 'completed')
            ORDER BY p.id ASC
        """, (user_id,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT p.*, u.full_name as employer_name
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.id
            WHERE p.contractor_id = ? AND p.status IN ('in_progress', 'completed')
            ORDER BY p.id ASC
        """, (user_id,)).fetchall()
    conn.close()

    result = []
    for r in rows:
        # Get quotation info
        q_row = None
        if r["quotation_id"]:
            conn2 = get_db()
            q_row = conn2.execute("SELECT content FROM messages WHERE id = ?", (r["quotation_id"],)).fetchone()
            conn2.close()

        quotation_info = None
        if q_row and q_row["content"].startswith("quotation|"):
            from .chat import parse_message
            body = q_row["content"][len("quotation|"):]
            rparts = body.rsplit("|", 2)
            if len(rparts) >= 3:
                left = rparts[0]
                amount_str = rparts[1]
                status = rparts[2].strip()
                left_parts = left.split("|", 1)
                qt_title = left_parts[0].strip() if left_parts else ""
                quotation_info = {
                    "id": r["quotation_id"],
                    "title": qt_title,
                    "amount": int(float(amount_str)) if amount_str else 0,
                    "status": status,
                }

        result.append({
            "id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "budget": r["budget"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "status": r["status"],
            "owner_id": r["owner_id"],
            "contractor_id": r["contractor_id"],
            "quotation_id": r["quotation_id"],
            "contractor_name": r["contractor_name"] if role == "employer" else None,
            "employer_name": r["employer_name"] if role == "contractor" else None,
            "quotation": quotation_info,
        })
    return result

# ── Get stages for a project ───────────────────────────────────────────────────
@router.get("/stages")
def get_stages(project_id: int, authorization: str = Header(None)):
    user = get_current_user(authorization)
    conn = get_db()
    # Verify user owns or is contracted to this project
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    if not proj:
        raise HTTPException(status_code=404, detail="ไม่พบโครงการ")
    if proj["owner_id"] != user["id"] and proj["contractor_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ในโครงการนี้")
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM project_tracking WHERE project_id = ? ORDER BY id ASC",
        (project_id,)
    ).fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "stage_name": r["stage_name"],
            "status": r["status"],
            "timestamp": r["timestamp"],
            "proof_image_url": r["proof_image_url"],
            "awaiting_confirm": bool(r["awaiting_confirm"]),
        }
        for r in rows
    ]

# ── Contractor: mark stage done (pending employer confirm) ─────────────────────
@router.post("/update_stage")
def update_stage(update: StageUpdate, authorization: str = Header(None)):
    user = get_current_user(authorization)
    require_contractor(user)
    conn = get_db()
    # Verify contractor owns this project
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (update.project_id,)).fetchone()
    if not proj or proj["contractor_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ในโครงการนี้")
    conn.execute(
        """UPDATE project_tracking
           SET status = 'done_pending', awaiting_confirm = 1, proof_image_url = ?, timestamp = datetime('now')
           WHERE project_id = ? AND stage_name = ?""",
        (update.proof_image_url, update.project_id, update.stage_name)
    )

    # Auto-send chat message to employer
    if proj["owner_id"] and proj["contractor_id"]:
        msg = f"system_update|📋 อัปเดตงาน [{proj['title']}]: ขั้นตอน '{update.stage_name}' เสร็จแล้ว — รอการยืนยันจากท่านครับ"
        _send_chat_message(conn, proj["contractor_id"], proj["owner_id"], msg)

    conn.commit()
    conn.close()
    return {"status": "success", "message": "รอผู้ว่าจ้างยืนยัน"}

# ── Employer: confirm stage ────────────────────────────────────────────────────
@router.post("/confirm_stage")
def confirm_stage(confirm: StageConfirm, authorization: str = Header(None)):
    user = get_current_user(authorization)
    require_employer(user)
    conn = get_db()
    # Verify employer owns this project
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (confirm.project_id,)).fetchone()
    if not proj or proj["owner_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ในโครงการนี้")
    conn.execute(
        """UPDATE project_tracking
           SET status = 'completed', awaiting_confirm = 0, timestamp = datetime('now')
           WHERE project_id = ? AND stage_name = ?""",
        (confirm.project_id, confirm.stage_name)
    )

    # Activate next pending stage
    next_stage = conn.execute(
        "SELECT id FROM project_tracking WHERE project_id = ? AND status = 'pending' ORDER BY id ASC LIMIT 1",
        (confirm.project_id,)
    ).fetchone()
    if next_stage:
        conn.execute("UPDATE project_tracking SET status = 'active' WHERE id = ?", (next_stage["id"],))

    # Check all complete
    remaining = conn.execute(
        "SELECT COUNT(*) as cnt FROM project_tracking WHERE project_id = ? AND status NOT IN ('completed')",
        (confirm.project_id,)
    ).fetchone()

    # Auto-send chat message to contractor
    proj = _get_project_info(conn, confirm.project_id)
    if proj and proj["owner_id"] and proj["contractor_id"]:
        if remaining["cnt"] == 0:
            msg = f"system_update|🎉 โครงการ [{proj['title']}] เสร็จสมบูรณ์แล้ว! ขอบคุณสำหรับการทำงานที่ยอดเยี่ยม"
        else:
            msg = f"system_update|✅ ยืนยันขั้นตอน '{confirm.stage_name}' แล้ว — กรุณาดำเนินการขั้นตอนถัดไปได้เลย"
        _send_chat_message(conn, proj["owner_id"], proj["contractor_id"], msg)

    conn.commit()
    conn.close()

    if remaining["cnt"] == 0:
        return {"status": "success", "message": "โครงการเสร็จสมบูรณ์!", "project_complete": True}
    return {"status": "success", "project_complete": False}

# ── Reset project stages ────────────────────────────────────────────────────────
@router.post("/reset")
def reset_stages(project_id: int, authorization: str = Header(None)):
    from app.core.security import get_current_user
    user = get_current_user(authorization)
    require_employer(user)
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบโครงการ")
    if proj["owner_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์รีเซ็ตโครงการนี้")
    conn.execute("DELETE FROM project_tracking WHERE project_id = ?", (project_id,))
    stages = ["เสนอราคาและทำสัญญา", "เริ่มงาน — สำรวจพื้นที่", "จัดหาวัสดุ", "เริ่มก่อสร้าง", "จบงาน"]
    for i, s in enumerate(stages):
        status = "active" if i == 0 else "pending"
        conn.execute(
            "INSERT INTO project_tracking (project_id, stage_name, status, awaiting_confirm) VALUES (?, ?, ?, 0)",
            (project_id, s, status)
        )
    conn.commit()
    conn.close()
    return {"status": "success"}

# ── SSE: Real-time stage updates ──────────────────────────────────────────────
@router.get("/events/{project_id}")
def sse_stages(project_id: int, authorization: str = Header(None)):
    """Server-Sent Events for real-time stage updates. Requires auth + project access."""
    from app.core.security import get_current_user
    user = get_current_user(authorization)
    # Verify project access
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    if not proj:
        raise HTTPException(status_code=404, detail="ไม่พบโครงการ")
    if proj["owner_id"] != user["id"] and proj["contractor_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ในโครงการนี้")

    def event_stream():
        last_states = {}

        while True:
            conn = get_db()
            try:
                rows = conn.execute(
                    "SELECT stage_name, status, timestamp, proof_image_url FROM project_tracking WHERE project_id = ? ORDER BY id ASC",
                    (project_id,)
                ).fetchall()

                current_states = {r["stage_name"]: r["status"] for r in rows}
                if current_states != last_states:
                    last_states = current_states
                    data = {
                        "stages": [
                            {"stage_name": r["stage_name"], "status": r["status"],
                             "timestamp": r["timestamp"], "proof_image_url": r["proof_image_url"]}
                            for r in rows
                        ]
                    }
                    yield f"data: {json.dumps(data)}\n\n"
            finally:
                conn.close()

            time.sleep(2)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
