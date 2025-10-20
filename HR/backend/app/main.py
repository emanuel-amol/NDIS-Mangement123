# =========================
# Imports
# =========================
from pathlib import Path
import secrets, hashlib

from fastapi import FastAPI, Request, Depends, Form, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse
from fastapi.templating import Jinja2Templates
from fastapi import HTTPException
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from pydantic import EmailStr
from typing import Optional

from app import models
from app import crud
from app.services.mailer import send_invite_email
from app.database import Base, engine, get_db
from app.routers import candidates as candidates_router
from app.routers import portal as portal_router
from app.routers import auth as auth_router
from app.routers import api as api_router
from app.routers import dashboard as dashboard_router
from app.services import admin as admin_service


# =========================
# App Setup & Configuration
# =========================
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Candidate Intake API")

# Static & uploads (absolute paths)
BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
app.add_middleware(SessionMiddleware, secret_key="super-secret-key")

FRONTEND_DIST_DIR = BASE_DIR / "static" / "forms"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
app.mount("/uploads", StaticFiles(directory=str(BASE_DIR / "uploads")), name="uploads")

# Status buckets used by Applicants/Workers views (shared with the API layer)
WORKER_STATUSES = admin_service.WORKER_STATUSES
APPLICANT_STATUSES_EXCLUDE = admin_service.APPLICANT_STATUSES_EXCLUDE


# =========================
# Public / Authenticated Landing
# =========================
@app.get("/", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db)):
    user_session = request.session.get("user")
    if not user_session:
        return RedirectResponse(url="/login", status_code=303)

    # Serve the React Dashboard app
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE, media_type="text/html")
    
    # Fallback to HTML template if React app not available
    db_user = db.query(models.User).filter(models.User.id == user_session["id"]).first()
    if not db_user:
        return RedirectResponse(url="/login", status_code=303)
        
    candidate = db.query(models.Candidate).filter(models.Candidate.user_id == db_user.id).first()
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "user": db_user, "candidate": candidate},
    )

# =========================
# Public Reference Form (SPA)
# =========================
@app.get("/reference/{token}", response_class=HTMLResponse)
def public_reference_form(token: str, request: Request):
    # Always serve the React app; the SPA will fetch `/api/v1/reference/{token}`
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE, media_type="text/html")
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/reference/submit", response_class=HTMLResponse)
def public_reference_submit_legacy(token: Optional[str] = None):
    # Backward compatibility: redirect old links like /reference/submit?token=...
    if token:
        return RedirectResponse(url=f"/reference/{token}", status_code=307)
    # If no token, redirect to login/home
    return RedirectResponse(url="/", status_code=302)

# =========================
# Auth Routes (React App)
# =========================
@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    # Serve the React app for login
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE, media_type="text/html")
    return RedirectResponse(url="/auth/login", status_code=302)

@app.get("/register", response_class=HTMLResponse)
def register_page(request: Request):
    # Serve the React app for register
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE, media_type="text/html")
    return RedirectResponse(url="/auth/register", status_code=302)

#
# Candidate Form (Single Page App)
#
@app.get("/candidate-form", response_class=HTMLResponse) 
def candidate_form(request: Request):
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE, media_type="text/html")
    return templates.TemplateResponse("index.html", {"request": request})


# =========================
# Admin: Dashboard
# =========================
@app.get("/admin", response_class=HTMLResponse)
def admin_dashboard(request: Request):
    # Serve the React app for the dashboard
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE, media_type="text/html")
    return templates.TemplateResponse("admin_dashboard.html", {"request": request})


# =========================
# Admin: Candidates (raw list)
# =========================
#
# Note: this is a raw list of all candidates, without filters or pagination.
# Use /admin/applicants to see the filtered list of applicants.
#
@app.get("/admin/candidates", response_class=HTMLResponse)
def list_candidates(request: Request, db: Session = Depends(get_db)):
    rows = admin_service.fetch_candidates_with_profiles(db)
    candidates = [candidate for candidate, _ in rows]
    resume_paths = {
        candidate.id: profile.resume_path if profile else None
        for candidate, profile in rows
    }

    return templates.TemplateResponse(
        "candidates.html",
        {
            "request": request,
            "candidates": candidates,
            "resume_paths": resume_paths,
        },
    )


# =========================
# Admin: Workers (Users with worker-status Candidate) + Filters
# =========================
# Note: this is the "Employees" view in the UI
#=========================

@app.get("/admin/users", response_class=HTMLResponse)
def list_users(request: Request, db: Session = Depends(get_db)):
    # Serve the React SPA if built so the Workers list renders client-side.
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE, media_type="text/html")

    role = (request.query_params.get("role") or "").strip()
    status = (request.query_params.get("status") or "").strip()
    date_from = (request.query_params.get("date_from") or "").strip()
    date_to = (request.query_params.get("date_to") or "").strip()
    q = (request.query_params.get("q") or "").strip()

    result = admin_service.query_worker_users(
        db,
        role=role or None,
        status=status or None,
        date_from=date_from or None,
        date_to=date_to or None,
        q=q or None,
    )

    flash = request.session.pop("flash", None)
    return templates.TemplateResponse(
        "users.html",
        {
            "request": request,
            "users": result.users,
            "user_candidates": result.user_candidates,
            "flash": flash,

            # filter state/choices
            "roles": result.roles,
            "status_options": result.status_options,
            "role": role,
            "status": status,
            "date_from": date_from,
            "date_to": date_to,
            "q": q,
        },
    )


# Alias: keep old /admin/staffs working (redirect to canonical /admin/users)
@app.get("/admin/staffs")
def list_staffs_redirect():
    return RedirectResponse(url="/admin/users", status_code=307)


# =========================
# Admin: Training / Assessments / Mixed Views
# =========================
@app.get("/admin/training", response_class=HTMLResponse)
def list_training(request: Request):
    training = []
    return templates.TemplateResponse("training_list.html", {"request": request, "training": training})

#
# Candidate Assessment (placeholder)
#
@app.get("/admin/candidate-assessment", response_class=HTMLResponse)
def candidate_assessment(request: Request):
    return templates.TemplateResponse("candidate_assessment.html", {"request": request})

# 
# Admin: Candidates + Users (raw list)
# 
@app.get("/admin/candidates-users", response_class=HTMLResponse)
def list_candidates_users(request: Request, db: Session = Depends(get_db)):
    candidates = db.query(models.Candidate).all()
    users = db.query(models.User).all()
    return templates.TemplateResponse(
        "candidates_users.html",
        {"request": request, "candidates": candidates, "users": users},
    )

## New Achived Users View
# =========================
# Admin: Archived Workers
# =========================
@app.get("/admin/users/archived", response_class=HTMLResponse)
def list_archived_users(request: Request, db: Session = Depends(get_db)):
    # simple view showing users whose linked candidate has status 'Archived'
    rows = (
        db.query(models.User, models.Candidate)
        .join(models.Candidate, models.Candidate.user_id == models.User.id)
        .filter(models.Candidate.status == "Archived")
        .order_by(models.User.username)
        .all()
    )

    users = [user for user, _ in rows]
    user_candidates = {user.id: candidate for user, candidate in rows}

    flash = request.session.pop("flash", None)
    return templates.TemplateResponse(
        "archived_users.html",
        {
            "request": request,
            "users": users,
            "user_candidates": user_candidates,
            "flash": flash,
        },
    )


# =========================
# Admin: Add Employee (create User + Candidate)
# =========================
@app.get("/admin/users/new", response_class=HTMLResponse)
def new_user_form(request: Request):
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE, media_type="text/html")
    return templates.TemplateResponse("user_new.html", {"request": request})

@app.post("/admin/users/new", response_class=HTMLResponse)
def create_user_and_candidate(
    request: Request,
    background_tasks: BackgroundTasks,
    username: str = Form(...),
    email: EmailStr = Form(...),
    first_name: str = Form(""),
    last_name: str = Form(""),
    job_title: str = Form(""),
    mobile: str = Form(""),
    status: str = Form("Applied"),
    db: Session = Depends(get_db),
):
    try:
        user, candidate, temp_password = admin_service.create_user_and_candidate(
            db,
            username=username,
            email=email,
            first_name=first_name or "",
            last_name=last_name or "",
            job_title=job_title or "",
            mobile=mobile or "",
            status=status or "Applied",
        )
    except admin_service.UserAlreadyExistsError:
        return templates.TemplateResponse(
            "user_new.html",
            {"request": request, "error": "Username or email already exists."},
            status_code=400,
        )
    except ValueError as exc:
        return templates.TemplateResponse(
            "user_new.html",
            {"request": request, "error": str(exc)},
            status_code=400,
        )

    # Send invitation email in background if we have an email address
    if candidate and candidate.email:
        background_tasks.add_task(send_invite_email, candidate.email, candidate.first_name or "", temp_password)

    request.session["flash"] = f"User created. Temporary password: {temp_password}"
    return RedirectResponse(url="/admin/users", status_code=303)


# =========================
# Admin: Archive / Delete User
# =========================
@app.post("/admin/users/{user_id}/archive", response_class=HTMLResponse)
def archive_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        request.session["flash"] = "User not found."
        return RedirectResponse(url="/admin/users", status_code=303)

    # Find candidate linked to this user
    cand = db.query(models.Candidate).filter(models.Candidate.user_id == user.id).first()
    if not cand:
        request.session["flash"] = "No candidate linked to this user to archive."
        return RedirectResponse(url="/admin/users", status_code=303)

    cand.status = "Archived"
    db.add(cand)
    db.commit()
    request.session["flash"] = f"Archived user {user.username}."
    return RedirectResponse(url="/admin/users", status_code=303)


@app.post("/admin/users/{user_id}/unarchive", response_class=HTMLResponse)
def unarchive_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        request.session["flash"] = "User not found."
        return RedirectResponse(url="/admin/users/archived", status_code=303)

    # Find candidate linked to this user
    cand = db.query(models.Candidate).filter(models.Candidate.user_id == user.id).first()
    if not cand:
        request.session["flash"] = "No candidate linked to this user to unarchive."
        return RedirectResponse(url="/admin/users/archived", status_code=303)

    # Restore to a default worker status
    cand.status = "Hired"
    db.add(cand)
    db.commit()
    request.session["flash"] = f"Unarchived user {user.username}."
    return RedirectResponse(url="/admin/users/archived", status_code=303)

#========================
# Admin: Delete User
#========================
@app.post("/admin/users/{user_id}/delete", response_class=HTMLResponse)
def delete_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        request.session["flash"] = "User not found."
        return RedirectResponse(url="/admin/users", status_code=303)

    # delete the user which should cascade to candidates/profiles per relationship config
    db.delete(user)
    db.commit()
    request.session["flash"] = f"Deleted user {user.username}."
    return RedirectResponse(url="/admin/users", status_code=303)



# =========================
# Admin: Applicants (list + convert)
# =========================
@app.get("/admin/applicants", response_class=HTMLResponse)
def list_applicants(
    request: Request,
    role: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    # Serve the React SPA if built so the Applicants list renders client-side.
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE, media_type="text/html")

    # Delegate to the admin service which understands applicant filters
    applicants = admin_service.list_applicants(db, role=role, status=status, date_from=date_from, date_to=date_to, q=q)

    # Options used to populate the selects in the template
    roles = [r for (r,) in db.query(models.Candidate.job_title).distinct().all() if r]
    status_options = [s for (s,) in db.query(models.Candidate.status).distinct().all() if s]

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
            "flash": flash,
        },
    )

@app.get("/admin/applicants/{candidate_id}/profile")
def ensure_profile_and_open(candidate_id: int, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    cand = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # ensure linked user (reuse by id/email, else create)
    user = db.query(models.User).filter(models.User.id == cand.user_id).first() if cand.user_id else None
    if not user and cand.email:
        user = db.query(models.User).filter(models.User.email == cand.email).first()

    if not user:
        base_username = (
            cand.email.split("@")[0] if cand.email and "@" in cand.email
            else f"{(cand.first_name or '').lower()}.{(cand.last_name or '').lower()}".strip(".")
        ) or f"user{cand.id}"

        # ensure unique username
        username = base_username
        i = 1
        while db.query(models.User).filter(models.User.username == username).first():
            i += 1
            username = f"{base_username}{i}"
        temp_password = secrets.token_urlsafe(8)
        hashed = crud.get_password_hash(temp_password)

        user = models.User(
            username=username,
            email=cand.email or f"{username}@example.com",
            hashed_password=hashed,
        )
        db.add(user)
        db.flush()           # get user.id
        cand.user_id = user.id
        db.add(cand)
        db.commit()

        # send invite email in background if we have an email
        if cand.email:
            background_tasks.add_task(send_invite_email, cand.email, cand.first_name or "", temp_password)

        request.session["flash"] = f"Created user '{username}'. Temporary password: {temp_password}"

    return RedirectResponse(url=f"/portal/profile/admin/{user.id}", status_code=303)

@app.post("/admin/applicants/{candidate_id}/convert", response_class=HTMLResponse)
def convert_applicant_to_worker(candidate_id: int, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    cand = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not cand:
        request.session["flash"] = "Candidate not found."
        return RedirectResponse(url="/admin/applicants", status_code=303)

    # Ensure the candidate has a linked user
    user = None
    if cand.user_id:
        user = db.query(models.User).filter(models.User.id == cand.user_id).first()

    if not user:
        # Try to reuse existing user by email
        if cand.email:
            user = db.query(models.User).filter(models.User.email == cand.email).first()

        if not user:
            # Create a new user
            base_username = (
                cand.email.split("@")[0] if cand.email and "@" in cand.email
                else f"{(cand.first_name or '').lower()}.{(cand.last_name or '').lower()}".strip(".")
            ) or f"user{cand.id}"

            # Ensure unique username
            username = base_username
            i = 1
            while db.query(models.User).filter(models.User.username == username).first():
                i += 1
                username = f"{base_username}{i}"

            temp_password = secrets.token_urlsafe(8)
            hashed = crud.get_password_hash(temp_password)

            user = models.User(
                username=username,
                email=cand.email or f"{username}@example.com",
                hashed_password=hashed,
            )
            db.add(user)
            db.flush()  # get user.id without a full commit yet
            # send invite email in background
            if cand.email:
                background_tasks.add_task(send_invite_email, cand.email, cand.first_name or "", temp_password)
            # Show the temp password once
            request.session["flash"] = f"Created user '{username}'. Temporary password: {temp_password}"

        cand.user_id = user.id  # link candidate -> user

    # Mark as worker via the shared service (handles status + commit)
    admin_service.convert_applicant_to_worker(db, cand)

    # If user already existed and we didn't set flash above, show a generic message
    if "flash" not in request.session:
        full_name = f"{cand.first_name or ''} {cand.last_name or ''}".strip() or "Candidate"
        request.session["flash"] = f"{full_name} moved to Workers."

    return RedirectResponse(url="/admin/users", status_code=303)


@app.get("/ping")
def ping():
    return {"ok": True}

# =========================
# Routers
# =========================
app.include_router(candidates_router.router)
app.include_router(auth_router.router)
app.include_router(portal_router.router)
app.include_router(api_router.router)
app.include_router(dashboard_router.router, prefix="/api/v1/dashboard", tags=["dashboard"])

