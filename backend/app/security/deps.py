"""
FastAPI dependencies for authentication and authorization
Supports both backend JWT and Supabase JWT tokens
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import os

from app.core.database import get_db
from app.models.user import User
from app.security.jwt import decode_token
from app.security.rbac import has_perm

# OAuth2 scheme - tells FastAPI where to look for the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token
    Accepts both backend JWT and Supabase JWT tokens
    
    Args:
        db: Database session
        token: JWT token from Authorization header
    
    Returns:
        User object
    
    Raises:
        HTTPException: 401 if token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    user = None
    
    # Try backend JWT first
    try:
        payload = decode_token(token)
        email: str = payload.get("sub")
        role: str = payload.get("role")
        
        if email:
            user = db.query(User).filter(User.email == email).first()
            if user and role:
                user.role = role
    except JWTError:
        pass
    
    # If backend JWT failed, try Supabase JWT
    if not user:
        try:
            unverified_payload = jwt.get_unverified_claims(token)
            
            supabase_user_id = unverified_payload.get("sub")  # This is the UUID
            email = unverified_payload.get("email")
            
            print(f"🔍 Looking for user: supabase_id={supabase_user_id}, email={email}")
            
            if not supabase_user_id:
                raise credentials_exception
            
            # Look up by supabase UUID
            user = db.query(User).filter(User.supabase_user_id == supabase_user_id).first()
            
            # If not found, link by email
            if not user and email:
                user = db.query(User).filter(User.email == email).first()
                if user:
                    print(f"🔗 Linking {email} to Supabase UUID {supabase_user_id}")
                    user.supabase_user_id = supabase_user_id
                    db.commit()
                    
        except Exception as e:
            print(f"❌ Error: {e}")
            raise credentials_exception
    
    if user is None:
        print(f"❌ User not found in database")
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    
    print(f"✅ User authenticated: {user.email}, role: {user.role}")
    return user

def require_roles(*allowed_roles: str):
    """
    Dependency factory to restrict access to specific roles
    
    Usage:
        @router.get("/admin", dependencies=[Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))])
        def admin_endpoint():
            return {"message": "Admin only"}
    
    Args:
        *allowed_roles: Role strings that are allowed access
    
    Returns:
        FastAPI dependency function
    """
    # Normalize roles to uppercase
    allowed_roles_upper = {role.upper() for role in allowed_roles}
    
    def _check_role(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.upper() if current_user.role else "SUPPORT_WORKER"
        
        if user_role not in allowed_roles_upper:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}"
            )
        
        return current_user
    
    return _check_role

def require_perm(permission: str):
    """
    Dependency factory to restrict access by permission
    
    Usage:
        @router.post("/care-plan", dependencies=[Depends(require_perm("care.edit"))])
        def create_care_plan():
            return {"message": "Care plan created"}
    
    Args:
        permission: Permission string to check
    
    Returns:
        FastAPI dependency function
    """
    def _check_permission(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.upper() if current_user.role else "SUPPORT_WORKER"
        
        if not has_perm(user_role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission}"
            )
        
        return current_user
    
    return _check_permission

# Optional: Get current user but don't require authentication
def get_current_user_optional(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User | None:
    """
    Get current user if authenticated, otherwise return None
    Useful for endpoints that work both authenticated and unauthenticated
    """
    try:
        return get_current_user(db, token)
    except HTTPException:
        return None