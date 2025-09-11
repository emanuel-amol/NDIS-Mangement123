from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserLoginResponse, UserResponse, ProviderList
from app.services.auth_service import AuthService, get_auth_service
from app.models.user import User, UserRole

router = APIRouter()
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    """Dependency to get current authenticated user"""
    return auth_service.get_current_user(db, credentials.credentials)


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Register a new user
    """
    try:
        user = auth_service.create_user(db, user_data)
        return user
    except Exception as e:
        if "Email already registered" in str(e):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )


@router.post("/login", response_model=UserLoginResponse)
async def login(
    login_data: UserLogin,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Login user and return access token
    """
    return auth_service.login_user(db, login_data)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information
    """
    return current_user


@router.get("/providers", response_model=List[ProviderList])
async def get_all_providers(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get list of all providers (admin only)
    """
    # Check if user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view provider list"
        )
    
    providers = db.query(User).filter(User.role == UserRole.PROVIDER).all()
    return providers


@router.post("/logout")
async def logout():
    """
    Logout user (client-side should remove token)
    """
    return {"message": "Successfully logged out"}


@router.post("/create-provider", response_model=UserResponse)
async def create_provider(
    user_data: UserCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Create a new provider account (admin only)
    """
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create provider accounts"
        )
    
    # Force role to be provider
    user_data.role = UserRole.PROVIDER
    
    try:
        provider = auth_service.create_user(db, user_data)
        return provider
    except Exception as e:
        if "Email already registered" in str(e):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating provider: {str(e)}"
        )


@router.get("/check-auth")
async def check_authentication(current_user: User = Depends(get_current_active_user)):
    """
    Check if user is authenticated
    """
    return {
        "authenticated": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "is_active": current_user.is_active
    }