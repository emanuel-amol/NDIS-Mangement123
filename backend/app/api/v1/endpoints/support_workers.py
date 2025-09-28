from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps_admin_key import require_admin_key
from app.models.user import User, UserRole
from pydantic import BaseModel


class SupportWorkerOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    status: str
    skills: List[str] = []

    class Config:
        from_attributes = True


router = APIRouter(dependencies=[Depends(require_admin_key)])


@router.get("", response_model=List[SupportWorkerOut])
def list_support_workers(db: Session = Depends(get_db)) -> List[SupportWorkerOut]:
    try:
        workers = (
            db.query(User)
            .filter(User.role == UserRole.support_worker)
            .all()
        )

        results: List[SupportWorkerOut] = []
        for worker in workers:
            profile = worker.profile_data or {}
            skills = profile.get('skills') or []
            if isinstance(skills, str):
                skills = [skill.strip() for skill in skills.split(',') if skill.strip()]

            results.append(
                SupportWorkerOut(
                    id=worker.id,
                    name=f"{worker.first_name} {worker.last_name}".strip(),
                    email=worker.email,
                    phone=worker.phone,
                    status='active' if worker.is_active else 'inactive',
                    skills=skills,
                )
            )
        return results
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load support workers: {exc}"
        )
