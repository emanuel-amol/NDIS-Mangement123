from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request, Form
from sqlalchemy.orm import Session
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse
from fastapi.templating import Jinja2Templates

from .. import schemas, crud, database, models
# NEW: import legacy_ctx & get_password_hash from crud for upgrade-on-login
from ..crud import legacy_ctx, get_password_hash

router = APIRouter(prefix="/auth", tags=["auth"])
BASE_DIR = Path(__file__).resolve().parent.parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# React app location
FRONTEND_DIST_DIR = BASE_DIR / "static" / "forms"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"

@router.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    # Redirect to the React app login route
    return RedirectResponse(url="/login", status_code=302)

@router.post("/login", response_class=HTMLResponse)
def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(database.get_db)
):
    db_user = crud.get_user_by_email(db, email=email)
    if not db_user or not crud.verify_password(password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # --- Upgrade legacy bcrypt to bcrypt_sha256 on successful login ---
    try:
        if legacy_ctx.identify(db_user.hashed_password) == "bcrypt":
            db_user.hashed_password = get_password_hash(password)
            db.add(db_user)
            db.commit()
    except Exception:
        # don't break login if upgrade fails
        pass

    # Save session
    request.session["user"] = {
        "id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
    }

    candidate = db.query(models.Candidate).filter(models.Candidate.user_id == db_user.id).first()
    if not candidate:
        candidate = db.query(models.Candidate).filter(models.Candidate.email == db_user.email).first()

    # Redirect to the React dashboard
    return RedirectResponse(url="/", status_code=303)

@router.get("/register", response_class=HTMLResponse)
def register_form(request: Request):
    # Redirect to the React app register route
    return RedirectResponse(url="/register", status_code=302)

@router.post("/register", response_class=HTMLResponse)
def register(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(database.get_db)
):
    existing_user = crud.get_user_by_email(db, email=email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_data = schemas.UserCreate(username=username, email=email, password=password)
    db_user = crud.create_user(db, user_data)

    cand = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if not cand:
        cand = models.Candidate(
            first_name="", last_name="", email=email, job_title="", mobile="",
            status="Applied", user_id=db_user.id
        )
        db.add(cand)
        db.commit()
    else:
        updated = False
        if not cand.user_id:
            cand.user_id = db_user.id; updated = True
        if not cand.status:
            cand.status = "Applied"; updated = True
        if updated:
            db.add(cand); db.commit()

    request.session["user"] = {
        "id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
    }
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "user": db_user, "candidate": cand}
    )

@router.get("/logout")
@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/", status_code=303)
