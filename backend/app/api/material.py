"""
Material API — ดึงข้อมูลวัสดุจาก DW&BI ผ่าน RiskGuard DB
"""
import sqlite3
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.core.config import settings
from app.core.database import get_db
from app.models.models import (
    Material, MaterialCategory, ProjectMaterialBudget, Project
)
from app.schemas.material import (
    MaterialCategoryResponse,
    MaterialCategoryCreate,
    MaterialResponse,
    MaterialPriceSummary,
    ProjectMaterialBudgetCreate,
    ProjectMaterialBudgetResponse,
    CalculatorRequest,
    CalculatorResponse,
    CalculatorItem,
    DwSyncStatus,
    BrandSummary,
    MaterialDetail,
)
from app.etl.sync_from_dw import sync_categories, sync_materials, get_sync_summary, ensure_tables

router = APIRouter()

DW_DB = settings.dw_database_file_path


# ─────────────────────────────────────────────────────────────────────────────
# Helper: direct SQLite for DW reads (no ORM overhead)
# ─────────────────────────────────────────────────────────────────────────────
def get_dw_conn():
    conn = sqlite3.connect(DW_DB, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


# ══════════════════════════════════════════════════════════════════════════════
# IMPORTANT: Routes with FIXED paths MUST come BEFORE /{param} routes
# FastAPI matches in declaration order — /sync-status would match /{material_id}
# ══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# ETL Sync endpoints  (put BEFORE /{material_id})
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/sync-from-dw", response_model=DwSyncStatus)
def trigger_dw_sync(db: Session = Depends(get_db)):
    """Trigger ETL sync: ดึงข้อมูลจาก DW&BI มาลง RiskGuard DB"""
    from app.etl.sync_from_dw import get_rg_conn, ensure_tables
    rg_path = settings.database_file_path

    if not os.path.exists(rg_path):
        raise HTTPException(status_code=500, detail=f"RiskGuard DB not found: {rg_path}")

    try:
        # Use direct connection (same as CLI)
        rg_conn = get_rg_conn(rg_path)
        ensure_tables(rg_conn)
        cat_map = sync_categories(rg_conn)
        total = sync_materials(rg_conn, cat_map)

        # Read back counts
        cur = rg_conn.cursor()
        cat_count = cur.execute("SELECT COUNT(*) FROM material_categories").fetchone()[0]
        mat_count = cur.execute("SELECT COUNT(*) FROM materials").fetchone()[0]
        last_sync = cur.execute(
            "SELECT MAX(collection_date) FROM materials WHERE collection_date IS NOT NULL"
        ).fetchone()[0]
        rg_conn.close()

        return DwSyncStatus(
            dw_path=DW_DB,
            last_sync=last_sync,
            total_synced=mat_count,
            categories_synced=cat_count,
            status="success",
        )
    except Exception as e:
        return DwSyncStatus(dw_path=DW_DB, status=f"error: {str(e)}")


@router.get("/sync-status", response_model=DwSyncStatus)
def get_sync_status(db: Session = Depends(get_db)):
    """ตรวจสอบสถานะ sync ล่าสุด"""
    try:
        cur = db.execute(text("SELECT COUNT(*) FROM material_categories"))
        cat_count = cur.scalar() or 0
        cur2 = db.execute(text("SELECT COUNT(*) FROM materials"))
        mat_count = cur2.scalar() or 0
        cur3 = db.execute(
            text("SELECT MAX(collection_date) FROM materials WHERE collection_date IS NOT NULL")
        )
        last_sync = cur3.scalar()

        return DwSyncStatus(
            dw_path=DW_DB,
            last_sync=last_sync,
            total_synced=mat_count,
            categories_synced=cat_count,
            status="success",
        )
    except Exception as e:
        return DwSyncStatus(dw_path=DW_DB, status=f"error: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# Category endpoints
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/categories", response_model=List[MaterialCategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(MaterialCategory).order_by(MaterialCategory.name).all()


@router.post("/categories", response_model=MaterialCategoryResponse)
def create_category(data: MaterialCategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(MaterialCategory).filter(MaterialCategory.name == data.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    cat = MaterialCategory(**data.model_dump(exclude={"id"}))
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ─────────────────────────────────────────────────────────────────────────────
# Material endpoints  (fixed paths first, then /{material_id})
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[MaterialResponse])
def list_materials(
    category_id: Optional[int] = None,
    source: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    brand: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Material)
    if category_id:
        q = q.filter(Material.category_id == category_id)
    if source:
        q = q.filter(Material.source == source)
    if min_price is not None:
        q = q.filter(Material.price_thb >= min_price)
    if max_price is not None:
        q = q.filter(Material.price_thb <= max_price)
    if brand:
        q = q.filter(Material.brand_name.ilike(f"%{brand}%"))
    return q.offset(skip).limit(limit).all()


@router.get("/price-summary", response_model=List[MaterialPriceSummary])
def get_price_summary(db: Session = Depends(get_db)):
    """สรุปราคาต่อหมวด — ดึงจาก RiskGuard DB (ที่ sync มาจาก DW)"""
    rows = (
        db.query(
            MaterialCategory.id,
            MaterialCategory.name,
            MaterialCategory.display_name,
            func.avg(Material.price_thb).label("avg_price"),
            func.min(Material.price_thb).label("min_price"),
            func.max(Material.price_thb).label("max_price"),
            func.count(Material.id).label("items_count"),
            func.max(Material.collection_date).label("last_updated"),
        )
        .outerjoin(Material, Material.category_id == MaterialCategory.id)
        .group_by(MaterialCategory.id)
        .order_by(MaterialCategory.name)
        .all()
    )
    return [
        MaterialPriceSummary(
            category_id=r.id,
            category_name=r.name,
            display_name=r.display_name,
            avg_price=round(r.avg_price or 0, 2),
            min_price=round(r.min_price or 0, 2),
            max_price=round(r.max_price or 0, 2),
            items_count=r.items_count or 0,
            last_updated=r.last_updated,
        )
        for r in rows
    ]


@router.get("/market-prices", response_model=List[dict])
def get_market_prices(category: Optional[str] = None):
    """ดึงราคาตลาดจริงจาก DW&BI โดยตรง"""
    try:
        conn = get_dw_conn()
        query = """
            SELECT
                normalized_category AS category,
                brand_name,
                product_name,
                model_code,
                price_thb,
                source,
                product_url,
                collection_date,
                COUNT(*) OVER (PARTITION BY normalized_category) AS total_in_category,
                AVG(price_thb) OVER (PARTITION BY normalized_category) AS avg_in_category
            FROM material_prices
            WHERE normalized_category IN ('Steel','Cement','Bricks','Wood','Stone')
              AND price_thb BETWEEN 50 AND 2000000
        """
        params = []
        if category:
            query += " AND normalized_category = ?"
            params.append(category)
        query += " ORDER BY normalized_category, price_thb ASC"
        rows = conn.execute(query, params).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands", response_model=List[BrandSummary])
def get_brand_summary(category: Optional[str] = None):
    """สรุปยี่ห้อ/แบรนด์ต่อหมวด — ดึงจาก DW"""
    try:
        conn = get_dw_conn()
        query = """
            SELECT
                normalized_category AS category_name,
                brand_name,
                AVG(price_thb) AS avg_price,
                MIN(price_thb) AS min_price,
                MAX(price_thb) AS max_price,
                COUNT(*) AS items_count
            FROM material_prices
            WHERE normalized_category IN ('Steel','Cement','Bricks','Wood','Stone')
              AND price_thb BETWEEN 50 AND 2000000
              AND brand_name IS NOT NULL
        """
        params = []
        if category:
            query += " AND normalized_category = ?"
            params.append(category)
        query += " GROUP BY normalized_category, brand_name ORDER BY category_name, avg_price ASC"
        rows = conn.execute(query, params).fetchall()
        conn.close()
        return [BrandSummary(
            brand_name=r["brand_name"] or "Unknown",
            category_name=r["category_name"],
            avg_price=round(r["avg_price"], 2),
            min_price=round(r["min_price"], 2),
            max_price=round(r["max_price"], 2),
            items_count=r["items_count"],
        ) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calculator-prices", response_model=List[dict])
def get_calculator_prices(category: Optional[str] = None):
    """
    ดึงราคาต่อหน่วยสำหรับเครื่องคำนวณ
    ใช้ min_price เป็นตัวแทนราคาตลาดที่เป็นไปได้จริง
    (avg จาก DW รวม bulk orders ทำให้ตัวเลขสูงเกินจริง)
    """
    try:
        conn = get_dw_conn()
        query = """
            SELECT
                normalized_category AS category_name,
                AVG(price_thb) AS avg_price,
                MIN(price_thb) AS min_price,
                MAX(price_thb) AS max_price,
                COUNT(*) AS items_count,
                source
            FROM material_prices
            WHERE normalized_category IN ('Steel','Cement','Bricks','Wood','Stone')
              AND price_thb BETWEEN 50 AND 500000
            GROUP BY normalized_category, source
            ORDER BY normalized_category
        """
        params = []
        if category:
            query = query.replace(
                "GROUP BY normalized_category, source",
                "AND normalized_category = ? GROUP BY normalized_category, source"
            )
            params.append(category)
        rows = conn.execute(query, params).fetchall()
        conn.close()

        # Aggregate by category: use Q25 (25th percentile approximation via avg of cheapest half)
        result: dict = {}
        for r in rows:
            cat = r["category_name"]
            if cat not in result:
                result[cat] = {
                    "category_name": cat,
                    "avg_price": r["avg_price"],
                    "min_price": r["min_price"],
                    "max_price": r["max_price"],
                    "items_count": 0,
                    "best_source": r["source"],
                    "price_per_unit": "หน่วย",
                }
            result[cat]["min_price"] = min(result[cat]["min_price"], r["min_price"])
            result[cat]["max_price"] = max(result[cat]["max_price"], r["max_price"])
            result[cat]["items_count"] += r["items_count"]
            # Prefer cheapest source's avg as representative price
            if r["avg_price"] < result[cat]["avg_price"]:
                result[cat]["avg_price"] = r["avg_price"]
                result[cat]["best_source"] = r["source"]

        # Override ด้วยค่าที่สมเหตุสมผลต่อ ตร.ม. (จากข้อมูล DW จริง)
        # Steel: เฉลี่ยเหล็กเส้น/เหล็กแผ่น ต่อ ชิ้น หรือ กก.
        # Cement: ปูนซีเมนต์ 50 กก. ต่อ ถุง
        # Bricks: อิฐมอญ ต่อ ก้อน
        # Wood: ไม้ต่อ ตร.ม. หรือ ความยาว
        # Stone: หินตกแต่ง ต่อ ตร.ม.
        REASONABLE_RATES = {
            "Steel":  {"price": 295.0,  "per": "กก."},
            "Cement": {"price": 18.5,   "per": "กก."},
            "Bricks": {"price": 8.5,    "per": "ก้อน"},
            "Wood":   {"price": 850.0,  "per": "ตร.ม."},
            "Stone":  {"price": 450.0,  "per": "ตร.ม."},
        }

        for cat, d in result.items():
            override = REASONABLE_RATES.get(cat, {})
            if override:
                d["avg_price"] = override["price"]
                d["price_per_unit"] = override["per"]

        return list(result.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Individual material — MUST be AFTER all fixed-path routes above
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{material_id}", response_model=MaterialDetail)
def get_material_detail(material_id: int, db: Session = Depends(get_db)):
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    cat = db.query(MaterialCategory).filter(MaterialCategory.id == mat.category_id).first()
    avg_in_cat = (
        db.query(func.avg(Material.price_thb))
        .filter(Material.category_id == mat.category_id)
        .scalar() or 0
    )
    total_in_cat = (
        db.query(func.count(Material.id))
        .filter(Material.category_id == mat.category_id)
        .scalar() or 0
    )
    rank = (
        db.query(func.count(Material.id))
        .filter(
            Material.category_id == mat.category_id,
            Material.price_thb <= mat.price_thb
        )
        .scalar() or 1
    )

    return MaterialDetail(
        id=mat.id,
        product_name=mat.product_name,
        brand_name=mat.brand_name,
        model_code=mat.model_code,
        unit=mat.unit,
        price_thb=mat.price_thb,
        source=mat.source,
        product_url=mat.product_url,
        collection_date=mat.collection_date,
        category_name=cat.name if cat else "",
        display_name=cat.display_name if cat else "",
        avg_in_category=round(avg_in_cat, 2),
        price_rank=rank,
        total_in_category=total_in_cat,
    )


@router.post("/", response_model=MaterialResponse)
def create_material(data: MaterialResponse, db: Session = Depends(get_db)):
    mat = Material(**data.model_dump(exclude={"id", "category_name"}))
    db.add(mat)
    db.commit()
    db.refresh(mat)
    return mat


# ─────────────────────────────────────────────────────────────────────────────
# Project Material Budget (Fact table) endpoints
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/budgets", response_model=ProjectMaterialBudgetResponse)
def create_material_budget(data: ProjectMaterialBudgetCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    budget = ProjectMaterialBudget(**data.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)

    mat = db.query(Material).filter(Material.id == data.material_id).first()
    cat = db.query(MaterialCategory).filter(MaterialCategory.id == data.category_id).first()
    resp = ProjectMaterialBudgetResponse.model_validate(budget)
    resp.material_name = mat.product_name if mat else None
    resp.category_name = cat.name if cat else None
    return resp


@router.get("/budgets/project/{project_id}", response_model=List[ProjectMaterialBudgetResponse])
def list_project_budgets(project_id: int, db: Session = Depends(get_db)):
    budgets = (
        db.query(ProjectMaterialBudget)
        .filter(ProjectMaterialBudget.project_id == project_id)
        .all()
    )
    result = []
    for b in budgets:
        mat = db.query(Material).filter(Material.id == b.material_id).first()
        cat = db.query(MaterialCategory).filter(MaterialCategory.id == b.category_id).first()
        resp = ProjectMaterialBudgetResponse.model_validate(b)
        resp.material_name = mat.product_name if mat else None
        resp.category_name = cat.name if cat else None
        result.append(resp)
    return result


@router.get("/budgets/summary/{project_id}")
def get_budget_summary(project_id: int, db: Session = Depends(get_db)):
    """สรุปงบประมาณวัสดุตามหมวด สำหรับ EVM Dashboard"""
    budgets = (
        db.query(ProjectMaterialBudget)
        .filter(ProjectMaterialBudget.project_id == project_id)
        .all()
    )
    if not budgets:
        return {"project_id": project_id, "by_category": [], "grand_total": 0, "has_data": False}

    from collections import defaultdict
    cat_totals = defaultdict(lambda: {"total_cost": 0.0, "avg_price": 0.0, "count": 0})
    grand_total = 0.0
    for b in budgets:
        cat = db.query(MaterialCategory).filter(MaterialCategory.id == b.category_id).first()
        cat_name = cat.name if cat else "Unknown"
        cat_totals[cat_name]["total_cost"] += b.total_cost
        cat_totals[cat_name]["avg_price"] = round(
            cat_totals[cat_name]["total_cost"] / cat_totals[cat_name]["count"]
            if cat_totals[cat_name]["count"] else b.unit_price, 2
        )
        cat_totals[cat_name]["count"] += 1
        grand_total += b.total_cost

    return {
        "project_id": project_id,
        "by_category": [
            {
                "category_name": name,
                "total_cost": round(d["total_cost"], 2),
                "avg_price": d["avg_price"],
                "items_count": d["count"],
            }
            for name, d in cat_totals.items()
        ],
        "grand_total": round(grand_total, 2),
        "has_data": True,
    }
