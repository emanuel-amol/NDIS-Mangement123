# backend/app/api/v1/endpoints/admin_users.py - SIMPLE VERSION WITHOUT SECURITY
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.deps_admin_key import require_admin_key
from app.schemas.user import UserCreate, UserOut
from app.models.user import User, UserRole

router = APIRouter(
    tags=["admin-users"],
    dependencies=[Depends(require_admin_key)]
)

def simple_hash_password(password: str) -> str:
    """Simple password hashing - NOT FOR PRODUCTION"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    role: Optional[str] = Query(None),
    q: Optional[str] = Query(None)
):
    """List users with optional filtering"""
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
    
    users = query.order_by(User.first_name, User.last_name).all()
    return users

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    
    # Check if user with this email already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=409, 
            detail="A user with this email already exists"
        )

    # Validate role
    try:
        role_enum = UserRole(payload.role)
    except ValueError:
        raise HTTPException(400, f"Invalid role: {payload.role}")

    # Create new user
    user = User(
        email=payload.email,
        hashed_password=simple_hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        role=role_enum,
        is_active=True,
        is_verified=False,
        created_at=datetime.now()
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int, 
    updates: dict,
    db: Session = Depends(get_db)
):
    """Update a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update allowed fields
    allowed_fields = ['first_name', 'last_name', 'phone', 'role', 'is_active']
    for field, value in updates.items():
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
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}

@router.post("/users/{user_id}/activate")
def activate_user(user_id: int, db: Session = Depends(get_db)):
    """Activate a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = True
    user.updated_at = datetime.now()
    db.commit()
    db.refresh(user)
    
    return {"message": "User activated successfully", "user": user}

@router.post("/users/{user_id}/deactivate")
def deactivate_user(user_id: int, db: Session = Depends(get_db)):
    """Deactivate a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = False
    user.updated_at = datetime.now()
    db.commit()
    db.refresh(user)
    
    return {"message": "User deactivated successfully", "user": user}

@router.post("/users/{user_id}/reset-password")
def reset_user_password(user_id: int, db: Session = Depends(get_db)):
    """Reset a user's password"""
    import secrets
    import string
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate new temporary password
    characters = string.ascii_letters + string.digits
    new_password = ''.join(secrets.choice(characters) for _ in range(8))
    user.hashed_password = simple_hash_password(new_password)
    user.updated_at = datetime.now()
    
    db.commit()
    
    # Return password in response (for development only)
    return {
        "message": "Password reset successfully",
        "temporary_password": new_password,
        "note": "User should change this password on next login"
    }