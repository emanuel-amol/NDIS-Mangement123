from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session
from passlib.context import CryptContext
import json

from . import models, schemas
# Shared helpers for user/candidate management stay in one module so routes and services call the same logic.

def create_candidate(db: Session, candidate: schemas.CandidateCreate, user_id: int | None = None) -> models.Candidate:
    db_candidate = models.Candidate(
        first_name=candidate.first_name,
        last_name=candidate.last_name,
        email=str(candidate.email),
        mobile=candidate.mobile,
        job_title=candidate.job_title,
        address=candidate.address,
        status="Applied",
        user_id=user_id
    )
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    return db_candidate

def get_candidate(db: Session, candidate_id: int) -> Optional[models.Candidate]:
    return db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()

def get_candidates(db: Session, skip: int = 0, limit: int = 10) -> list[models.Candidate]:
    return db.query(models.Candidate).offset(skip).limit(limit).all()

pwd_context = CryptContext(
    # Default to pbkdf2_sha256 for new hashes (pure-Python, no 72-byte limit)
    schemes=['pbkdf2_sha256', 'bcrypt_sha256'],
    default='pbkdf2_sha256',
    deprecated='auto',
)
legacy_ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')

# No warmup needed with pbkdf2_sha256 as default; bcrypt backends will only
# be touched when verifying existing bcrypt* hashes.

MAX_PW_LEN = 512
BCRYPT_MAX_BYTES = 72

def get_password_hash(password: str) -> str:
    if isinstance(password, bytes):
        password = password.decode('utf-8', errors='ignore')
    # Protect underlying bcrypt implementations that enforce a 72-byte limit.
    # passlib's bcrypt_sha256 normally avoids the 72-byte issue by pre-hashing,
    # but some environments/backends run a detection routine that may pass the
    # raw secret into a bcrypt implementation which will raise. To be defensive
    # we truncate the raw bytes to 72 bytes before handing to passlib.
    if len(password) > MAX_PW_LEN:
        raise ValueError('Password too long')

    try:
        raw = password.encode('utf-8')
    except Exception:
        raw = password.encode('utf-8', errors='ignore')

    # With pbkdf2_sha256 as default, explicitly select it to avoid any
    # backend probing of bcrypt on some environments.
    return pwd_context.hash(password, scheme='pbkdf2_sha256')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if isinstance(plain_password, bytes):
        plain_password = plain_password.decode('utf-8', errors='ignore')
    if len(plain_password) > MAX_PW_LEN:
        return False
    # First, try the main context (supports pbkdf2_sha256 & bcrypt_sha256)
    try:
        identified = pwd_context.identify(hashed_password)
        if identified:
            try:
                return pwd_context.verify(plain_password, hashed_password)
            except ValueError:
                # For bcrypt_sha256, retry with truncated secret if backend complains
                if identified == 'bcrypt_sha256':
                    try:
                        return pwd_context.verify(plain_password[:BCRYPT_MAX_BYTES], hashed_password)
                    except Exception:
                        pass
    except Exception:
        pass

    # Fallback: legacy pure bcrypt hashes
    if legacy_ctx.identify(hashed_password) == 'bcrypt':
        try:
            return legacy_ctx.verify(plain_password, hashed_password)
        except ValueError:
            return legacy_ctx.verify(plain_password[:72], hashed_password)
    return False

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    hashed = get_password_hash(user_in.password)
    # Bootstrap: if this is the very first user in an empty database,
    # assign them the 'admin' role so they can configure the system.
    is_first_user = db.query(models.User.id).first() is None
    assign_role = "admin" if is_first_user else "user"
    db_user = models.User(
        username=user_in.username.strip(),
        email=str(user_in.email),
        hashed_password=hashed,
        role=assign_role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_candidate_by_user(db: Session, *, user_id: int) -> Optional[models.Candidate]:
    return db.query(models.Candidate).filter(models.Candidate.user_id == user_id).first()

def get_profile(db: Session, candidate_id: int) -> Optional[models.CandidateProfile]:
    return db.query(models.CandidateProfile).filter(models.CandidateProfile.candidate_id == candidate_id).first()

def get_or_create_profile(db: Session, candidate_id: int) -> models.CandidateProfile:
    profile = get_profile(db, candidate_id)
    if profile:
        return profile
    profile = models.CandidateProfile(candidate_id=candidate_id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

def update_profile(db: Session, candidate_id: int, update: schemas.CandidateProfileUpdate) -> models.CandidateProfile:
    profile = get_or_create_profile(db, candidate_id)
    data = update.model_dump(exclude_unset=True)
    # Normalize extras: accept dict and store as JSON text
    if 'extras' in data:
        extras_val = data.get('extras')
        if isinstance(extras_val, dict):
            try:
                data['extras'] = json.dumps(extras_val)
            except Exception:
                data['extras'] = None
        elif extras_val is None:
            data['extras'] = None
    for field, value in data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(profile, field, value)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

def set_profile_file(db: Session, candidate_id: int, kind: str, path: str) -> None:
    profile = get_or_create_profile(db, candidate_id)
    normalized = 'photo' if kind == 'picture' else kind
    if normalized == 'resume':
        profile.resume_path = path
    elif normalized == 'photo':
        profile.photo_path = path
    else:
        raise ValueError('Unsupported profile asset kind')
    db.add(profile)
    db.commit()


def clear_profile_file(db: Session, candidate_id: int, kind: str) -> None:
    """Clear the saved profile file path for a candidate (resume or photo)."""
    profile = get_or_create_profile(db, candidate_id)
    normalized = 'photo' if kind == 'picture' else kind
    if normalized == 'resume':
        profile.resume_path = None
    elif normalized == 'photo':
        profile.photo_path = None
    else:
        raise ValueError('Unsupported profile asset kind')
    db.add(profile)
    db.commit()


# -----------------------------
# Notes stored in CandidateProfile.extras (JSON text)
# -----------------------------
def _load_extras(profile: models.CandidateProfile) -> dict:
    try:
        if profile.extras:
            return json.loads(profile.extras)
    except Exception:
        return {}
    return {}


def get_notes(db: Session, candidate_id: int) -> dict:
    profile = get_or_create_profile(db, candidate_id)
    extras = _load_extras(profile)
    return {
        "general_notes": extras.get("general_notes", ""),
        "interview_notes": extras.get("interview_notes", ""),
    }


def update_notes(
    db: Session,
    candidate_id: int,
    *,
    general_notes: str | None = None,
    interview_notes: str | None = None,
) -> dict:
    profile = get_or_create_profile(db, candidate_id)
    extras = _load_extras(profile)
    if general_notes is not None:
        extras["general_notes"] = general_notes
    if interview_notes is not None:
        extras["interview_notes"] = interview_notes
    try:
        profile.extras = json.dumps(extras)
    except Exception:
        profile.extras = None
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return {
        "general_notes": extras.get("general_notes", ""),
        "interview_notes": extras.get("interview_notes", ""),
    }


# -----------------------------
# Assessment stored in CandidateProfile.extras (JSON text)
# Key: "assessment" -> dict
# -----------------------------
def get_assessment(db: Session, candidate_id: int) -> dict:
    profile = get_or_create_profile(db, candidate_id)
    extras = _load_extras(profile)
    return extras.get("assessment", {}) or {}


def update_assessment(
    db: Session,
    candidate_id: int,
    payload: dict,
) -> dict:
    profile = get_or_create_profile(db, candidate_id)
    extras = _load_extras(profile)
    current = extras.get("assessment", {}) or {}
    # shallow merge incoming fields
    current.update({k: v for k, v in payload.items() if v is not None})
    extras["assessment"] = current
    try:
        profile.extras = json.dumps(extras)
    except Exception:
        profile.extras = None
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return current


# -----------------------------
# References stored in CandidateProfile.extras (JSON text)
# Structure: { references: { token: { referee_name, referee_email, submitted_at?, data? } } }
# -----------------------------
def _get_refs_map(profile: models.CandidateProfile) -> dict:
    extras = _load_extras(profile)
    refs = extras.get("references") or {}
    if not isinstance(refs, dict):
        refs = {}
    return refs


def create_reference_invite(db: Session, candidate_id: int, *, token: str, referee_name: str, referee_email: str) -> dict:
    profile = get_or_create_profile(db, candidate_id)
    extras = _load_extras(profile)
    refs = _get_refs_map(profile)
    refs[token] = {
        "referee_name": referee_name,
        "referee_email": referee_email,
        "submitted_at": None,
        "data": None,
    }
    extras["references"] = refs
    try:
        profile.extras = json.dumps(extras)
    except Exception:
        profile.extras = None
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return refs[token]


def get_reference_by_token(db: Session, token: str) -> tuple[models.Candidate, models.CandidateProfile, dict] | None:
    # naive scan: tokens are few; optimize later if needed
    profs = db.query(models.CandidateProfile).all()
    for prof in profs:
        try:
            extras = _load_extras(prof)
            refs = extras.get("references") or {}
            if token in refs:
                cand = db.query(models.Candidate).filter(models.Candidate.id == prof.candidate_id).first()
                return cand, prof, refs[token]
        except Exception:
            continue
    return None


def submit_reference(db: Session, token: str, *, relationship: str | None, comments: str | None, recommend: bool | None) -> bool:
    found = get_reference_by_token(db, token)
    if not found:
        return False
    cand, prof, entry = found
    extras = _load_extras(prof)
    refs = extras.get("references") or {}
    entry.update({
        "submitted_at": int(__import__("time").time()),
        "data": {
            "relationship": relationship,
            "comments": comments,
            "recommend": bool(recommend) if recommend is not None else None,
        },
    })
    refs[token] = entry
    extras["references"] = refs
    try:
        prof.extras = json.dumps(extras)
    except Exception:
        prof.extras = None
    db.add(prof)
    db.commit()
    return True


def list_references_for_candidate(db: Session, candidate_id: int) -> list[dict]:
    profile = get_or_create_profile(db, candidate_id)
    extras = _load_extras(profile)
    refs = extras.get("references") or {}
    results: list[dict] = []
    for token, entry in refs.items():
        data = entry.get("data") or {}
        results.append({
            "token": token,
            "referee_name": entry.get("referee_name") or "",
            "referee_email": entry.get("referee_email") or "",
            "status": "submitted" if entry.get("submitted_at") else "pending",
            "submitted_at": entry.get("submitted_at"),
            "relationship": data.get("relationship"),
            "comments": data.get("comments"),
            "recommend": data.get("recommend"),
        })
    return results


def delete_reference(db: Session, candidate_id: int, token: str) -> bool:
    profile = get_or_create_profile(db, candidate_id)
    extras = _load_extras(profile)
    refs = extras.get("references") or {}
    if token in refs:
        try:
            del refs[token]
        except Exception:
            return False
        extras["references"] = refs
        try:
            profile.extras = json.dumps(extras)
        except Exception:
            profile.extras = None
        db.add(profile)
        db.commit()
        return True
    return False

