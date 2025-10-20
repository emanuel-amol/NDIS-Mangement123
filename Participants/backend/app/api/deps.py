"""Shared API dependencies."""

from typing import Optional

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User


def get_current_active_user(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Attempt to resolve the current authenticated user.

    The function looks for a user object attached to the request state (common
    for middleware/auth integrations). As a fallback it will look for an
    X-User-Id header and try to load the active user from the database.
    """
    user = getattr(request.state, "user", None)
    if isinstance(user, User):
        return user

    user_id_header = request.headers.get("X-User-Id")
    if user_id_header:
        try:
            user_id = int(user_id_header)
        except ValueError:
            return None

        return (
            db.query(User)
            .filter(User.id == user_id, User.is_active.is_(True))
            .first()
        )

    return None
