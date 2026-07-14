from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Project, ProjectAnalytics
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectAnalyticsResponse
from app.core.security import get_current_user

router = APIRouter()

# ── GET / — list projects owned by or contracted to the auth user ─────────────────
@router.get("/", response_model=List[ProjectResponse])
def get_projects(authorization: str = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization)
    if user["role"] == "employer":
        rows = db.query(Project).filter(Project.owner_id == user["id"]).all()
    elif user["role"] == "contractor":
        rows = db.query(Project).filter(Project.contractor_id == user["id"]).all()
    else:
        rows = []
    return rows


@router.post("/", response_model=ProjectResponse)
def create_project(project_in: ProjectCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization)
    if user["role"] != "employer":
        raise HTTPException(status_code=403, detail="Only employers can create projects")
    new_project = Project(
        title=project_in.title,
        description=project_in.description,
        budget=project_in.budget,
        start_date=project_in.start_date,
        end_date=project_in.end_date,
        status=project_in.status,
        owner_id=user["id"]
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.get("/{project_id}/analytics", response_model=ProjectAnalyticsResponse)
def get_project_analytics(project_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization)
    # Verify user owns or is contracted to this project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบโครงการ")
    if project.owner_id != user["id"] and project.contractor_id != user["id"]:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ดูข้อมูลโครงการนี้")
    analytics = db.query(ProjectAnalytics).filter(ProjectAnalytics.project_id == project_id).order_by(ProjectAnalytics.date.desc()).first()
    if not analytics:
        raise HTTPException(status_code=404, detail="No analytics data for this project")
    return analytics
