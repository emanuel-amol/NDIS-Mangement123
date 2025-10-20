"""Utilities that power the admin dashboards and their API counterparts."""
from __future__ import annotations

from dataclasses import dataclass
import secrets
from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional

from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud, models

# Buckets that determine whether a candidate should appear in the Workers view.
WORKER_STATUSES = {"Hired", "Employee", "Active"}
APPLICANT_STATUSES_EXCLUDE = WORKER_STATUSES


class UserAlreadyExistsError(Exception):
    """Raised when attempting to create a user with a duplicate username or email."""

    def __init__(self) -> None:
        super().__init__("Username or email already exists")


def create_user_and_candidate(
    db: Session,
    *,
    username: str,
    email: str,
    first_name: str = "",
    last_name: str = "",
    job_title: str = "",
    mobile: str = "",
    status: str = "Applied",
    address: str = "",
) -> tuple[models.User, models.Candidate, str]:
    """Create a user and candidate pair mirroring the legacy admin form logic."""

    normalized_username = (username or "").strip()
    normalized_email = (email or "").strip()
    if not normalized_username or not normalized_email:
        raise ValueError("Username and email are required")

    existing = (
        db.query(models.User)
        .filter(
            or_(
                models.User.username == normalized_username,
                models.User.email == normalized_email,
            )
        )
        .first()
    )
    if existing:
        raise UserAlreadyExistsError()

    temp_password = secrets.token_urlsafe(8)
    hashed = crud.get_password_hash(temp_password)

    user = models.User(
        username=normalized_username,
        email=normalized_email,
        hashed_password=hashed,
    )

    try:
        db.add(user)
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise UserAlreadyExistsError() from exc

    first = (first_name or "").strip()
    last = (last_name or "").strip()
    mobile_value = (mobile or "").strip()
    job_value = (job_title or "").strip()
    address_value = (address or "").strip()
    status_value = (status or "Applied").strip() or "Applied"

    candidate = models.Candidate(
        first_name=first,
        last_name=last,
        email=normalized_email,
        mobile=mobile_value,
        job_title=job_value,
        address=address_value or None,
        status=status_value,
        user_id=user.id,
    )

    try:
        db.add(candidate)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise UserAlreadyExistsError() from exc

    db.refresh(user)
    db.refresh(candidate)
    return user, candidate, temp_password


@dataclass(slots=True)
class WorkerQueryFilters:
    """Normalized filters that were applied to the worker query."""

    role: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    q: Optional[str] = None


@dataclass(slots=True)
class WorkerQueryResult:
    """Envelope returned to both the HTML template and JSON layer."""

    users: list[models.User]
    user_candidates: dict[int, models.Candidate]
    filters: WorkerQueryFilters
    roles: list[str]
    status_options: list[str]


def _parse_iso_to_utc(raw: Optional[str]) -> Optional[datetime]:
    """Parse an ISO8601 date string and normalize it to UTC midnight."""

    if not raw:
        return None

    try:
        value = datetime.fromisoformat(raw)
    except ValueError:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)

    return value


def get_dashboard_metrics(db: Session) -> dict[str, int]:
    """Return high-level counts for HRM dashboard.

    candidates -> Applicants (non-worker candidates)
    users      -> Workers (candidates in WORKER_STATUSES)
    training   -> Placeholder until training records exist
    """

    workers = (
        db.query(models.Candidate)
        .filter(models.Candidate.status.in_(WORKER_STATUSES))
        .count()
    )
    applicants = (
        db.query(models.Candidate)
        .filter(~models.Candidate.status.in_(WORKER_STATUSES))
        .count()
    )

    return {
        "candidates": applicants,
        "users": workers,
        "training": 0,
    }


def fetch_candidates_with_profiles(
    db: Session,
) -> list[tuple[models.Candidate, Optional[models.CandidateProfile]]]:
    """Fetch all candidates plus their attached profiles in a single query."""

    rows = (
        db.query(models.Candidate, models.CandidateProfile)
        .outerjoin(
            models.CandidateProfile,
            models.CandidateProfile.candidate_id == models.Candidate.id,
        )
        .order_by(models.Candidate.applied_on.desc())
        .all()
    )
    return rows


def query_worker_users(
    db: Session,
    *,
    role: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
) -> WorkerQueryResult:
    """Return the list of worker users subject to dashboard filters."""

    cand_filters: list = [models.Candidate.status.in_(WORKER_STATUSES)]

    normalized_role = (role or "").strip() or None
    normalized_status = (status or "").strip() or None

    if normalized_status:
        cand_filters = [models.Candidate.status == normalized_status]
    if normalized_role:
        cand_filters.append(models.Candidate.job_title == normalized_role)

    start_dt = _parse_iso_to_utc(date_from)
    end_dt = _parse_iso_to_utc(date_to)

    if start_dt:
        cand_filters.append(models.Candidate.applied_on >= start_dt)
    if end_dt:
        cand_filters.append(
            models.Candidate.applied_on < (end_dt + timedelta(days=1))
        )

    normalized_q = (q or "").strip() or None
    if normalized_q:
        like = f"%{normalized_q}%"
        cand_filters.append(
            or_(
                models.Candidate.first_name.ilike(like),
                models.Candidate.last_name.ilike(like),
                models.Candidate.email.ilike(like),
                models.Candidate.mobile.ilike(like),
                models.User.username.ilike(like),
                models.User.email.ilike(like),
            )
        )

    rows: list[tuple[models.User, models.Candidate]] = (
        db.query(models.User, models.Candidate)
        .join(models.Candidate, models.Candidate.user_id == models.User.id)
        .filter(*cand_filters)
        .order_by(func.lower(models.User.username))
        .all()
    )

    users = [user for user, _ in rows]
    user_candidates = {user.id: candidate for user, candidate in rows}

    roles_query: Iterable[tuple[str]] = (
        db.query(models.Candidate.job_title)
        .filter(models.Candidate.status.in_(WORKER_STATUSES))
        .filter(models.Candidate.job_title.isnot(None))
        .distinct()
        .all()
    )
    roles = [role for (role,) in roles_query if role]
    roles.sort(key=lambda value: value.lower())

    filters = WorkerQueryFilters(
        role=normalized_role,
        status=normalized_status,
        date_from=date_from,
        date_to=date_to,
        q=normalized_q,
    )

    return WorkerQueryResult(
        users=users,
        user_candidates=user_candidates,
        filters=filters,
        roles=roles,
        status_options=sorted(WORKER_STATUSES),
    )


from datetime import datetime, timedelta
from sqlalchemy import or_

def _parse_date(s: str | None):
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except ValueError:
        return None

def list_applicants(
    db: Session,
    role: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    q: str | None = None,
):
    """Return candidates in an applicant state, with optional filters."""
    query = (
        db.query(models.Candidate)
        .filter(~models.Candidate.status.in_(APPLICANT_STATUSES_EXCLUDE))
    )

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

    return query.order_by(
        models.Candidate.applied_on.desc().nullslast(),
        models.Candidate.id.desc()
    ).all()


def convert_applicant_to_worker(db: Session, candidate: models.Candidate) -> None:
    """Promote an applicant to the default worker status."""
    candidate.status = "Hired"
    db.add(candidate)
    db.commit()





