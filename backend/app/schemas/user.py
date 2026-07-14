from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

VALID_ROLES = {"contractor", "employer", "group_ceo", "admin"}

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str  # contractor, employer, group_ceo, admin

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร (Password must be at least 8 characters)")
        return v

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Role ไม่ถูกต้อง ต้องเป็น: {', '.join(VALID_ROLES)}")
        return v

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("กรุณากรอกชื่อ-นามสกุล")
        return v.strip()

class UserResponse(UserBase):
    id: int
    is_active: bool
    otp_verified: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    full_name: str
    email: EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
