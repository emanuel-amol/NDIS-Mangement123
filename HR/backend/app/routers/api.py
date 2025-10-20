"""JSON API surface that mirrors the existing HTML flows."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db
from app.services import admin as admin_service
from app.services import profile as profile_service
from app.services.mailer import send_invite_email, send_initial_email, send_reminder_email
from app.services import authz

router = APIRouter(prefix="/api/v1", tags=["api"])


def get_session_user(
    request: Request, db: Session = Depends(get_db)
) -> models.User:
    session_data = request.session.get("user")
    if not session_data:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_user = db.query(models.User).filter(models.User.id == session_data["id"]).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    return db_user


@router.get("/me", response_model=schemas.MeResponse)
def get_me(
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    candidate = crud.get_candidate_by_user(db, user_id=int(current_user.id))
    profile = None
    if candidate:
        profile = crud.get_profile(db, candidate.id)

    # Compute role/permissions, including HRM Admin via job title
    role = authz.get_role(current_user)
    if authz.is_hrm_admin(current_user, db) and role != "admin":
        role = "hrm_admin"
    perms = set(authz.get_permissions(current_user))
    if role == "hrm_admin":
        perms.update(authz.ROLE_PERMISSIONS.get(authz.ROLE_HRM_ADMIN, set()))

    return {
        "user": schemas.UserOut.model_validate(current_user),
        "candidate": schemas.CandidateOut.model_validate(candidate) if candidate else None,
        "profile": schemas.CandidateProfileOut.model_validate(profile) if profile else None,
        # extra auth info for client-side feature gating
        "role": role,
        "permissions": sorted(perms),
    }


# Self-service profile endpoint: any authenticated user can view/edit their own profile
@router.get("/profile", response_model=schemas.MeResponse)
def get_my_profile(
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    """Get the current user's own profile (self-service)."""
    candidate = crud.get_candidate_by_user(db, user_id=int(current_user.id))
    profile = None
    if candidate:
        profile = crud.get_profile(db, candidate.id)

    role = authz.get_role(current_user)
    if authz.is_hrm_admin(current_user, db) and role != "admin":
        role = "hrm_admin"
    perms = set(authz.get_permissions(current_user))
    if role == "hrm_admin":
        perms.update(authz.ROLE_PERMISSIONS.get(authz.ROLE_HRM_ADMIN, set()))

    return {
        "user": schemas.UserOut.model_validate(current_user),
        "candidate": schemas.CandidateOut.model_validate(candidate) if candidate else None,
        "profile": schemas.CandidateProfileOut.model_validate(profile) if profile else None,
        "role": role,
        "permissions": sorted(perms),
    }


@router.put("/profile", response_model=schemas.ProfileResponse)
def update_my_profile(
    payload: schemas.ProfileUpdatePayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    """Update the current user's own profile (self-service)."""
    candidate = crud.get_candidate_by_user(db, user_id=int(current_user.id))
    if not candidate:
        # Create a basic candidate record so profile can be persisted
        candidate = models.Candidate(
            user_id=current_user.id,
            email=current_user.email or "",
            first_name="",
            last_name="",
            status="Applied",
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)

    # Users cannot update their own job_title (admin-only field)
    # So we exclude it from the update
    profile_data = payload.dict(exclude={"job_title"}, exclude_unset=True)
    update = schemas.CandidateProfileUpdate(**profile_data)
    profile = crud.update_profile(db, candidate.id, update)

    return {
        "candidate": schemas.CandidateOut.model_validate(candidate),
        "profile": schemas.CandidateProfileOut.model_validate(profile),
    }


# Allow admins to query the same payload the self-service page uses.
@router.get("/admin/users/{user_id}/profile", response_model=schemas.MeResponse)
def admin_user_profile(
    user_id: int,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if not (authz.is_admin(current_user) or authz.is_hrm_admin(current_user, db)):
        raise HTTPException(status_code=403, detail="Forbidden")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    candidate = crud.get_candidate_by_user(db, user_id=user_id)
    profile = None
    if candidate:
        profile = crud.get_profile(db, candidate.id)

    return {
        "user": schemas.UserOut.model_validate(db_user),
        "candidate": schemas.CandidateOut.model_validate(candidate)
        if candidate
        else None,
        "profile": schemas.CandidateProfileOut.model_validate(profile)
        if profile
        else None,
    }


@router.put("/admin/users/{user_id}/profile", response_model=schemas.ProfileResponse)
def admin_update_user_profile(
    user_id: int,
    payload: schemas.ProfileUpdatePayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if not (authz.is_admin(current_user) or authz.is_hrm_admin(current_user, db)):
        raise HTTPException(status_code=403, detail="Forbidden")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    candidate = crud.get_candidate_by_user(db, user_id=user_id)
    if not candidate:
        # Create a basic candidate record so profile can be persisted
        candidate = models.Candidate(
            user_id=db_user.id,
            email=db_user.email or "",
            first_name="",
            last_name="",
            status="Applied",
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)

    candidate.job_title = (payload.job_title or "").strip()
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    profile_data = payload.dict(exclude={"job_title"}, exclude_unset=True)
    update = schemas.CandidateProfileUpdate(**profile_data)
    profile = crud.update_profile(db, candidate.id, update)

    return {
        "candidate": schemas.CandidateOut.model_validate(candidate),
        "profile": schemas.CandidateProfileOut.model_validate(profile),
    }


@router.get("/admin/metrics", response_model=schemas.AdminMetrics)
def admin_metrics(
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    # Allow full admins and HRM Admins to view dashboard metrics
    if not (authz.is_admin(current_user) or authz.is_hrm_admin(current_user, db)):
        raise HTTPException(status_code=403, detail="Forbidden")
    return admin_service.get_dashboard_metrics(db)


@router.get("/admin/candidates", response_model=schemas.CandidateListResponse)
def admin_candidates(
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    # Any authenticated user can see the candidates list; details remain restricted elsewhere
    rows = admin_service.fetch_candidates_with_profiles(db)
    results = []
    for candidate, profile in rows:
        results.append(
            schemas.CandidateWithProfile(
                candidate=schemas.CandidateOut.model_validate(candidate),
                profile=schemas.CandidateProfileOut.model_validate(profile)
                if profile
                else None,
            )
        )
    return {"results": results}


@router.get("/admin/workers", response_model=schemas.WorkerListResponse)
def admin_workers(
    role: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    # Any authenticated user can see the workers list
    result = admin_service.query_worker_users(
        db,
        role=role,
        status=status,
        date_from=date_from,
        date_to=date_to,
        q=q,
    )

    filters = schemas.WorkerQueryFilters(
        role=result.filters.role,
        status=result.filters.status,
        date_from=result.filters.date_from,
        date_to=result.filters.date_to,
        q=result.filters.q,
    )

    # Preserve the ordering from the dataclass result
    ordered_results = [
        schemas.WorkerUserOut(
            user=schemas.UserOut.model_validate(user),
            candidate=schemas.CandidateOut.model_validate(result.user_candidates[user.id]),
        )
        for user in result.users
    ]

    return {
        "results": ordered_results,
        "filters": filters,
        "roles": result.roles,
        "status_options": result.status_options,
    }


@router.post("/admin/users", response_model=schemas.AdminUserCreateResponse)
def admin_create_user(
    payload: schemas.AdminUserCreatePayload,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if not authz.is_admin(current_user):
        raise HTTPException(status_code=403, detail="Forbidden")
    username = (payload.username or "").strip() or (payload.email.split("@")[0] if "@" in payload.email else payload.email)
    username = username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    try:
        user, candidate, temp_password = admin_service.create_user_and_candidate(
            db,
            username=username,
            email=payload.email,
            first_name=payload.first_name or "",
            last_name=payload.last_name or "",
            job_title=payload.job_title or "",
            mobile=payload.mobile or "",
            status=payload.status or "Applied",
            address=payload.address or "",
        )
    except admin_service.UserAlreadyExistsError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # send invite email in background if we have an email address
    if candidate and candidate.email:
        background_tasks.add_task(send_invite_email, candidate.email, candidate.first_name or "", temp_password)

    return {
        "user": schemas.UserOut.model_validate(user),
        "candidate": schemas.CandidateOut.model_validate(candidate),
        "temp_password": temp_password,
    }


@router.post("/admin/users/{user_id}/role", response_model=schemas.SimpleMessage)
def admin_set_user_role(
    user_id: int,
    role: str = Form(...),
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if not authz.is_admin(current_user):
        raise HTTPException(status_code=403, detail="Forbidden")
    normalized = (role or '').strip().lower()
    if normalized not in ("user", "admin", "hrm_admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    # set role on DB user
    setattr(db_user, 'role', normalized)
    db.add(db_user)
    db.commit()
    return {"message": f"Updated role for user {db_user.username} to {normalized}."}


@router.post("/admin/users/role-by-email", response_model=schemas.SimpleMessage)
def admin_set_user_role_by_email(
    email: str = Form(...),
    role: str = Form(...),
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    """Set a user's role by their email address.

    This is a convenience endpoint so you don't need to look up user IDs or run scripts.
    """
    if not authz.is_admin(current_user):
        raise HTTPException(status_code=403, detail="Forbidden")
    normalized_role = (role or '').strip().lower()
    if normalized_role not in ("user", "admin", "hrm_admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    email_norm = (email or "").strip().lower()
    if not email_norm or "@" not in email_norm:
        raise HTTPException(status_code=400, detail="Valid email is required")

    db_user = crud.get_user_by_email(db, email_norm)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    setattr(db_user, 'role', normalized_role)
    db.add(db_user)
    db.commit()
    return {"message": f"Updated role for user {db_user.username} to {normalized_role}."}


@router.get("/admin/applicants", response_model=schemas.ApplicantsPageResponse)
def admin_applicants(
    role: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    page: Optional[int] = 1,
    per_page: Optional[int] = 25,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    # Any authenticated user can see the applicants list
    # Fetch applicants with filters using existing admin service (HTML used same logic)
    # For total/roles/status_options, compute like the HTML route
    from app.routers import applicants as applicants_router  # reuse helper if desired

    query = db.query(models.Candidate)
    if role:
        query = query.filter(models.Candidate.job_title == role)
    if status:
        query = query.filter(models.Candidate.status == status)
    # date filter parsing copied loosely from applicants router
    def _parse_date(s: Optional[str]):
        if not s:
            return None
        try:
            from datetime import datetime, timedelta
            return datetime.strptime(s, "%Y-%m-%d")
        except ValueError:
            return None

    df = _parse_date(date_from)
    dt = _parse_date(date_to)
    if df:
        query = query.filter(models.Candidate.applied_on >= df)
    if dt:
        from datetime import timedelta
        query = query.filter(models.Candidate.applied_on < (dt + timedelta(days=1)))

    if q:
        like = f"%{q.strip()}%"
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.Candidate.first_name.ilike(like),
                models.Candidate.last_name.ilike(like),
                models.Candidate.email.ilike(like),
                models.Candidate.mobile.ilike(like),
                models.Candidate.job_title.ilike(like),
            )
        )

    total = query.count()
    page = max(page or 1, 1)
    per_page = max(min(per_page or 25, 100), 1)
    query = query.order_by(models.Candidate.applied_on.desc().nullslast(), models.Candidate.id.desc())
    rows = query.offset((page - 1) * per_page).limit(per_page).all()

    roles = [r for (r,) in db.query(models.Candidate.job_title).distinct().all() if r]
    status_options = [s for (s,) in db.query(models.Candidate.status).distinct().all() if s]

    return {
        "applicants": [schemas.CandidateOut.model_validate(c) for c in rows],
        "total": total,
        "roles": roles,
        "status_options": status_options,
    }


@router.put("/portal/profile", response_model=schemas.ProfileResponse)
def update_profile(
    payload: schemas.ProfileUpdatePayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    candidate = crud.get_candidate_by_user(db, user_id=int(current_user.id))
    if not candidate:
        raise HTTPException(status_code=400, detail="No candidate linked to this user")

    candidate.job_title = (payload.job_title or "").strip()
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    profile_data = payload.dict(exclude={"job_title"}, exclude_unset=True)
    update = schemas.CandidateProfileUpdate(**profile_data)
    profile = crud.update_profile(db, candidate.id, update)

    return {
        "candidate": schemas.CandidateOut.model_validate(candidate),
        "profile": schemas.CandidateProfileOut.model_validate(profile),
    }


@router.post("/portal/profile/upload", response_model=schemas.ProfileUploadResponse)
async def upload_profile_asset(
    kind: str = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    candidate = crud.get_candidate_by_user(db, user_id=int(current_user.id))
    if not candidate:
        raise HTTPException(status_code=400, detail="No candidate linked to this user")

    normalized_kind = "photo" if kind == "picture" else kind
    path = await profile_service.save_profile_upload(
        candidate=candidate, kind=kind, file=file, db=db
    )
    await file.close()

    return {
        "candidate_id": candidate.id,
        "kind": normalized_kind,
        "path": path,
    }



@router.post("/admin/users/{user_id}/archive", response_model=schemas.SimpleMessage)
def api_archive_user(
    user_id: int,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if not authz.is_admin(current_user):
        raise HTTPException(status_code=403, detail="Forbidden")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    cand = db.query(models.Candidate).filter(models.Candidate.user_id == db_user.id).first()
    if not cand:
        raise HTTPException(status_code=400, detail="No candidate linked to this user to archive")

    cand.status = "Archived"
    db.add(cand)
    db.commit()
    return {"message": f"Archived user {db_user.username}."}


@router.post("/admin/users/{user_id}/unarchive", response_model=schemas.SimpleMessage)
def api_unarchive_user(
    user_id: int,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if not authz.is_admin(current_user):
        raise HTTPException(status_code=403, detail="Forbidden")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    cand = db.query(models.Candidate).filter(models.Candidate.user_id == db_user.id).first()
    if not cand:
        raise HTTPException(status_code=400, detail="No candidate linked to this user to unarchive")

    cand.status = "Hired"
    db.add(cand)
    db.commit()
    return {"message": f"Unarchived user {db_user.username}."}


@router.post("/admin/applicants/{candidate_id}/archive", response_model=schemas.SimpleMessage)
def api_archive_applicant(
    candidate_id: int,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if not authz.is_admin(current_user):
        raise HTTPException(status_code=403, detail="Forbidden")
    cand = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Applicant not found")

    cand.status = "Archived"
    db.add(cand)
    db.commit()
    return {"message": f"Archived applicant {cand.first_name or ''} {cand.last_name or ''}".strip() or "Archived applicant"}


# =========================
# Generic Documents API
# =========================

@router.post("/admin/users/{user_id}/documents/folders", response_model=schemas.SimpleMessage)
def api_create_documents_folder(
    user_id: int,
    name: str = Form(...),
    parent: str | None = Form(None),
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        raise HTTPException(status_code=400, detail="No candidate linked to this user")
    rel = profile_service.create_documents_folder(candidate=cand, name=name, parent=parent)
    return {"message": f"Folder created: {rel}"}


@router.post("/admin/users/{user_id}/documents/upload", response_model=schemas.SimpleMessage)
async def api_upload_document(
    user_id: int,
    file: UploadFile = File(...),
    folder: str | None = Form(None),
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        raise HTTPException(status_code=400, detail="No candidate linked to this user")
    rel = await profile_service.save_document_upload(candidate=cand, file=file, folder=folder)
    return {"message": f"Uploaded: {rel}"}


@router.get("/admin/users/{user_id}/documents")
def api_list_documents(
    user_id: int,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        raise HTTPException(status_code=400, detail="No candidate linked to this user")
    return profile_service.list_documents(candidate=cand)


@router.delete("/admin/users/{user_id}/documents")
def api_delete_document(
    user_id: int,
    path: str,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        raise HTTPException(status_code=400, detail="No candidate linked to this user")
    profile_service.delete_document(candidate=cand, rel_path=path)
    return {"message": "Deleted"}


# =========================
# Notes API (stored in candidate profile extras)
# =========================

@router.get("/admin/users/{user_id}/notes", response_model=schemas.NotesResponse)
def api_get_notes(
    user_id: int,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        # If no candidate yet, return empty notes
        return {"general_notes": "", "interview_notes": ""}
    notes = crud.get_notes(db, cand.id)
    return notes


@router.put("/admin/users/{user_id}/notes", response_model=schemas.NotesResponse)
def api_put_notes(
    user_id: int,
    payload: schemas.NotesPayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        # create a basic candidate so notes can be persisted
        cand = models.Candidate(
            user_id=db_user.id,
            email=db_user.email or "",
            first_name="",
            last_name="",
            status="Applied",
        )
        db.add(cand)
        db.commit()
        db.refresh(cand)
    updated = crud.update_notes(
        db,
        cand.id,
        general_notes=payload.general_notes,
        interview_notes=payload.interview_notes,
    )
    return updated


@router.delete("/admin/users/{user_id}", response_model=schemas.SimpleMessage)
def api_delete_user(
    user_id: int,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(db_user)
    db.commit()
    return {"message": f"Deleted user {db_user.username}."}


# =========================
# Assessment API (stored under profile.extras.assessment)
# =========================

@router.get("/admin/users/{user_id}/assessment", response_model=schemas.AssessmentResponse)
def api_get_assessment(
    user_id: int,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        return {}
    return crud.get_assessment(db, cand.id)


@router.put("/admin/users/{user_id}/assessment", response_model=schemas.AssessmentResponse)
def api_put_assessment(
    user_id: int,
    payload: schemas.AssessmentPayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        # create a basic candidate so we can persist assessment
        cand = models.Candidate(
            user_id=db_user.id,
            email=db_user.email or "",
            first_name="",
            last_name="",
            status="Applied",
        )
        db.add(cand)
        db.commit()
        db.refresh(cand)

    payload_dict = payload.model_dump(exclude_unset=True)
    updated = crud.update_assessment(db, cand.id, payload_dict)
    return updated


# =========================
# Status API
# =========================

@router.put("/admin/users/{user_id}/status", response_model=schemas.CandidateStatusResponse)
def api_update_status(
    user_id: int,
    payload: schemas.StatusUpdatePayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        raise HTTPException(status_code=400, detail="No candidate linked to this user")

    allowed = {"Applied", "Interview", "Pending", "Rejected", "Offer", "Hired", "Archived"}
    new_status = (payload.status or "").strip()
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")

    cand.status = new_status
    db.add(cand)
    db.commit()
    db.refresh(cand)
    return {"id": cand.id, "status": cand.status}


# =========================
# Reference verification API
# =========================

@router.post("/admin/users/{user_id}/references/invite", response_model=schemas.ReferenceInviteResponse)
def api_reference_invite(
    user_id: int,
    payload: schemas.ReferenceInvitePayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    import secrets
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        # create minimal candidate so we can store references
        cand = models.Candidate(
            user_id=db_user.id,
            email=db_user.email or "",
            first_name="",
            last_name="",
            status="Applied",
        )
        db.add(cand)
        db.commit()
        db.refresh(cand)

    token = secrets.token_urlsafe(24)
    crud.create_reference_invite(
        db,
        cand.id,
        token=token,
        referee_name=payload.referee_name.strip(),
        referee_email=str(payload.referee_email),
    )
    # Public SPA route (served by main.py) for the referee to fill in the form
    link = f"/reference/{token}"
    return {"token": token, "link": link, "message": "Reference invite created."}


@router.get("/reference/{token}", response_model=schemas.ReferenceVerifyInfo)
def api_reference_info(
    token: str,
    db: Session = Depends(get_db),
):
    found = crud.get_reference_by_token(db, token)
    if not found:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    cand, _prof, entry = found
    candidate_name = f"{cand.first_name or ''} {cand.last_name or ''}".strip() or (cand.email or "Candidate")
    status = "submitted" if entry.get("submitted_at") else "pending"
    return {"candidate_name": candidate_name, "referee_name": entry.get("referee_name") or "", "status": status}


@router.post("/reference/submit", response_model=schemas.ReferenceSubmissionResponse)
def api_reference_submit(
    payload: schemas.ReferenceSubmissionPayload,
    db: Session = Depends(get_db),
):
    ok = crud.submit_reference(
        db,
        payload.token,
        relationship=payload.relationship,
        comments=payload.comments,
        recommend=payload.recommend,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    return {"message": "Reference submitted. Thank you."}


@router.get("/admin/users/{user_id}/references", response_model=schemas.ReferenceListResponse)
def api_list_references(
    user_id: int,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        return {"references": []}
    rows = crud.list_references_for_candidate(db, cand.id)
    # Validate via schema typing
    entries = [
        schemas.ReferenceEntry(
            token=r["token"],
            referee_name=r["referee_name"],
            referee_email=r["referee_email"],
            status=r["status"],
            submitted_at=r.get("submitted_at"),
            relationship=r.get("relationship"),
            comments=r.get("comments"),
            recommend=r.get("recommend"),
        ) for r in rows
    ]
    return {"references": entries}


@router.delete("/admin/users/{user_id}/references/{token}", response_model=schemas.SimpleMessage)
def api_delete_reference(
    user_id: int,
    token: str,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    cand = crud.get_candidate_by_user(db, user_id=user_id)
    if not cand:
        raise HTTPException(status_code=400, detail="No candidate linked to this user")
    ok = crud.delete_reference(db, cand.id, token)
    if not ok:
        raise HTTPException(status_code=404, detail="Reference not found")
    return {"message": "Reference removed"}


# =========================
# Account management (self)
# =========================

@router.put("/me/email", response_model=schemas.UserOut)
def change_my_email(
    payload: schemas.EmailChangePayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    new_email = str(payload.new_email).strip()
    # Basic uniqueness check
    exists = db.query(models.User).filter(models.User.email == new_email, models.User.id != current_user.id).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already in use")
    old_email = (current_user.email or "").strip().lower()
    current_user.email = new_email
    # If candidate exists without explicit candidate email, keep them consistent too
    cand = crud.get_candidate_by_user(db, user_id=int(current_user.id))
    if cand and (cand.email or "").strip().lower() == old_email:
        cand.email = new_email
        db.add(cand)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return schemas.UserOut.model_validate(current_user)


@router.put("/me/password", response_model=schemas.SimpleMessage)
def change_my_password(
    payload: schemas.PasswordChangePayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    current_user.hashed_password = crud.get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password updated"}


# =========================
# Account management (admin by user_id)
# =========================

@router.put("/admin/users/{user_id}/email", response_model=schemas.UserOut)
def admin_change_email(
    user_id: int,
    payload: schemas.EmailChangePayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    new_email = str(payload.new_email).strip()
    exists = db.query(models.User).filter(models.User.email == new_email, models.User.id != db_user.id).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already in use")
    db_user.email = new_email
    cand = crud.get_candidate_by_user(db, user_id=int(db_user.id))
    if cand and cand.email:
        cand.email = new_email
        db.add(cand)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return schemas.UserOut.model_validate(db_user)


@router.put("/admin/users/{user_id}/password", response_model=schemas.SimpleMessage)
def admin_change_password_api(
    user_id: int,
    payload: schemas.PasswordChangePayload,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    db_user.hashed_password = crud.get_password_hash(payload.new_password)
    db.add(db_user)
    db.commit()
    return {"message": "Password updated"}


@router.post("/admin/users/{user_id}/email/initial", response_model=schemas.SimpleMessage)
def send_initial_email_to_user(
    user_id: int,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    """Send initial onboarding email to a user/candidate"""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = crud.get_candidate_by_user(db, user_id=user_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="No candidate record found for this user")
    
    if not candidate.email:
        raise HTTPException(status_code=400, detail="No email address on file for candidate")
    
    background_tasks.add_task(send_initial_email, candidate.email, candidate.first_name or "")
    return {"message": "Initial email sent"}


@router.post("/admin/users/{user_id}/email/reminder", response_model=schemas.SimpleMessage)
def send_reminder_email_to_user(
    user_id: int,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    """Send reminder email about incomplete items"""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = crud.get_candidate_by_user(db, user_id=user_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="No candidate record found for this user")
    
    if not candidate.email:
        raise HTTPException(status_code=400, detail="No email address on file for candidate")
    
    # Check what items are missing for this candidate
    missing_items = []
    profile = crud.get_profile(db, candidate.id) if candidate else None
    
    if not candidate.job_title:
        missing_items.append("Complete job title")
    if not profile or not profile.summary:
        missing_items.append("Add profile summary")
    if not profile or not profile.skills:
        missing_items.append("Add skills information")
    if not profile or not profile.resume_path:
        missing_items.append("Upload resume")
    if not profile or not profile.photo_path:
        missing_items.append("Upload profile photo")
    
    if not missing_items:
        missing_items = ["Review and complete any remaining profile sections"]
    
    background_tasks.add_task(send_reminder_email, candidate.email, candidate.first_name or "", missing_items)
    return {"message": "Reminder email sent"}


@router.get("/debug/user/{email}", response_model=dict)
def debug_user_by_email(
    email: str,
    current_user: models.User = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    """Debug endpoint to check if a user exists and their details"""
    db_user = db.query(models.User).filter(models.User.email == email).first()
    if not db_user:
        return {"exists": False, "email": email}
    
    candidate = crud.get_candidate_by_user(db, user_id=db_user.id)
    
    return {
        "exists": True,
        "user_id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
        "has_candidate": candidate is not None,
        "candidate_id": candidate.id if candidate else None,
        "candidate_email": candidate.email if candidate else None,
        "candidate_name": f"{candidate.first_name} {candidate.last_name}".strip() if candidate else None,
    }
