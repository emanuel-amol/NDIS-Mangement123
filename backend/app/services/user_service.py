# backend/app/services/user_service.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.user import User, Role, UserRole
from app.services.email_service import EmailService
import secrets
import hashlib
import logging

logger = logging.getLogger(__name__)

class UserService:
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using a simple method (replace with proper hashing in production)"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return hashlib.sha256(password.encode()).hexdigest() == hashed_password
    
    @staticmethod
    def generate_password() -> str:
        """Generate a random password"""
        return secrets.token_urlsafe(12)
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        first_name: str,
        last_name: str,
        role: str = "user",
        phone_number: Optional[str] = None,
        service_provider_id: Optional[int] = None,
        send_verification_email: bool = True
    ) -> User:
        """Create a new user with email verification"""
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise ValueError(f"User with email {email} already exists")
        
        # Generate random password
        password = UserService.generate_password()
        hashed_password = UserService.hash_password(password)
        
        # Create user
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            hashed_password=hashed_password,
            role=role,
            service_provider_id=service_provider_id,
            is_active=True,
            is_verified=False
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Send verification email with password
        if send_verification_email:
            try:
                email_service = EmailService()
                # Create a simple welcome email with password
                html_content = f"""
                <h2>Welcome to NDIS Management System</h2>
                <p>Dear {first_name} {last_name},</p>
                <p>Your account has been created with the following details:</p>
                <ul>
                    <li><strong>Email:</strong> {email}</li>
                    <li><strong>Temporary Password:</strong> {password}</li>
                    <li><strong>Role:</strong> {role}</li>
                </ul>
                <p>Please log in and change your password immediately.</p>
                <p>If you have any questions, please contact your administrator.</p>
                """
                
                email_sent = email_service._send_email(
                    to_email=email,
                    subject="Welcome to NDIS Management System",
                    html_content=html_content,
                    recipient_name=f"{first_name} {last_name}"
                )
                
                if email_sent:
                    logger.info(f"Welcome email sent to {email}")
                else:
                    logger.warning(f"Failed to send welcome email to {email}")
                    
            except Exception as e:
                logger.error(f"Error sending welcome email to {email}: {str(e)}")
        
        logger.info(f"Created user {email} with role {role}")
        return user
    
    @staticmethod
    def get_users(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        role_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        service_provider_id: Optional[int] = None,
        keywords: Optional[str] = None
    ) -> List[User]:
        """Get users with filtering"""
        
        query = db.query(User)
        
        # Apply filters
        if role_filter and role_filter != "all":
            query = query.filter(User.role == role_filter)
        
        if status_filter == "active":
            query = query.filter(User.is_active == True)
        elif status_filter == "blocked":
            query = query.filter(User.is_active == False)
        
        if service_provider_id:
            query = query.filter(User.service_provider_id == service_provider_id)
        
        if keywords:
            search_filter = or_(
                User.first_name.ilike(f"%{keywords}%"),
                User.last_name.ilike(f"%{keywords}%"),
                User.email.ilike(f"%{keywords}%"),
                User.phone_number.ilike(f"%{keywords}%")
            )
            query = query.filter(search_filter)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def update_user(
        db: Session,
        user_id: int,
        updates: Dict[str, Any]
    ) -> Optional[User]:
        """Update user details"""
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        # Handle password update separately
        if 'password' in updates:
            password = updates.pop('password')
            user.hashed_password = UserService.hash_password(password)
        
        # Apply other updates
        for field, value in updates.items():
            if hasattr(user, field):
                setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        logger.info(f"Updated user {user.email}")
        return user
    
    @staticmethod
    def set_user_status(
        db: Session,
        user_id: int,
        is_active: bool
    ) -> Optional[User]:
        """Set user active/blocked status"""
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        user.is_active = is_active
        db.commit()
        db.refresh(user)
        
        status = "activated" if is_active else "blocked"
        logger.info(f"User {user.email} {status}")
        return user
    
    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """Delete a user"""
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        email = user.email  # Store for logging
        db.delete(user)
        db.commit()
        logger.info(f"Deleted user {email}")
        return True
    
    @staticmethod
    def reset_user_password(
        db: Session,
        user_id: int,
        send_email: bool = True
    ) -> Optional[str]:
        """Reset user password and optionally send email"""
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        new_password = UserService.generate_password()
        user.hashed_password = UserService.hash_password(new_password)
        db.commit()
        
        # Send password reset email
        if send_email:
            try:
                email_service = EmailService()
                html_content = f"""
                <h2>Password Reset - NDIS Management System</h2>
                <p>Dear {user.first_name} {user.last_name},</p>
                <p>Your password has been reset by an administrator.</p>
                <p><strong>New Password:</strong> {new_password}</p>
                <p>Please log in and change your password immediately.</p>
                """
                
                email_sent = email_service._send_email(
                    to_email=user.email,
                    subject="Password Reset - NDIS Management System",
                    html_content=html_content,
                    recipient_name=f"{user.first_name} {user.last_name}"
                )
                
                if email_sent:
                    logger.info(f"Password reset email sent to {user.email}")
                else:
                    logger.warning(f"Failed to send password reset email to {user.email}")
                    
            except Exception as e:
                logger.error(f"Error sending password reset email: {str(e)}")
        
        logger.info(f"Reset password for user {user.email}")
        return new_password


class RoleService:
    
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
            raise ValueError(f"Role '{name}' already exists")
        
        role = Role(
            name=name,
            display_name=display_name,
            description=description,
            permissions=permissions or [],
            is_system_role=False
        )
        
        db.add(role)
        db.commit()
        db.refresh(role)
        logger.info(f"Created role '{name}'")
        return role
    
    @staticmethod
    def get_roles(db: Session, active_only: bool = True) -> List[Role]:
        """Get all roles"""
        query = db.query(Role)
        if active_only:
            query = query.filter(Role.is_active == True)
        return query.order_by(Role.display_name).all()
    
    @staticmethod
    def update_role(
        db: Session,
        role_id: int,
        updates: Dict[str, Any]
    ) -> Optional[Role]:
        """Update role details"""
        
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            return None
        
        # Don't allow updating system roles
        if role.is_system_role:
            raise ValueError("Cannot update system roles")
        
        for field, value in updates.items():
            if hasattr(role, field):
                setattr(role, field, value)
        
        db.commit()
        db.refresh(role)
        logger.info(f"Updated role '{role.name}'")
        return role
    
    @staticmethod
    def delete_role(db: Session, role_id: int) -> bool:
        """Delete a role"""
        
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            return False
        
        if role.is_system_role:
            raise ValueError("Cannot delete system roles")
        
        # Check if role is assigned to any users
        users_with_role = db.query(User).filter(User.role == role.name).count()
        if users_with_role > 0:
            raise ValueError(f"Cannot delete role '{role.name}' - it is assigned to {users_with_role} user(s)")
        
        role_name = role.name
        db.delete(role)
        db.commit()
        logger.info(f"Deleted role '{role_name}'")
        return True
    
    @staticmethod
    def initialize_system_roles(db: Session) -> None:
        """Initialize default system roles"""
        
        system_roles = [
            {
                "name": "admin",
                "display_name": "Administrator",
                "description": "Full system access",
                "permissions": ["*"]  # All permissions
            },
            {
                "name": "manager",
                "display_name": "Manager",
                "description": "Manage participants and staff",
                "permissions": ["participants.*", "staff.*", "documents.*"]
            },
            {
                "name": "worker",
                "display_name": "Support Worker",
                "description": "Access to assigned participants",
                "permissions": ["participants.view", "documents.view", "timesheets.*"]
            },
            {
                "name": "participant",
                "display_name": "Participant",
                "description": "Limited access to own information",
                "permissions": ["profile.view", "documents.view"]
            }
        ]
        
        for role_data in system_roles:
            existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing_role:
                role = Role(
                    name=role_data["name"],
                    display_name=role_data["display_name"],
                    description=role_data["description"],
                    permissions=role_data["permissions"],
                    is_system_role=True
                )
                db.add(role)
        
        db.commit()
        logger.info("Initialized system roles")