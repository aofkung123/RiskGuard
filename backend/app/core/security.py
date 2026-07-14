from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from fastapi import Header, HTTPException
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Decode JWT token and return user dict. Used across all API endpoints."""
    if not isinstance(authorization, str) or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token")
        try:
            user_id = int(sub)
        except (ValueError, TypeError):
            raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    import sqlite3
    conn = sqlite3.connect(settings.database_file_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user)
