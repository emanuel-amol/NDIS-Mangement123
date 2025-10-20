# backend/app/security/__init__.py
"""
Security module for authentication and authorization
"""
from app.security.password import verify_password, hash_password
from app.security.jwt import create_access_token, decode_token
from app.security.rbac import has_perm, get_role_permissions
from app.security.deps import (
    get_current_user,
    require_roles,
    require_perm,
    oauth2_scheme
)

__all__ = [
    # Password functions
    "verify_password",
    "hash_password",
    
    # JWT functions
    "create_access_token",
    "decode_token",
    
    # RBAC functions
    "has_perm",
    "get_role_permissions",
    
    # FastAPI dependencies
    "get_current_user",
    "require_roles",
    "require_perm",
    "oauth2_scheme",
]