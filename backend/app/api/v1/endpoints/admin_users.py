# backend/app/api/v1/endpoints/admin_users.py - COMPATIBLE VERSION
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import hashlib
import logging

from app.core.database import get_db
from app.api.deps_admin_key import require_admin_key
from app.schemas.user import UserCreate, UserOut
from app.models.user import User, UserRole

router = APIRouter(
    tags=["admin-users"],
    dependencies=[Depends(require_admin_key)]
)

logger = logging.getLogger(__name__)

def simple_hash_password(password: str) -> str:
    """Simple password hashing - NOT FOR PRODUCTION"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    role: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """List users with optional filtering"""
    try:
        query = db.query(User)
        
        # Filter by role if provided
        if role:
            try:
                role_enum = UserRole(role)
                query = query.filter(User.role == role_enum)
            except ValueError:
                raise HTTPException(400, f"Invalid role: {role}")
        
        # Filter by search query if provided
        if q:
            search_term = f"%{q}%"
            query = query.filter(
                (User.first_name.ilike(search_term)) | 
                (User.last_name.ilike(search_term)) | 
                (User.email.ilike(search_term))
            )
        
        users = query.order_by(User.first_name, User.last_name).offset(skip).limit(limit).all()
        
        logger.info(f"Retrieved {len(users)} users with filters: role={role}, q={q}")
        return users
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(500, f"Failed to retrieve users: {str(e)}")

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    try:
        logger.info(f"Creating user with email: {payload.email}")
        
        # Check if user with this email already exists
        existing_user = db.query(User).filter(User.email == payload.email).first()
        if existing_user:
            logger.warning(f"User creation failed: email {payload.email} already exists")
            raise HTTPException(
                status_code=409, 
                detail="A user with this email already exists"
            )

        # Validate role
        try:
            role_enum = UserRole(payload.role)
        except ValueError:
            raise HTTPException(400, f"Invalid role: {payload.role}")

        # Hash the password
        hashed_pw = simple_hash_password(payload.password)

        # Create new user - use password_hash as the main field
        user = User(
            email=payload.email,
            password_hash=hashed_pw,  # Use password_hash as primary
            hashed_password=hashed_pw,  # Also set this for compatibility
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone=payload.phone,
            role=role_enum,
            is_active=True,
            is_verified=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info(f"Successfully created user: {user.email} with ID: {user.id}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        db.rollback()
        raise HTTPException(500, f"Failed to create user: {str(e)}")

@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user by ID"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Retrieved user: {user.email}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {e}")
        raise HTTPException(500, f"Failed to retrieve user: {str(e)}")

@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int, 
    updates: dict,
    db: Session = Depends(get_db)
):
    """Update a user"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update allowed fields - map phone_number to phone if provided
        allowed_fields = ['first_name', 'last_name', 'phone', 'role', 'is_active']
        for field, value in updates.items():
            # Handle phone_number field mapping
            if field == 'phone_number':
                field = 'phone'
            
            if field in allowed_fields:
                if field == 'role':
                    try:
                        value = UserRole(value)
                    except ValueError:
                        raise HTTPException(400, f"Invalid role: {value}")
                setattr(user, field, value)
        
        user.updated_at = datetime.now()
        db.commit()
        db.refresh(user)
        
        logger.info(f"Updated user: {user.email}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        db.rollback()
        raise HTTPException(500, f"Failed to update user: {str(e)}")

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        email = user.email
        db.delete(user)
        db.commit()
        
        logger.info(f"Deleted user: {email}")
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}")
        db.rollback()
        raise HTTPException(500, f"Failed to delete user: {str(e)}")

@router.post("/users/{user_id}/activate")
def activate_user(user_id: int, db: Session = Depends(get_db)):
    """Activate a user"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.is_active = True
        user.updated_at = datetime.now()
        db.commit()
        db.refresh(user)
        
        logger.info(f"Activated user: {user.email}")
        return {"message": "User activated successfully", "user": user}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating user {user_id}: {e}")
        db.rollback()
        raise HTTPException(500, f"Failed to activate user: {str(e)}")

@router.post("/users/{user_id}/deactivate")
def deactivate_user(user_id: int, db: Session = Depends(get_db)):
    """Deactivate a user"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.is_active = False
        user.updated_at = datetime.now()
        db.commit()
        db.refresh(user)
        
        logger.info(f"Deactivated user: {user.email}")
        return {"message": "User deactivated successfully", "user": user}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating user {user_id}: {e}")
        db.rollback()
        raise HTTPException(500, f"Failed to deactivate user: {str(e)}")

@router.post("/users/{user_id}/reset-password")
def reset_user_password(user_id: int, db: Session = Depends(get_db)):
    """Reset a user's password"""
    try:
        import secrets
        import string
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate new temporary password
        characters = string.ascii_letters + string.digits
        new_password = ''.join(secrets.choice(characters) for _ in range(8))
        hashed_pw = simple_hash_password(new_password)
        
        # Set both password fields for maximum compatibility
        user.password_hash = hashed_pw
        user.hashed_password = hashed_pw
        user.updated_at = datetime.now()
        
        db.commit()
        
        logger.info(f"Reset password for user: {user.email}")
        
        # Return password in response (for development only)
        return {
            "message": "Password reset successfully",
            "temporary_password": new_password,
            "note": "User should change this password on next login"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password for user {user_id}: {e}")
        db.rollback()
        raise HTTPException(500, f"Failed to reset password: {str(e)}")

# Health check endpoint for admin users API
@router.get("/users/health")
def admin_users_health():
    """Health check for admin users API"""
    return {
        "status": "healthy",
        "message": "Admin users API is operational",
        "timestamp": datetime.now().isoformat()
    }