"""Authorization helpers (RBAC-lite) without schema changes.

Admins are determined via environment variables so we avoid DB migrations:
- ADMIN_EMAILS: comma-separated list of emails treated as admins
- ADMIN_DOMAIN: a domain (e.g., example.com) – any user with this email
  domain will be treated as admin.

Expose helpers:
- is_admin(user)
- get_role(user) -> one of: "hrm_admin" | "admin" | "user"
- get_permissions(user) -> list[str]
- has_permission(user, perm: str) -> bool
"""
from __future__ import annotations

import os
from typing import Iterable, Optional
from sqlalchemy.orm import Session

from app import models

# Role constants
ROLE_HRM_ADMIN = "hrm_admin"
ROLE_ADMIN = "admin"
ROLE_USER = "user"

# Permission sets per role
ROLE_PERMISSIONS: dict[str, set[str]] = {
    ROLE_HRM_ADMIN: {
        # HRM: can view applicants and workers pages
        "admin:applicants:read",
        "admin:workers:read",
        # often the participants list shares the candidates endpoint
        "admin:candidates:read",
    },
    ROLE_ADMIN: {
        # Minimal admin: manage basic account settings (email/password)
        "admin:account:email",
        "admin:account:password",
    },
    ROLE_USER: set(),
}


def _clean(s: str | None) -> str:
    if not s:
        return ""
    # strip whitespace and surrounding quotes
    s = s.strip().strip('"').strip("'")
    return s


def _parse_admin_emails() -> set[str]:
    raw = os.getenv("ADMIN_EMAILS", "")
    raw = _clean(raw)
    parts: Iterable[str] = (
        _clean(p).lower() for p in raw.split(",") if _clean(p)
    )
    return {p for p in parts if p}


def is_admin(user: models.User) -> bool:
    if not user or not (user.email or "").strip():
        return False
    # Prefer DB role if available
    role = getattr(user, 'role', None)
    if isinstance(role, str):
        r = role.strip().lower()
        if r == ROLE_ADMIN:
            return True
    email = _clean(user.email).lower()
    admins = _parse_admin_emails()
    if email in admins:
        return True
    domain = _clean(os.getenv("ADMIN_DOMAIN", "")).lower()
    if domain and email.endswith(f"@{domain}"):
        return True
    return False


def get_role(user: models.User) -> str:
    # If DB role explicitly set, prefer that (normalized)
    role = getattr(user, 'role', None)
    if isinstance(role, str) and role.strip():
        r = role.strip().lower()
        if r in (ROLE_USER, ROLE_ADMIN, ROLE_HRM_ADMIN):
            return r
    # Fallback: env-based admins are treated as limited 'admin'
    return ROLE_ADMIN if is_admin(user) else ROLE_USER


def get_permissions(user: models.User) -> list[str]:
    role = get_role(user)
    perms = ROLE_PERMISSIONS.get(role, set())
    # regular user permissions (self-service only) could be listed here if needed
    return sorted(perms)


def has_permission(user: models.User, perm: str) -> bool:
    return perm in ROLE_PERMISSIONS.get(get_role(user), set())


def is_hrm_admin(user: models.User, db: Optional[Session] = None) -> bool:
    """Return True if the user is an HRM Admin.

    Logic:
    - If the user's DB role is explicitly 'hrm_admin', return True.
    - Else, if a DB session is provided and the linked Candidate has job_title 'HRM Admin',
      treat the user as hrm_admin.
    """
    if not user:
        return False
    role = getattr(user, 'role', None)
    if isinstance(role, str) and role.strip().lower() == ROLE_HRM_ADMIN:
        return True
    if db is not None:
        cand = db.query(models.Candidate).filter(models.Candidate.user_id == user.id).first()
        if cand and isinstance(cand.job_title, str) and cand.job_title.strip().lower() == 'hrm admin':
            return True
    return False
