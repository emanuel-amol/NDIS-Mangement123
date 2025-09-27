# backend/app/api/deps_admin_key.py
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
    
    Args:
        request: FastAPI Request object for header inspection
        x_admin_key: Admin key from X-Admin-Key header
        
    Returns:
        str: The validated admin key
        
    Raises:
        HTTPException: 401 if key is missing or invalid
        HTTPException: 500 if ADMIN_API_KEY not configured
    """
    # Get the configured admin key with fallback
    admin_key = getattr(settings, 'ADMIN_API_KEY', None) or os.getenv("ADMIN_API_KEY", "admin-development-key-123")
    
    if not admin_key:
        logger.error("ADMIN_API_KEY not configured in environment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Admin API key not configured"
        )
    
    # Check multiple possible header formats for compatibility
    provided_key = None
    auth_method = None
    
    # Method 1: FastAPI Header() parameter (primary method)
    if x_admin_key:
        provided_key = x_admin_key.strip()
        auth_method = "X-Admin-Key header"
    else:
        # Method 2: Direct header access for edge cases
        headers = dict(request.headers)
        
        # Check various header name formats
        for header_name in ["x-admin-key", "X-Admin-Key", "x_admin_key"]:
            if header_name in headers:
                provided_key = headers[header_name].strip()
                auth_method = f"{header_name} header"
                break
        
        # Method 3: Authorization header as fallback
        if not provided_key and "authorization" in headers:
            auth_header = headers["authorization"]
            if auth_header.startswith("Bearer "):
                provided_key = auth_header.replace("Bearer ", "").strip()
                auth_method = "Authorization Bearer"
    
    # Validate the key
    if not provided_key:
        logger.warning("No admin key provided in request")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Admin key required. Please provide X-Admin-Key header."
        )
    
    if provided_key != admin_key:
        logger.warning(f"Invalid admin key provided via {auth_method}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid admin key"
        )
    
    logger.info(f"Admin authentication successful via {auth_method}")
    return provided_key


def require_admin_key_simple(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    """
    Simplified admin key dependency for basic use cases.
    Uses the original approach with improved error handling.
    
    Args:
        x_admin_key: Admin key from X-Admin-Key header (required)
        
    Returns:
        bool: True if authentication successful
        
    Raises:
        HTTPException: 401 if key is missing or invalid
    """
    # Get admin key from settings or environment with fallback
    admin_key = getattr(settings, 'ADMIN_API_KEY', None) or os.getenv("ADMIN_API_KEY", "admin-development-key-123")
    
    if not admin_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin API key not configured"
        )
    
    if not x_admin_key or x_admin_key.strip() != admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid admin key"
        )
    
    return True


# Optional: Development-only dependency with detailed error messages
def require_admin_key_debug(x_admin_key: str = Header(None, alias="X-Admin-Key")):
    """
    Debug version that provides detailed error information.
    WARNING: Only use in development - exposes sensitive information!
    """
    admin_key = os.getenv("ADMIN_API_KEY", "admin-development-key-123")
    
    if not x_admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Missing X-Admin-Key header",
                "expected_header": "X-Admin-Key",
                "configured_key": admin_key  # Only for development!
            }
        )
    
    if x_admin_key != admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Invalid admin key",
                "provided": x_admin_key,
                "expected": admin_key  # Only for development!
            }
        )
    
    return x_admin_key