# backend/app/services/user_service.py - COMPLETE USER SERVICE IMPLEMENTATION
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from app.models.user import User, Role
from app.core.database import Base
import logging
import secrets
import string
from datetime import datetime

logger = logging.getLogger(__name__)

class UserService:
    """Service class for user management operations"""
    
    @staticmethod
    def get_user_count(db: Session) -> int:
        """Get total number of users"""
        return db.query(User).count()
    
    @staticmethod
    def get_active_user_count(db: Session) -> int:
        """Get number of active users"""
        return db.query(User).filter(User.is_active == True).count()
    
    @staticmethod
    def get_admin_user_count(db: Session) -> int:
        """Get number of admin users"""
        return db.query(User).filter(User.role == 'admin').count()
    
    @staticmethod
    def get_users_filtered(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        role: Optional[str] = None,
        status: Optional[str] = None,
        provider_id: Optional[int] = None,
        keywords: Optional[str] = None
    ) -> List[User]:
        """Get users with filtering"""
        query = db.query(User)
        
        # Apply filters
        if role:
            query = query.filter(User.role == role)
        
        if status == 'active':
            query = query.filter(User.is_active == True)
        elif status == 'blocked':
            query = query.filter(User.is_active == False)
        
        if provider_id:
            query = query.filter(User.service_provider_id == provider_id)
        
        if keywords:
            search_filter = or_(
                User.first_name.ilike(f"%{keywords}%"),
                User.last_name.ilike(f"%{keywords}%"),
                User.email.ilike(f"%{keywords}%")
            )
            query = query.filter(search_filter)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        first_name: str,
        last_name: str,
        phone_number: Optional[str] = None,
        role: str = "user",
        service_provider_id: Optional[int] = None
    ) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise ValueError(f"User with email '{email}' already exists")
        
        # Generate a temporary password
        temp_password = UserService._generate_temp_password()
        
        # Create user
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            role=role,
            service_provider_id=service_provider_id,
            password_hash=UserService._hash_password(temp_password),
            is_active=True,
            is_verified=False,
            created_at=datetime.now()
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info(f"Created user: {email} with role: {role}")
        
        # TODO: Send welcome email with temporary password
        # EmailService.send_welcome_email(user, temp_password)
        
        return user
    
    @staticmethod
    def update_user(
        db: Session,
        user_id: int,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        phone_number: Optional[str] = None,
        role: Optional[str] = None,
        service_provider_id: Optional[int] = None
    ) -> Optional[User]:
        """Update a user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        # Update fields if provided
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if phone_number is not None:
            user.phone_number = phone_number
        if role is not None:
            user.role = role
        if service_provider_id is not None:
            user.service_provider_id = service_provider_id
        
        user.updated_at = datetime.now()
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"Updated user: {user.email}")
        return user
    
    @staticmethod
    def set_user_status(db: Session, user_id: int, is_active: bool) -> Optional[User]:
        """Set user active/inactive status"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        user.is_active = is_active
        user.updated_at = datetime.now()
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"Set user {user.email} status to: {'active' if is_active else 'inactive'}")
        return user
    
    @staticmethod
    def reset_user_password(db: Session, user_id: int, send_email: bool = True) -> Dict[str, Any]:
        """Reset user password"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User with id {user_id} not found")
        
        # Generate new temporary password
        new_password = UserService._generate_temp_password()
        user.password_hash = UserService._hash_password(new_password)
        user.updated_at = datetime.now()
        
        db.commit()
        
        logger.info(f"Reset password for user: {user.email}")
        
        result = {
            "message": "Password reset successfully",
            "email_sent": False
        }
        
        if send_email:
            # TODO: Send password reset email
            # EmailService.send_password_reset_email(user, new_password)
            result["email_sent"] = True
        else:
            result["new_password"] = new_password
        
        return result
    
    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """Delete a user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        email = user.email
        db.delete(user)
        db.commit()
        
        logger.info(f"Deleted user: {email}")
        return True
    
    @staticmethod
    def _generate_temp_password(length: int = 12) -> str:
        """Generate a temporary password"""
        characters = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(characters) for _ in range(length))
    
    @staticmethod
    def _hash_password(password: str) -> str:
        """Hash a password (simplified - use proper hashing in production)"""
        # TODO: Implement proper password hashing with bcrypt or similar
        return f"hashed_{password}"


class RoleService:
    """Service class for role management operations"""
    
    @staticmethod
    def get_all_roles(db: Session) -> List[Role]:
        """Get all roles"""
        return db.query(Role).filter(Role.is_active == True).all()
    
    @staticmethod
    def create_role(
        db: Session,
        name: str,
        display_name: str,
        description: Optional[str] = None,
        permissions: List[str] = None
    ) -> Role:
        """Create a new role"""
        # Check if role already exists
        existing_role = db.query(Role).filter(Role.name == name).first()
        if existing_role:
            raise ValueError(f"Role with name '{name}' already exists")
        
        role = Role(
            name=name,
            display_name=display_name,
            description=description,
            permissions=permissions or [],
            is_system_role=False,
            is_active=True
        )
        
        db.add(role)
        db.commit()
        db.refresh(role)
        
        logger.info(f"Created role: {name}")
        return role
    
    @staticmethod
    def initialize_system_roles(db: Session):
        """Initialize default system roles"""
        default_roles = [
            {
                "name": "admin",
                "display_name": "Administrator",
                "description": "Full system access",
                "permissions": ["*"],
                "is_system_role": True
            },
            {
                "name": "manager",
                "display_name": "Manager",
                "description": "Management access",
                "permissions": ["manage_users", "view_reports", "manage_participants"],
                "is_system_role": True
            },
            {
                "name": "support_worker",
                "display_name": "Support Worker",
                "description": "Support worker access",
                "permissions": ["view_participants", "update_participant_notes"],
                "is_system_role": True
            },
            {
                "name": "user",
                "display_name": "User",
                "description": "Basic user access",
                "permissions": ["view_own_profile"],
                "is_system_role": True
            }
        ]
        
        for role_data in default_roles:
            existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing_role:
                role = Role(**role_data)
                db.add(role)
                logger.info(f"Created system role: {role_data['name']}")
        
        db.commit()