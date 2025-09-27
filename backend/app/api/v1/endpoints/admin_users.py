# backend/app/api/v1/endpoints/admin_users.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.deps_admin_key import require_admin_key
from app.schemas.user import UserCreate, UserOut
from app.models.user import User, UserRole
from app.services.security import hash_password

router = APIRouter(
    prefix="/admin/users",
    tags=["admin-users"],
    dependencies=[Depends(require_admin_key)]
)

@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    role: Optional[str] = Query(None),
    q: Optional[str] = Query(None)
):
    query = db.query(User)
    if role:
        if role not in [r.value for r in UserRole]:
            raise HTTPException(400, "Invalid role")
        query = query.filter(User.role == UserRole(role))
    if q:
        like = f"%{q}%"
        query = query.filter((User.first_name.ilike(like)) | (User.last_name.ilike(like)) | (User.email.ilike(like)))
    return query.order_by(User.first_name, User.last_name).all()

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already exists")

    # Validate role
    if payload.role not in [r.value for r in UserRole]:
        raise HTTPException(400, "Invalid role")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        role=UserRole(payload.role),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
