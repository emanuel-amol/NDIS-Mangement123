# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal

UserRoleLiteral = Literal["admin","service_provider_admin","coordinator","support_worker","viewer"]

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRoleLiteral = "support_worker"

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserOut(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True
