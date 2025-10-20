# app/routers/applicants.py
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

router = APIRouter(prefix="/admin", tags=["admin"])

# Match your auth.py template loader style
BASE_DIR = Path(__file__).resolve().parent.parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
# Serve React SPA when built
FRONTEND_DIST_DIR = BASE_DIR / "static" / "forms"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"

def _parse_date(s: Optional[str]):
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except ValueError:
        return None

@router.get("/applicants", response_class=HTMLResponse)
def applicants_index(
    request: Request,
    role: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    per_page: int = 25,
    db: Session = Depends(get_db),
):
    # If the React build exists, serve the SPA so the Applicants list renders client-side.
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE, media_type="text/html")

    query = db.query(models.Candidate)

    # Filters
    if role:
        query = query.filter(models.Candidate.job_title == role)
    if status:
        query = query.filter(models.Candidate.status == status)

    df = _parse_date(date_from)
    dt = _parse_date(date_to)
    if df:
        query = query.filter(models.Candidate.applied_on >= df)
    if dt:
        query = query.filter(models.Candidate.applied_on < (dt + timedelta(days=1)))

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.Candidate.first_name.ilike(like),
                models.Candidate.last_name.ilike(like),
                models.Candidate.email.ilike(like),
                models.Candidate.mobile.ilike(like),
                models.Candidate.job_title.ilike(like),
            )
        )

    # Order newest first; applied_on might be NULL on old rows
    query = query.order_by(models.Candidate.applied_on.desc().nullslast(), models.Candidate.id.desc())

    # Pagination
    total = query.count()
    page = max(page, 1)
    per_page = max(min(per_page, 100), 1)
    applicants = query.offset((page - 1) * per_page).limit(per_page).all()

    # Options for the selects
    roles = [r for (r,) in db.query(models.Candidate.job_title).distinct().all() if r]
    status_options = [s for (s,) in db.query(models.Candidate.status).distinct().all() if s]

    # Optional flash
    flash = request.session.pop("flash", None)

    return templates.TemplateResponse(
        "applicants.html",
        {
            "request": request,
            "applicants": applicants,
            "roles": roles,
            "status_options": status_options,
            "role": role,
            "status": status,
            "date_from": date_from,
            "date_to": date_to,
            "q": q,
            "page": page,
            "per_page": per_page,
            "total": total,
            "flash": flash,
        },
    )
