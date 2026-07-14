"""
Material Schemas — Pydantic models for Material API
สอดคล้องกับ Star Schema ใน RiskGuard และ DW&BI construction_dw.db
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ──────────────────────────────────────────────
# Dimension: MaterialCategory
# ──────────────────────────────────────────────
class MaterialCategoryBase(BaseModel):
    name: str                          # "Steel", "Cement"
    display_name: str                  # "เหล็ก", "ปูนซีเมนต์"
    description: Optional[str] = None
    icon: Optional[str] = None


class MaterialCategoryCreate(MaterialCategoryBase):
    pass


class MaterialCategoryResponse(MaterialCategoryBase):
    id: int = None  # type: ignore[assignment]  # optional for request, auto-filled on response

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Dimension: Material
# ──────────────────────────────────────────────
class MaterialBase(BaseModel):
    product_name: str
    brand_name: Optional[str] = None
    model_code: Optional[str] = None
    unit: str = "หน่วย"
    price_thb: float
    source: str = "Homepro"
    product_url: Optional[str] = None
    collection_date: Optional[str] = None
    dw_sync_key: Optional[str] = None
    category_id: int


class MaterialCreate(MaterialBase):
    pass


class MaterialResponse(MaterialBase):
    id: int
    category_name: Optional[str] = None  # joined field

    class Config:
        from_attributes = True


class MaterialPriceSummary(BaseModel):
    """Summary ราคาต่อหมวด — ใช้ใน Calculator และ Variance"""
    category_id: int
    category_name: str
    display_name: str
    avg_price: float
    min_price: float
    max_price: float
    items_count: int
    last_updated: Optional[str] = None


# ──────────────────────────────────────────────
# Fact: ProjectMaterialBudget
# ──────────────────────────────────────────────
class ProjectMaterialBudgetBase(BaseModel):
    project_id: int
    material_id: int
    category_id: int
    quantity: float = 0
    unit_price: float
    total_cost: float
    notes: Optional[str] = None


class ProjectMaterialBudgetCreate(ProjectMaterialBudgetBase):
    pass


class ProjectMaterialBudgetResponse(ProjectMaterialBudgetBase):
    id: int
    material_name: Optional[str] = None
    category_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Calculator Request/Response
# ──────────────────────────────────────────────
class CalculatorItem(BaseModel):
    category_id: int
    category_name: str
    display_name: str
    quantity: float          # ปริมาณที่ใช้ (ตร.ม. หรือหน่วยที่กำหนด)
    unit_price: float         # ราคาต่อหน่วย
    total_cost: float         # quantity × unit_price
    source: Optional[str] = None


class CalculatorRequest(BaseModel):
    project_id: Optional[int] = None
    width: float = 0
    height: float = 0
    material_type: str = "all"  # "steel", "cement", "bricks", "wood", "stone", "all"
    items: List[CalculatorItem] = []   # รายการวัสดุที่เลือก


class CalculatorResponse(BaseModel):
    total_area: float
    grand_total: float
    breakdown: List[CalculatorItem]
    summary_by_category: List[dict]
    market_reference: dict   # ข้อมูลราคาตลาดจาก DW


# ──────────────────────────────────────────────
# Sync metadata
# ──────────────────────────────────────────────
class DwSyncStatus(BaseModel):
    dw_path: str
    last_sync: Optional[str] = None
    total_synced: int = 0
    categories_synced: int = 0
    status: str = "never_run"


# ──────────────────────────────────────────────
# Brand summary
# ──────────────────────────────────────────────
class BrandSummary(BaseModel):
    brand_name: str
    category_name: str
    avg_price: float
    min_price: float
    max_price: float
    items_count: int


class MaterialDetail(BaseModel):
    """Full material detail with price range from DW"""
    id: int
    product_name: str
    brand_name: Optional[str]
    model_code: Optional[str]
    unit: str
    price_thb: float
    source: str
    product_url: Optional[str]
    collection_date: Optional[str]
    category_name: str
    display_name: str
    avg_in_category: float       # ราคาเฉลี่ยในหมวดเดียวกัน
    price_rank: int             # rank 1 = ถูกที่สุดในหมวด
    total_in_category: int      # จำนวนวัสดุในหมวด

    class Config:
        from_attributes = True
