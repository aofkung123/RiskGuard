from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.core import db_compat as sqlite3
from urllib.parse import urlparse
from app.core.config import settings
from app.core.security import get_current_user

router = APIRouter()
APP_DB = settings.database_file_path

def get_db():
    conn = sqlite3.connect(APP_DB, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def normalize_media_url(value: Optional[str]) -> str:
    url = (value or "").strip()
    if not url:
        return ""
    if url.startswith("/"):
        return url
    parsed = urlparse(url)
    return url if parsed.scheme in {"http", "https"} and parsed.netloc else ""

def safe_int(value, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default

def safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

class ServiceCreate(BaseModel):
    contractor_id: int
    title: str
    category: str
    price: int
    location: str
    detail_description: Optional[str] = ""
    experience_years: Optional[int] = 1
    image_url: Optional[str] = ""

class ServiceDelete(BaseModel):
    service_id: int
    contractor_id: int

@router.get("/services")
def get_services():
    conn = get_db()
    rows = conn.execute("""
        SELECT p.id, p.title, p.description, p.image_url, p.detail_description, p.experience_years,
               u.full_name as contractor_name, u.id as contractor_id,
               up.avatar_url, up.profile_completed
        FROM portfolios p
        JOIN users u ON p.contractor_id = u.id
        LEFT JOIN user_profiles up ON up.user_id = u.id
    """).fetchall()
    conn.close()

    services = []
    for r in rows:
        parts = (r["description"] or "").split("|")
        category = parts[0] if len(parts) > 0 else "ทั่วไป"
        price = safe_int(parts[1]) if len(parts) > 1 else 0
        location = parts[2] if len(parts) > 2 else "ไม่ระบุ"
        rating = safe_float(parts[3]) if len(parts) > 3 else 0.0
        reviews = safe_int(parts[4]) if len(parts) > 4 else 0

        services.append({
            "id": f"srv_{r['id']}",
            "portfolio_id": r["id"],
            "title": r["title"],
            "contractorId": r["contractor_id"],
            "contractorName": r["contractor_name"],
            "category": category,
            "startingPrice": price,
            "rating": rating,
            "reviews": reviews,
            "location": location,
            "coverImage": normalize_media_url(r["image_url"]),
            "avatar": normalize_media_url(r["avatar_url"]),
            "verified": bool(r["profile_completed"]),
            "detailDescription": r["detail_description"] or "",
            "experienceYears": r["experience_years"] or 1,
        })
    return services

@router.post("/services")
def create_service(s: ServiceCreate, authorization: str = Header(None)):
    user = get_current_user(authorization)
    if user["role"] != "contractor":
        raise HTTPException(status_code=403, detail="Only contractors can create services")
    conn = get_db()
    contractor_id = user["id"]
    profile = conn.execute("SELECT profile_completed FROM user_profiles WHERE user_id = ?", (contractor_id,)).fetchone()
    if not profile or not profile["profile_completed"]:
        conn.close()
        raise HTTPException(status_code=403, detail="กรุณาตั้งค่าโปรไฟล์ให้ครบก่อนโพสงาน")
    if not s.title.strip() or s.price < 0 or (s.experience_years or 0) < 0:
        conn.close()
        raise HTTPException(status_code=400, detail="ข้อมูลบริการไม่ถูกต้อง")
    desc = f"{s.category}|{s.price}|{s.location}|0.0|0"
    conn.execute(
        "INSERT INTO portfolios (contractor_id, title, description, image_url, detail_description, experience_years) VALUES (?, ?, ?, ?, ?, ?)",
        (contractor_id, s.title.strip(), desc, normalize_media_url(s.image_url), s.detail_description, s.experience_years)
    )
    conn.commit()
    conn.close()
    return {"status": "success"}

class ServiceUpdate(BaseModel):
    service_id: int
    contractor_id: Optional[int] = None  # ignored, taken from auth
    title: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = None
    location: Optional[str] = None
    detail_description: Optional[str] = None
    experience_years: Optional[int] = None
    image_url: Optional[str] = None

@router.put("/services/{service_id}")
def update_service(service_id: int, update: ServiceUpdate, authorization: str = Header(None)):
    user = get_current_user(authorization)
    if user["role"] != "contractor":
        raise HTTPException(status_code=403, detail="Only contractors can update services")
    conn = get_db()
    # Verify ownership
    existing = conn.execute(
        "SELECT * FROM portfolios WHERE id = ? AND contractor_id = ?",
        (service_id, user["id"])
    ).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบบริการหรือคุณไม่มีสิทธิ์แก้ไข")

    fields = []
    vals = []
    if update.title is not None:
        fields.append("title = ?"); vals.append(update.title)
    if update.category is not None or update.price is not None or update.location is not None:
        old_desc = existing["description"] or ""
        parts = old_desc.split("|")
        cat = update.category if update.category is not None else (parts[0] if len(parts) > 0 else "ทั่วไป")
        price = update.price if update.price is not None else (safe_int(parts[1]) if len(parts) > 1 else 0)
        loc = update.location if update.location is not None else (parts[2] if len(parts) > 2 else "ไม่ระบุ")
        fields.append("description = ?")
        vals.append(f"{cat}|{price}|{loc}|0.0|0")
    if update.detail_description is not None:
        fields.append("detail_description = ?"); vals.append(update.detail_description)
    if update.experience_years is not None:
        fields.append("experience_years = ?"); vals.append(update.experience_years)
    if update.image_url is not None:
        fields.append("image_url = ?"); vals.append(normalize_media_url(update.image_url))

    if fields:
        vals.append(service_id)
        conn.execute(f"UPDATE portfolios SET {', '.join(fields)} WHERE id = ?", vals)

    conn.commit()
    conn.close()
    return {"status": "success"}


@router.delete("/services/{service_id}")
def delete_service(service_id: int, authorization: str = Header(None)):
    user = get_current_user(authorization)
    if user["role"] != "contractor":
        raise HTTPException(status_code=403, detail="Only contractors can delete services")
    conn = get_db()
    cursor = conn.execute("DELETE FROM portfolios WHERE id = ? AND contractor_id = ?", (service_id, user["id"]))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบบริการหรือคุณไม่มีสิทธิ์ลบ")
    conn.commit()
    conn.close()
    return {"status": "success"}
