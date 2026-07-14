from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    budget: float
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str = "planning"

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    owner_id: int
    contractor_id: Optional[int] = None

    class Config:
        from_attributes = True

class ProjectAnalyticsResponse(BaseModel):
    project_id: int
    cpi: float
    spi: float
    status: str
    date: datetime

    class Config:
        from_attributes = True
