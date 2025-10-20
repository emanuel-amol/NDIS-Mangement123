# backend/app/security/jwt.py
from datetime import datetime, timedelta, timezone
from typing import Dict
from jose import jwt, JWTError
import os

# Read directly from environment (main.py already loads root .env)
SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "dev-change-me-in-production")
ALGORITHM = os.getenv("AUTH_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("AUTH_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

def create_access_token(email: str, role: str) -> str:
    """
    Create a JWT access token with email and role claims
    
    Args:
        email: User's email address (used as subject)
        role: User's role (PROVIDER_ADMIN, SERVICE_MANAGER, etc.)
    
    Returns:
        Encoded JWT token string
    """
    now = datetime.now(tz=timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload: Dict = {
        "sub": email,
        "role": role.upper(),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Dict:
    """
    Decode and validate a JWT token
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token payload with 'sub' (email) and 'role'
    
    Raises:
        JWTError: If token is invalid or expired
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])