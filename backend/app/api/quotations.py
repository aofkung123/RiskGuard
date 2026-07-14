from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime
from app.core.config import settings
from app.core.security import get_current_user

router = APIRouter()
APP_DB = settings.database_file_path


def get_db():
    from app.core import db_compat as sqlite3
    conn = sqlite3.connect(APP_DB, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


class QuotationItem(BaseModel):
    category: str
    quantity: float
    unit_price: float
    total: float


class QuotationCreate(BaseModel):
    title: str
    items: List[QuotationItem]
    total: float


class QuotationResponse(BaseModel):
    id: int
    title: str
    items: str
    total: float
    status: str
    created_at: str


@router.get("/", response_model=List[QuotationResponse])
def list_quotations(authorization: str = Header(None)):
    """List quotations for current user."""
    user = get_current_user(authorization)
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM quotations WHERE user_id = ? ORDER BY created_at DESC",
        (user["id"],)
    ).fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "items": r["items"],
            "total": r["total"],
            "status": r["status"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


@router.post("/", response_model=QuotationResponse)
def create_quotation(quotation: QuotationCreate, authorization: str = Header(None)):
    """Create a new quotation from calculator."""
    user = get_current_user(authorization)
    conn = get_db()
    items_json = json.dumps([item.model_dump() for item in quotation.items], ensure_ascii=False)

    cursor = conn.execute(
        """INSERT INTO quotations (user_id, title, items, total, status, created_at)
           VALUES (?, ?, ?, ?, 'draft', datetime('now'))""",
        (user["id"], quotation.title, items_json, quotation.total)
    )
    conn.commit()
    new_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM quotations WHERE id = ?", (new_id,)).fetchone()
    conn.close()

    return {
        "id": row["id"],
        "title": row["title"],
        "items": row["items"],
        "total": row["total"],
        "status": row["status"],
        "created_at": row["created_at"],
    }


@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation(quotation_id: int, authorization: str = Header(None)):
    user = get_current_user(authorization)
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM quotations WHERE id = ? AND user_id = ?",
        (quotation_id, user["id"])
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบใบเสนอราคา")
    return {
        "id": row["id"],
        "title": row["title"],
        "items": row["items"],
        "total": row["total"],
        "status": row["status"],
        "created_at": row["created_at"],
    }
