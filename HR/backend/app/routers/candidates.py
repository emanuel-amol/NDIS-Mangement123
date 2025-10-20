# app/routers/candidates.py

import secrets
from fastapi import APIRouter, Depends, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, ValidationError
from typing import Optional
from datetime import date, datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from starlette.datastructures import UploadFile

from app.database import get_db
from app import models, crud
from app.services.mailer import send_initial_email, send_invite_email

router = APIRouter()

# --- payload model the frontend sends ---
class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[str] = None
    applied_on: Optional[date] = None  # optional; DB default handles if omitted


# --- JSON API used by the intake form ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/api/v1/hr/recruitment/candidates/", response_class=JSONResponse)
async def api_create_candidate(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # must be logged in to attach user_id
    session_user = request.session.get("user")
    if not session_user:
        return JSONResponse({"detail": "Not authenticated"}, status_code=401)

    content_type = request.headers.get("content-type", "")
    resume_file: UploadFile | None = None

    if "application/json" in content_type:
        payload_data = await request.json()
    else:
        form = await request.form()
        payload_data = {}
        for field in (
            "first_name",
            "last_name",
            "email",
            "mobile",
            "job_title",
            "address",
            "applied_on",
            # additional profile fields allowed via public intake form
            "summary",
            "skills",
            "linkedin",
            # extended settings fields
            "date_of_birth",
            "gender",
            "emergency_contact_name",
            "emergency_contact_number",
            # address components
            "street_address",
            "suburb",
            "state",
            "postal_code",
            # extra profile meta
            "quick_snapshot",
            "max_hours",
            "key_strengths",
        ):
            value = form.get(field)
            if isinstance(value, UploadFile):
                continue
            if isinstance(value, str):
                value = value.strip()
                if value == "":
                    value = None
            payload_data[field] = value
        maybe_resume = form.get("resume")
        if isinstance(maybe_resume, UploadFile) and (maybe_resume.filename or "").strip():
            resume_file = maybe_resume

    if isinstance(payload_data, dict):
        for optional_field in ("mobile", "job_title", "address", "applied_on"):
            if payload_data.get(optional_field) == "":
                payload_data[optional_field] = None

    try:
        payload = CandidateCreate(**payload_data)
    except ValidationError as exc:
        return JSONResponse({"detail": exc.errors()}, status_code=422)

    # Prepare candidate data
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    email = str(payload.email)
    mobile = payload.mobile or ""
    job_title = payload.job_title or ""
    # Build address: prefer explicit fields if provided
    street = payload_data.get("street_address") or ""
    suburb = payload_data.get("suburb") or ""
    state = payload_data.get("state") or ""
    postal_code = payload_data.get("postal_code") or ""
    address = payload.address or ", ".join([part for part in (street, suburb, state, postal_code) if part])
    status = "Applied"
    applied_on = None

    if payload.applied_on:
        applied_on = datetime.combine(
            payload.applied_on,
            datetime.min.time(),
            tzinfo=timezone.utc,
        )

    # Only auto-link the new candidate to the logged-in user when they are
    # submitting their own information. Admins adding applicants should not
    # overwrite the candidate->user linkage with their own account.
    session_email = (session_user.get("email") or "").strip().lower()
    
    # Create a user account for the candidate if one doesn't exist
    temp_password = None
    user_id = None
    
    if email.lower() != session_email:
        # This is a new candidate (not the logged-in user submitting their own info)
        # Check if a user account already exists for this email
        existing_user = db.query(models.User).filter(models.User.email == email).first()
        if not existing_user:
            # Create a new user account for this candidate
            temp_password = secrets.token_urlsafe(8)
            username = email.split("@")[0]  # Use email prefix as username
            
            new_user = models.User(
                username=username,
                email=email,
                hashed_password=crud.get_password_hash(temp_password),
            )
            
            try:
                db.add(new_user)
                db.flush()
                user_id = new_user.id
            except IntegrityError:
                # Username might conflict, try with a suffix
                username = f"{username}_{secrets.token_hex(3)}"
                new_user.username = username
                db.add(new_user)
                db.flush()
                user_id = new_user.id
        else:
            user_id = existing_user.id
    else:
        user_id = session_user["id"]

    cand = models.Candidate(
        first_name=first_name,
        last_name=last_name,
        email=email,
        mobile=mobile,
        job_title=job_title,
        address=address or None,
        status=status,
        user_id=user_id,
        applied_on=applied_on,
    )

    try:
        db.add(cand)
        db.flush()
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            {"detail": "Email already exists for a candidate."}, status_code=409
        )

    saved_file_path: Path | None = None
    resume_uploaded = False
    try:
        # Ensure a profile object exists if profile fields are provided
        summary = payload_data.get("summary")
        skills = payload_data.get("skills")
        linkedin = payload_data.get("linkedin")
        # Extended profile fields
        date_of_birth = payload_data.get("date_of_birth")
        gender = payload_data.get("gender")
        emergency_contact_name = payload_data.get("emergency_contact_name")
        emergency_contact_number = payload_data.get("emergency_contact_number")
        quick_snapshot = payload_data.get("quick_snapshot")
        max_hours = payload_data.get("max_hours")
        key_strengths = payload_data.get("key_strengths")

        wants_profile = any(v for v in (summary, skills, linkedin, date_of_birth, gender, emergency_contact_name, emergency_contact_number, quick_snapshot, max_hours, key_strengths, address))
        if wants_profile:
            profile = (
                db.query(models.CandidateProfile)
                .filter(models.CandidateProfile.candidate_id == cand.id)
                .first()
            )
            if not profile:
                profile = models.CandidateProfile(candidate_id=cand.id)
            if summary is not None:
                profile.summary = summary
            if skills is not None:
                profile.skills = skills
            if linkedin is not None:
                profile.linkedin = linkedin
            # If we built a composite address above and it's not already set, save it on profile
            if address:
                profile.address = address
            # Merge extras JSON
            import json
            extras: dict = {}
            try:
                if profile.extras:
                    extras = json.loads(profile.extras) or {}
            except Exception:
                extras = {}
            def _put(k, v):
                if v is not None and v != "":
                    extras[k] = v
            _put("date_of_birth", date_of_birth)
            _put("gender", gender)
            _put("emergency_contact_name", emergency_contact_name)
            _put("emergency_contact_number", emergency_contact_number)
            _put("quick_snapshot", quick_snapshot)
            _put("max_hours", max_hours)
            _put("key_strengths", key_strengths)
            try:
                profile.extras = json.dumps(extras)
            except Exception:
                # fall back to None if serialization fails
                profile.extras = None
            db.add(profile)

        if resume_file and resume_file.filename:
            ext = Path(resume_file.filename).suffix or ".pdf"
            folder = UPLOAD_DIR / str(cand.id)
            folder.mkdir(parents=True, exist_ok=True)
            dest = folder / f"resume{ext}"
            saved_file_path = dest
            contents = await resume_file.read()
            with open(dest, "wb") as f:
                f.write(contents)

            relative_path = str(dest.relative_to(BASE_DIR))
            profile = (
                db.query(models.CandidateProfile)
                .filter(models.CandidateProfile.candidate_id == cand.id)
                .first()
            )
            if not profile:
                profile = models.CandidateProfile(candidate_id=cand.id)
            profile.resume_path = relative_path
            db.add(profile)
            resume_uploaded = True

        db.commit()
        db.refresh(cand)
        
        # Send appropriate email based on whether a new user account was created
        if temp_password:
            # New user account was created, send invite email with login credentials
            background_tasks.add_task(send_invite_email, cand.email, cand.first_name, temp_password)
        else:
            # Existing user or self-submission, send initial onboarding email
            background_tasks.add_task(send_initial_email, cand.email, cand.first_name)
            
    except Exception:
        db.rollback()
        if saved_file_path and saved_file_path.exists():
            saved_file_path.unlink(missing_ok=True)
        raise
    finally:
        if resume_file:
            try:
                await resume_file.close()
            except Exception:
                pass

    return JSONResponse(
        {"id": cand.id, "detail": "created", "resume_uploaded": resume_uploaded},
        status_code=201,
    )
