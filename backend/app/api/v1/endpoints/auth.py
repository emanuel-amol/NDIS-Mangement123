# backend/app/api/v1/endpoints/auth.py
"""
Authentication endpoints for login and user profile
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.models.user import User
from app.security.password import verify_password
from app.security.jwt import create_access_token
from app.security.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

# Request/Response models
class LoginRequest(BaseModel):
    """Login request body"""
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    """Login response with JWT token"""
    access_token: str
    token_type: str = "bearer"

class UserProfileResponse(BaseModel):
    """User profile response"""
    id: int
    email: str
    first_name: str | None
    last_name: str | None
    role: str
    is_active: bool
    
    class Config:
        from_attributes = True

@router.post("/login", response_model=TokenResponse)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT access token
    
    **Request Body:**
    - email: User's email address
    - password: User's password
    
    **Response:**
    - access_token: JWT token for authenticated requests
    - token_type: Always "bearer"
    
    **Errors:**
    - 401: Invalid credentials or inactive user
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token with email and role
    role = user.role.upper() if user.role else "SUPPORT_WORKER"
    access_token = create_access_token(
        email=user.email,
        role=role
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )

@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user's profile
    
    **Headers Required:**
    - Authorization: Bearer {access_token}
    
    **Response:**
    - id: User ID
    - email: User email
    - first_name: User's first name
    - last_name: User's last name
    - role: User's role (PROVIDER_ADMIN, SERVICE_MANAGER, etc.)
    - is_active: Whether user account is active
    
    **Errors:**
    - 401: Invalid or missing token
    """
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role.upper() if current_user.role else "SUPPORT_WORKER",
        is_active=current_user.is_active
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Logout endpoint (placeholder - JWT is stateless)
    
    In a stateless JWT setup, logout is handled client-side by removing the token.
    This endpoint exists for API consistency and future token blacklisting.
    
    **Headers Required:**
    - Authorization: Bearer {access_token}
    
    **Response:**
    - message: Success message
    """
    return {"message": "Successfully logged out"}