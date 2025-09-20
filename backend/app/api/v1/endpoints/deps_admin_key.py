# backend/app/api/deps_admin_key.py
from fastapi import Header, HTTPException, status
from app.core.config import settings

def require_admin_key(x_admin_key: str | None = Header(None)):
    if not settings.ADMIN_API_KEY:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="ADMIN_API_KEY not configured")
    if x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")
