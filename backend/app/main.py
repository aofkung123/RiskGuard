from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, projects, dashboard, marketplace, chat, tracking, profile, material, quotations
from app.core.config import settings
from app.models.models import Base
from app.core.database import engine

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RiskGuard API",
    description="Backend API for RiskGuard construction management platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router,        prefix="/api/auth",        tags=["Authentication"])
app.include_router(projects.router,    prefix="/api/projects",    tags=["Projects"])
app.include_router(dashboard.router,   prefix="/api/dashboard",   tags=["Dashboard"])
app.include_router(marketplace.router, prefix="/api/marketplace", tags=["Marketplace"])
app.include_router(chat.router,        prefix="/api/chat",        tags=["Chat"])
app.include_router(tracking.router,    prefix="/api/tracking",    tags=["Tracking"])
app.include_router(profile.router,     prefix="/api/profile",     tags=["Profile"])
app.include_router(material.router,    prefix="/api/materials",   tags=["Materials"])
app.include_router(quotations.router,  prefix="/api/quotations",  tags=["Quotations"])

@app.get("/")
async def root():
    return {"message": "Welcome to RiskGuard API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
