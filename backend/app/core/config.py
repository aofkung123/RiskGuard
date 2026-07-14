from pydantic_settings import BaseSettings
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent
DEFAULT_DW_DATABASE_PATH = PROJECT_ROOT.parent / "DW&BI03" / "construction_dw.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "RiskGuard"
    # Default to a project-local SQLite DB, but can be overridden by environment variable.
    DATABASE_URL: str = f"sqlite:///{(BACKEND_ROOT / 'riskguard.db').as_posix()}"
    DW_DATABASE_PATH: str = str(DEFAULT_DW_DATABASE_PATH)
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @property
    def database_file_path(self) -> str:
        if not self.DATABASE_URL.startswith("sqlite:///"):
            return "postgresql_active"
        raw_path = self.DATABASE_URL.replace("sqlite:///", "", 1)
        path = Path(raw_path)
        if not path.is_absolute():
            path = BACKEND_ROOT / path
        return str(path.resolve())


    @property
    def dw_database_file_path(self) -> str:
        path = Path(self.DW_DATABASE_PATH)
        if not path.is_absolute():
            path = PROJECT_ROOT / path
        return str(path.resolve())

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"

settings = Settings()
