# backend/app/schemas/user.py - UPDATED TO MATCH DATABASE FIELDS
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal

UserRoleLiteral = Literal["PROVIDER_ADMIN","SERVICE_MANAGER","SUPPORT_WORKER","PARTICIPANT","HR","FINANCE","IT","DATA_ENTRY"]

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None  # Changed from phone_number to phone
    role: UserRoleLiteral = "support_worker"

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserOut(UserBase):
    id: int
    is_active: bool
    is_verified: bool = False
    
    # Add computed field for backwards compatibility
    @property
    def phone_number(self) -> Optional[str]:
        return self.phone

    class Config:
        from_attributes = True