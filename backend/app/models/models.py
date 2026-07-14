from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String)  # employer, contractor, admin
    is_active = Column(Boolean, default=True)
    otp_verified = Column(Boolean, default=False)
    
    # Specify foreign_keys for projects to avoid ambiguity
    owned_projects = relationship("Project", foreign_keys="Project.owner_id", back_populates="owner")
    contracted_projects = relationship("Project", foreign_keys="Project.contractor_id", back_populates="contractor")

    portfolios = relationship("Portfolio", back_populates="contractor")
    user_profile = relationship("UserProfile", back_populates="user", uselist=False)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    budget = Column(Float)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(String)  # planning, in_progress, completed

    owner_id = Column(Integer, ForeignKey("users.id"))
    contractor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # เชื่อมกับใบเสนอราคา
    quotation_id = Column(Integer, nullable=True)  # message_id ของใบเสนอราคาที่สร้าง project นี้

    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_projects")
    contractor = relationship("User", foreign_keys=[contractor_id], back_populates="contracted_projects")
    
    analytics = relationship("ProjectAnalytics", back_populates="project")
    material_budgets = relationship("ProjectMaterialBudget", back_populates="project")

class Portfolio(Base):
    __tablename__ = "portfolios"
    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    image_url = Column(String)
    
    contractor = relationship("User", back_populates="portfolios")

class ProjectAnalytics(Base):
    __tablename__ = "project_analytics"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    date = Column(DateTime, default=datetime.datetime.utcnow)
    cpi = Column(Float)  # Cost Performance Index
    spi = Column(Float)  # Schedule Performance Index
    ev = Column(Float)   # Earned Value
    ac = Column(Float)   # Actual Cost
    pv = Column(Float)   # Planned Value
    
    project = relationship("Project", back_populates="analytics")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    file_url = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


# ══════════════════════════════════════════════════════════════════════════════
# Material Star Schema — สอดคล้องกับ DW&BI construction_dw.db
# ══════════════════════════════════════════════════════════════════════════════

class MaterialCategory(Base):
    """
    Dimension table — หมวดหมู่วัสดุก่อสร้าง (เช่น Steel, Cement, Bricks, Wood, Stone)
    """
    __tablename__ = "material_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)           # เช่น "Steel", "Cement"
    display_name = Column(String, nullable=False)                  # เช่น "เหล็ก", "ปูนซีเมนต์"
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)                          # icon name สำหรับ UI

    materials = relationship("Material", back_populates="category")
    budgets = relationship("ProjectMaterialBudget", back_populates="category")


class Material(Base):
    """
    Dimension table — รายการวัสดุก่อสร้าง
    """
    __tablename__ = "materials"
    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, nullable=False)
    brand_name = Column(String, nullable=True)
    model_code = Column(String, nullable=True)
    unit = Column(String, default="หน่วย")                        # หน่วย: ม. กก. ชิ้น ลบ.ม.
    price_thb = Column(Float, nullable=False)                      # ราคาต่อหน่วย (บาท)
    source = Column(String, default="Homepro")               # แหล่งข้อมูล
    product_url = Column(String, nullable=True)
    collection_date = Column(String, nullable=True)                # วันที่ดึงข้อมูล (YYYY-MM-DD)
    dw_sync_key = Column(String, unique=True, nullable=True)      # Natural key จาก DW (product_url)

    category_id = Column(Integer, ForeignKey("material_categories.id"))
    category = relationship("MaterialCategory", back_populates="materials")
    budgets = relationship("ProjectMaterialBudget", back_populates="material")


class ProjectMaterialBudget(Base):
    """
    Fact table — งบประมาณวัสดุต่อโครงการ
    เชื่อม Project + Material + Category เข้าด้วยกัน
    """
    __tablename__ = "project_material_budgets"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("material_categories.id"), nullable=False)

    quantity = Column(Float, default=0)                          # ปริมาณที่ใช้
    unit_price = Column(Float, nullable=False)                   # ราคาต่อหน่วย ณ วันที่ประมาณการ
    total_cost = Column(Float, nullable=False)                    # quantity × unit_price
    notes = Column(String, nullable=True)

    project = relationship("Project", back_populates="material_budgets")
    material = relationship("Material", back_populates="budgets")
    category = relationship("MaterialCategory", back_populates="budgets")


class Quotation(Base):
    """Quotations created from calculator."""
    __tablename__ = "quotations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    items = Column(Text, nullable=True)  # JSON string
    total = Column(Float, default=0)
    status = Column(String, default="draft")  # draft, sent, approved, rejected
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ══════════════════════════════════════════════════════════════════════════════
# Project Tracking & User Profiles
# ══════════════════════════════════════════════════════════════════════════════

class ProjectTracking(Base):
    """Tracking stages for each project."""
    __tablename__ = "project_tracking"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    stage_name = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, active, done_pending, completed
    timestamp = Column(String, nullable=True)
    proof_image_url = Column(String, nullable=True)
    awaiting_confirm = Column(Integer, default=0)  # 0 or 1


class UserProfile(Base):
    """Extended profile for users."""
    __tablename__ = "user_profiles"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)
    profile_completed = Column(Integer, default=0)  # 0 or 1

    user = relationship("User", back_populates="user_profile")
