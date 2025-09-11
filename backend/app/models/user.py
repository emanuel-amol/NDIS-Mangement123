from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(enum.Enum):
    """User roles in the system"""
    ADMIN = "admin"
    PROVIDER = "provider" 
    PARTICIPANT = "participant"
    REFERRER = "referrer"


class ServiceType(enum.Enum):
    """Provider service specializations"""
    PHYSIOTHERAPY = "physiotherapy"
    CHIRO = "chiro"
    PSYCHOLOGY = "psychologist"
    GENERAL = "general"
    ALL = "all"  # Can handle all types


class User(Base):
    """User model for authentication and role management"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Info
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=True)
    
    # Role and Status
    role = Column(Enum(UserRole), nullable=False, default=UserRole.PARTICIPANT)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Provider-specific fields
    service_type = Column(Enum(ServiceType), nullable=True)  # Only for providers
    provider_license = Column(String(100), nullable=True)   # License number
    provider_agency = Column(String(200), nullable=True)    # Agency/Clinic name
    provider_bio = Column(Text, nullable=True)              # Provider description
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    email_logs = relationship("EmailLog", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role.value}')>"
    
    def is_provider(self) -> bool:
        """Check if user is a provider"""
        return self.role == UserRole.PROVIDER
    
    def is_admin(self) -> bool:
        """Check if user is an admin"""
        return self.role == UserRole.ADMIN
    
    def can_receive_referral_notifications(self) -> bool:
        """Check if user should receive referral notifications"""
        return (self.role in [UserRole.PROVIDER, UserRole.ADMIN] and 
                self.is_active and 
                self.email is not None)
    
    def handles_service_type(self, service_type: str) -> bool:
        """Check if provider can handle a specific service type"""
        if not self.is_provider():
            return False
        
        if self.service_type == ServiceType.ALL:
            return True
            
        return self.service_type and self.service_type.value == service_type.lower()


# Provider helper functions
def get_providers_for_service(db, service_type: str) -> list:
    """Get all active providers who can handle a specific service type"""
    return db.query(User).filter(
        User.role == UserRole.PROVIDER,
        User.is_active == True,
        User.email.isnot(None),
        db.or_(
            User.service_type == ServiceType.ALL,
            User.service_type == ServiceType(service_type.lower())
        )
    ).all()


def get_all_notification_recipients(db) -> list:
    """Get all users who should receive referral notifications"""
    return db.query(User).filter(
        User.role.in_([UserRole.PROVIDER, UserRole.ADMIN]),
        User.is_active == True,
        User.email.isnot(None)
    ).all()


def get_admins(db) -> list:
    """Get all active admin users"""
    return db.query(User).filter(
        User.role == UserRole.ADMIN,
        User.is_active == True,
        User.email.isnot(None)
    ).all()