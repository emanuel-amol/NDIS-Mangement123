# backend/app/api/deps_admin_key.py
from fastapi import Header, HTTPException, status, Request
from app.core.config import settings
import os
import logging

logger = logging.getLogger(__name__)


def require_admin_key(
    x_admin_key: str = Header(None, alias="X-Admin-Key")
):
    """
    Dependency to require admin API key authentication.
    
    Args:
        x_admin_key: Admin key from X-Admin-Key header
        
    Returns:
        str: The validated admin key
        
    Raises:
        HTTPException: 401 if key is missing or invalid
        HTTPException: 500 if ADMIN_API_KEY not configured
    """
    # Get the configured admin key with fallback
    admin_key = getattr(settings, 'ADMIN_API_KEY', None) or os.getenv("ADMIN_API_KEY") or os.getenv("ADMIN_KEY", "admin-development-key-123")
    
    if not admin_key:
        logger.error("ADMIN_API_KEY not configured in environment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Admin API key not configured"
        )
    
    # Check if admin key was provided
    if not x_admin_key:
        logger.warning("No admin key provided in request")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Admin key required. Provide X-Admin-Key header."
        )
    
    # Validate the key
    if x_admin_key.strip() != admin_key:
        logger.warning(f"Invalid admin key provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid admin key"
        )
    
    logger.info(f"Admin authentication successful")
    return x_admin_key


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
    admin_key = getattr(settings, 'ADMIN_API_KEY', None) or os.getenv("ADMIN_API_KEY") or os.getenv("ADMIN_KEY", "admin-development-key-123")
    
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
    admin_key = os.getenv("ADMIN_API_KEY") or os.getenv("ADMIN_KEY", "admin-development-key-123")
    
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