from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, ServiceType


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role: UserRole = UserRole.PARTICIPANT
    service_type: Optional[ServiceType] = None
    provider_license: Optional[str] = None
    provider_agency: Optional[str] = None
    provider_bio: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str
    
    @validator('service_type')
    def validate_service_type_for_provider(cls, v, values):
        """Validate that providers have a service type"""
        if values.get('role') == UserRole.PROVIDER and not v:
            raise ValueError('Providers must specify a service type')
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    service_type: Optional[ServiceType] = None
    provider_license: Optional[str] = None
    provider_agency: Optional[str] = None
    provider_bio: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user responses (no password)"""
    id: int
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class UserLoginResponse(BaseModel):
    """Schema for login response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ProviderList(BaseModel):
    """Schema for provider list"""
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    service_type: ServiceType
    provider_agency: Optional[str] = None
    is_active: bool
    
    class Config:
        from_attributes = True