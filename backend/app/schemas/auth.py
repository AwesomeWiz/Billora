# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr, Field, validator
from ..models.account import Role

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=9)

    @validator("password")
    def pwd_complex(cls, v):
        if (
            not any(c.islower() for c in v)
            or not any(c.isupper() for c in v)
            or not any(c in "!@#$%^&*()-_=+[]{}|;:,.<>?/" for c in v)
        ):
            raise ValueError("Password must contain upper, lower & special char")
        return v

class RegisterOut(BaseModel):
    account_id: str
    user_id: str
    role: Role

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
