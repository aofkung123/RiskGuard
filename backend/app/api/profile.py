from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
import sqlite3
from app.core.config import settings
from app.core.security import get_current_user

router = APIRouter()
APP_DB = settings.database_file_path

def get_db():
    conn = sqlite3.connect(APP_DB, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

@router.get("/me")
def get_me(user = Depends(get_current_user)):
    conn = get_db()
    profile = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],)).fetchone()
    conn.close()
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "phone": profile["phone"] if profile else None,
        "address": profile["address"] if profile else None,
        "bio": profile["bio"] if profile else None,
        "avatar_url": profile["avatar_url"] if profile else None,
        "company_name": profile["company_name"] if profile else None,
        "tax_id": profile["tax_id"] if profile else None,
        "profile_completed": bool(profile["profile_completed"]) if profile else False,
    }




class ProfileUpdate(BaseModel):
    user_id: Optional[int] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    company_name: Optional[str] = None
    tax_id: Optional[str] = None

@router.get("/{user_id}")
def get_profile(user_id: int, authorization: str = Header(None)):
    current_user = get_current_user(authorization)
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ดูข้อมูลส่วนตัวนี้")
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    profile = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "phone": profile["phone"] if profile else None,
        "address": profile["address"] if profile else None,
        "bio": profile["bio"] if profile else None,
        "avatar_url": profile["avatar_url"] if profile else None,
        "company_name": profile["company_name"] if profile else None,
        "tax_id": profile["tax_id"] if profile else None,
        "profile_completed": bool(profile["profile_completed"]) if profile else False,
    }

@router.post("/update")
def update_profile(p: ProfileUpdate, authorization: str = Header(None)):
    current_user = get_current_user(authorization)
    user_id = current_user["id"]
    conn = get_db()
    # Check if profile exists
    existing = conn.execute("SELECT user_id FROM user_profiles WHERE user_id = ?", (user_id,)).fetchone()

    # Profile is complete if phone + bio are filled
    profile_completed = 1 if (p.phone and p.bio) else 0

    if existing:
        conn.execute("""
            UPDATE user_profiles SET phone=?, address=?, bio=?, avatar_url=?, company_name=?, tax_id=?, profile_completed=?
            WHERE user_id=?
        """, (p.phone, p.address, p.bio, p.avatar_url, p.company_name, p.tax_id, profile_completed, user_id))
    else:
        conn.execute("""
            INSERT INTO user_profiles (user_id, phone, address, bio, avatar_url, company_name, tax_id, profile_completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, p.phone, p.address, p.bio, p.avatar_url, p.company_name, p.tax_id, profile_completed))

    conn.commit()
    conn.close()
    return {"status": "success", "profile_completed": bool(profile_completed)}
