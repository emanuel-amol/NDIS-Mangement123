# backend/app/api/deps_admin_key.py - FIXED VERSION
from fastapi import Header, HTTPException, status, Request
from app.core.config import settings
import os
import logging

logger = logging.getLogger(__name__)

def require_admin_key(
    request: Request,
    x_admin_key: str = Header(None, alias="X-Admin-Key")
):
    """
    Dependency to require admin API key authentication.
    Supports multiple header formats for compatibility.
    """
    # Debug logging
    all_headers = dict(request.headers)
    logger.info(f"All request headers: {list(all_headers.keys())}")
    logger.info(f"X-Admin-Key from Header(): {x_admin_key}")
    
    # Get the configured admin key
    admin_key = getattr(settings, 'ADMIN_API_KEY', None) or os.getenv("ADMIN_API_KEY")
    
    if not admin_key:
        logger.error("ADMIN_API_KEY not configured in environment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="ADMIN_API_KEY not configured"
        )
    
    # Check multiple possible header formats
    provided_key = None
    
    # Method 1: FastAPI Header() parameter
    if x_admin_key:
        provided_key = x_admin_key
        logger.info("Found key via FastAPI Header parameter")
    
    # Method 2: Direct header access (case variations)
    elif "x-admin-key" in all_headers:
        provided_key = all_headers["x-admin-key"]
        logger.info("Found key via lowercase x-admin-key")
    
    elif "X-Admin-Key" in all_headers:
        provided_key = all_headers["X-Admin-Key"]
        logger.info("Found key via X-Admin-Key")
        
    elif "x_admin_key" in all_headers:
        provided_key = all_headers["x_admin_key"]
        logger.info("Found key via x_admin_key")
    
    # Method 3: Authorization header as fallback
    elif "authorization" in all_headers:
        auth_header = all_headers["authorization"]
        if auth_header.startswith("Bearer "):
            provided_key = auth_header.replace("Bearer ", "")
            logger.info("Found key via Authorization Bearer")
    
    # Log what we found
    logger.info(f"Configured admin key exists: {bool(admin_key)}")
    logger.info(f"Provided key exists: {bool(provided_key)}")
    logger.info(f"Keys match: {provided_key == admin_key if provided_key and admin_key else False}")
    
    # Validate the key
    if not provided_key:
        logger.warning("No admin key provided in any expected header format")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Admin key required. Please provide X-Admin-Key header."
        )
    
    if provided_key != admin_key:
        logger.warning(f"Invalid admin key provided: {provided_key[:10]}... (showing first 10 chars)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid admin key"
        )
    
    logger.info("Admin authentication successful")
    return provided_key


# Alternative simpler version for testing
def require_admin_key_simple(x_admin_key: str = Header(None)):
    """Simplified admin key check for testing"""
    # Get admin key from environment
    admin_key = os.getenv("ADMIN_API_KEY", "admin-development-key-123")
    
    if not x_admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Admin-Key header"
        )
    
    if x_admin_key != admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid admin key. Expected: {admin_key}"
        )
    
    return x_admin_key