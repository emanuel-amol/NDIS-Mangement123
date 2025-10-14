# backend/app/security/supabase_auth.py
import os
import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthHeader
from typing import Optional

security = HTTPBearer()

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")

def verify_supabase_token(credentials: HTTPAuthHeader = Depends(security)) -> dict:
    """
    Verify Supabase JWT token
    """
    token = credentials.credentials
    
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase JWT secret not configured"
        )
    
    try:
        # Decode and verify the JWT token
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )

def get_current_user_from_supabase(payload: dict = Depends(verify_supabase_token)):
    """
    Extract user info from Supabase token payload
    Returns a user-like object
    """
    user_id = payload.get("sub")  # Supabase user ID
    email = payload.get("email")
    role = payload.get("role", "authenticated")
    
    # Create a simple user object
    # You can extend this to fetch from your DB if needed
    return {
        "id": user_id,
        "email": email,
        "role": role,
        "is_active": True
    }