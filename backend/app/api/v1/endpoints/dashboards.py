from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.care_plan import CarePlan, ProspectiveWorkflow, RiskAssessment
from app.models.document import Document, DocumentCategory
from app.models.participant import Participant, ParticipantStatus
from app.models.quotation import Quotation
from app.models.roster import Roster, RosterParticipant
from app.models.user import User
from app.security.deps import get_current_user, require_roles
from app.services.document_service import DocumentService

router = APIRouter(tags=["dashboards"])


def _format_time_range(start_time, end_time) -> str:
    """Format a time range for display."""
    start = start_time.strftime("%H:%M")
    end = end_time.strftime("%H:%M")
    return f"{start} - {end}"


def _calculate_hours(roster: Roster) -> float:
    """Calculate the duration of a roster in hours."""
    start_dt = datetime.combine(roster.support_date, roster.start_time)
    end_dt = datetime.combine(roster.support_date, roster.end_time)
    return max(0.0, (end_dt - start_dt).total_seconds() / 3600)


def _first_datetime(*values: Optional[datetime]) -> Optional[datetime]:
    """Return the first non-null datetime from the provided values."""
    for value in values:
        if isinstance(value, datetime):
            return value
    return None


def _to_iso(value: Optional[datetime]) -> Optional[str]:
    """Convert a datetime to ISO-8601 string when present."""
    if not isinstance(value, datetime):
        return None
    return value.isoformat()


def _timestamp_score(value: Optional[datetime]) -> float:
    """Provide a sortable timestamp value, handling naive and aware datetimes."""
    if not isinstance(value, datetime):
        return float("-inf")
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.timestamp()


def _participant_display(participant: Optional[Participant], fallback_id: Optional[int]) -> str:
    """Return a friendly participant label even when the relationship is missing."""
    if participant:
        return participant.full_name
    if fallback_id:
        return f"Participant {fallback_id}"
    return "Unknown Participant"


def _workflow_outstanding_summary(workflow: ProspectiveWorkflow) -> str:
    """Describe outstanding workflow items for waiting lists."""
    outstanding: List[str] = []
    if not workflow.care_plan_completed:
        outstanding.append("care plan")
    if not workflow.risk_assessment_completed:
        outstanding.append("risk assessment")
    if not workflow.quotation_generated:
        outstanding.append("quotation")
    if not workflow.documents_generated:
        outstanding.append("documents")
    if not outstanding:
        return "Awaiting manager decision"
    if len(outstanding) == 1:
        return f"Pending {outstanding[0]} completion"
    return f"Pending {' and '.join(outstanding)} completion"


@router.get("/manager/recently-onboarded")
def manager_recently_onboarded(
    days: int = 7,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("SERVICE_MANAGER")),
):
    """Return participants who were onboarded within the last `days`."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    records: List[Tuple[Participant, Optional[ProspectiveWorkflow]]] = (
        db.query(Participant, ProspectiveWorkflow)
        .outerjoin(
            ProspectiveWorkflow,
            ProspectiveWorkflow.participant_id == Participant.id,
        )
        .filter(
            Participant.status == ParticipantStatus.onboarded,
            Participant.created_at >= cutoff,
        )
        .order_by(Participant.created_at.desc())
        .limit(25)
        .all()
    )

    return [
        {
            "participant_id": participant.id,
            "participant": participant.full_name,
            "date": participant.created_at.isoformat() if participant.created_at else None,
            "manager": workflow.manager_reviewed_by if workflow else None,
        }
        for participant, workflow in records
    ]


@router.get("/provider/summary")
def provider_summary(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Aggregate headline metrics for the provider dashboard."""
    prospective = (
        db.query(func.count(Participant.id))
        .filter(Participant.status == ParticipantStatus.prospective)
        .scalar()
        or 0
    )

    plans_ready = (
        db.query(func.count(ProspectiveWorkflow.id))
        .filter(
            ProspectiveWorkflow.care_plan_completed.is_(True),
            ProspectiveWorkflow.risk_assessment_completed.is_(True),
        )
        .scalar()
        or 0
    )

    quotes_awaiting = (
        db.query(func.count(ProspectiveWorkflow.id))
        .filter(
            ProspectiveWorkflow.care_plan_completed.is_(True),
            ProspectiveWorkflow.risk_assessment_completed.is_(True),
            ProspectiveWorkflow.quotation_generated.is_(False),
        )
        .scalar()
        or 0
    )

    documents_missing = (
        db.query(func.count(ProspectiveWorkflow.id))
        .filter(ProspectiveWorkflow.documents_generated.is_(False))
        .scalar()
        or 0
    )

    ready_to_onboard = (
        db.query(func.count(ProspectiveWorkflow.id))
        .filter(ProspectiveWorkflow.ready_for_onboarding.is_(True))
        .scalar()
        or 0
    )

    return {
        "prospective": prospective,
        "plans_ready": plans_ready,
        "quotes_awaiting": quotes_awaiting,
        "documents_missing": documents_missing,
        "ready_to_onboard": ready_to_onboard,
    }


@router.get("/provider/drafts")
def provider_drafts(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Return draft items that still need attention across care plans, documents, and quotations."""
    draft_records: List[Tuple[Optional[datetime], Dict[str, Any]]] = []

    care_plans = (
        db.query(CarePlan)
        .options(joinedload(CarePlan.participant))
        .filter(CarePlan.status.in_(["draft", "pending", "in_progress"]))
        .order_by(func.coalesce(CarePlan.updated_at, CarePlan.created_at).desc())
        .limit(25)
        .all()
    )
    for plan in care_plans:
        timestamp = _first_datetime(plan.updated_at, plan.created_at)
        draft_records.append(
            (
                timestamp,
                {
                    "id": plan.id,
                    "type": "Care Plan",
                    "participantId": plan.participant_id,
                    "participantName": _participant_display(plan.participant, plan.participant_id),
                    "updatedAt": None,  # populated after sorting
                },
            )
        )

    risk_assessments = (
        db.query(RiskAssessment)
        .options(joinedload(RiskAssessment.participant))
        .filter(RiskAssessment.approval_status.in_(["draft", "pending", "in_review"]))
        .order_by(func.coalesce(RiskAssessment.updated_at, RiskAssessment.created_at).desc())
        .limit(25)
        .all()
    )
    for assessment in risk_assessments:
        timestamp = _first_datetime(assessment.updated_at, assessment.created_at)
        draft_records.append(
            (
                timestamp,
                {
                    "id": assessment.id,
                    "type": "Risk Assessment",
                    "participantId": assessment.participant_id,
                    "participantName": _participant_display(assessment.participant, assessment.participant_id),
                    "updatedAt": None,
                },
            )
        )

    draft_documents = (
        db.query(Document)
        .options(joinedload(Document.participant))
        .filter(
            and_(
                Document.is_active.is_(True),
                Document.status.in_(["draft", "pending", "pending_signature"]),
            )
        )
        .order_by(func.coalesce(Document.updated_at, Document.created_at).desc())
        .limit(25)
        .all()
    )
    for doc in draft_documents:
        timestamp = _first_datetime(doc.updated_at, doc.created_at)
        draft_records.append(
            (
                timestamp,
                {
                    "id": doc.id,
                    "type": "Document",
                    "participantId": doc.participant_id,
                    "participantName": _participant_display(doc.participant, doc.participant_id),
                    "updatedAt": None,
                },
            )
        )

    draft_quotes = (
        db.query(Quotation)
        .options(joinedload(Quotation.participant))
        .filter(Quotation.status.in_(["draft", "pending"]))
        .order_by(func.coalesce(Quotation.updated_at, Quotation.created_at).desc())
        .limit(25)
        .all()
    )
    for quote in draft_quotes:
        timestamp = _first_datetime(quote.updated_at, quote.created_at)
        draft_records.append(
            (
                timestamp,
                {
                    "id": quote.id,
                    "type": "Quotation",
                    "participantId": quote.participant_id,
                    "participantName": _participant_display(quote.participant, quote.participant_id),
                    "updatedAt": None,
                },
            )
        )

    draft_records.sort(key=lambda item: _timestamp_score(item[0]), reverse=True)
    response: List[Dict[str, Any]] = []
    for timestamp, payload in draft_records[:50]:
        payload["updatedAt"] = _to_iso(timestamp)
        response.append(payload)
    return response


@router.get("/provider/waiting")
def provider_waiting_items(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Return workflows that are waiting on manager decisions."""
    pending_workflows = (
        db.query(ProspectiveWorkflow)
        .options(joinedload(ProspectiveWorkflow.participant))
        .filter(ProspectiveWorkflow.manager_review_status == "pending")
        .order_by(func.coalesce(ProspectiveWorkflow.updated_at, ProspectiveWorkflow.created_at).desc())
        .limit(50)
        .all()
    )

    waiting_items: List[Dict[str, Any]] = []
    for workflow in pending_workflows:
        timestamp = _first_datetime(workflow.updated_at, workflow.created_at)
        waiting_items.append(
            {
                "id": workflow.id,
                "bundleType": "Care Bundle",
                "participantId": workflow.participant_id,
                "participantName": _participant_display(workflow.participant, workflow.participant_id),
                "submittedAt": _to_iso(timestamp),
                "contents": _workflow_outstanding_summary(workflow),
            }
        )

    return waiting_items


@router.get("/provider/alerts")
def provider_alerts(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Return alert items such as expiring documents or rejected workflows."""
    now_utc = datetime.now(timezone.utc)
    alert_records: List[Tuple[Optional[datetime], Dict[str, Any]]] = []

    expiring_docs = DocumentService.get_expiring_documents(db, days_ahead=30)
    for doc in expiring_docs:
        due_date = doc.expiry_date if isinstance(doc.expiry_date, datetime) else None
        severity = "low"
        if due_date:
            days_left = (due_date - now_utc).days
            if days_left <= 3:
                severity = "high"
            elif days_left <= 14:
                severity = "medium"
        alert_records.append(
            (
                due_date,
                {
                    "id": doc.id,
                    "type": "expiry",
                    "label": doc.title or doc.original_filename or doc.filename,
                    "dueDate": _to_iso(due_date),
                    "participantName": _participant_display(doc.participant, doc.participant_id),
                    "severity": severity,
                },
            )
        )

    expired_docs = DocumentService.get_expired_documents(db)
    for doc in expired_docs:
        due_date = doc.expiry_date if isinstance(doc.expiry_date, datetime) else None
        alert_records.append(
            (
                due_date,
                {
                    "id": doc.id,
                    "type": "expiry",
                    "label": f"Expired: {doc.title or doc.original_filename or doc.filename}",
                    "dueDate": _to_iso(due_date),
                    "participantName": _participant_display(doc.participant, doc.participant_id),
                    "severity": "high",
                },
            )
        )

    rejected_workflows = (
        db.query(ProspectiveWorkflow)
        .options(joinedload(ProspectiveWorkflow.participant))
        .filter(ProspectiveWorkflow.manager_review_status == "rejected")
        .order_by(func.coalesce(ProspectiveWorkflow.updated_at, ProspectiveWorkflow.created_at).desc())
        .limit(20)
        .all()
    )
    for workflow in rejected_workflows:
        timestamp = _first_datetime(workflow.manager_reviewed_at, workflow.updated_at, workflow.created_at)
        alert_records.append(
            (
                timestamp,
                {
                    "id": workflow.id,
                    "type": "rejection",
                    "label": "Care bundle rejected",
                    "dueDate": _to_iso(timestamp),
                    "participantName": _participant_display(workflow.participant, workflow.participant_id),
                    "severity": "high",
                },
            )
        )

    signature_docs = (
        db.query(Document)
        .options(joinedload(Document.participant))
        .filter(
            and_(
                Document.is_active.is_(True),
                or_(Document.requires_approval.is_(True), Document.status == "pending_signature"),
            )
        )
        .order_by(func.coalesce(Document.updated_at, Document.created_at).desc())
        .limit(20)
        .all()
    )
    for doc in signature_docs:
        timestamp = _first_datetime(doc.updated_at, doc.created_at)
        alert_records.append(
            (
                timestamp,
                {
                    "id": doc.id,
                    "type": "signature",
                    "label": f"Signature required: {doc.title or doc.original_filename or doc.filename}",
                    "dueDate": _to_iso(timestamp),
                    "participantName": _participant_display(doc.participant, doc.participant_id),
                    "severity": "medium",
                },
            )
        )

    alert_records.sort(key=lambda item: _timestamp_score(item[0]), reverse=True)
    response: List[Dict[str, Any]] = []
    for timestamp, payload in alert_records[:30]:
        payload["dueDate"] = _to_iso(timestamp)
        response.append(payload)
    return response


@router.get("/provider/week")
def provider_week_schedule(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Return roster items scheduled for the current week."""
    today = date.today()
    week_end = today + timedelta(days=7)

    rosters = (
        db.query(Roster)
        .options(joinedload(Roster.participants))
        .filter(
            Roster.support_date >= today,
            Roster.support_date <= week_end,
        )
        .order_by(Roster.support_date.asc(), Roster.start_time.asc())
        .limit(50)
        .all()
    )

    participant_ids: set[int] = set()
    for roster in rosters:
        for participant in roster.participants or []:
            participant_ids.add(participant.participant_id)

    participants_lookup: Dict[int, Participant] = {}
    if participant_ids:
        participants = (
            db.query(Participant)
            .filter(Participant.id.in_(participant_ids))
            .all()
        )
        participants_lookup = {p.id: p for p in participants}

    def roster_participant_names(roster: Roster) -> str:
        names: List[str] = []
        for rp in roster.participants or []:
            participant = participants_lookup.get(rp.participant_id)
            names.append(participant.full_name if participant else f"Participant {rp.participant_id}")
        return ", ".join(names) if names else "Unassigned"

    schedule: List[Dict[str, Any]] = []
    for roster in rosters:
        date_label = roster.support_date.strftime("%a %d %b")
        schedule.append(
            {
                "id": roster.id,
                "type": "shift",
                "title": roster.eligibility or "Support Shift",
                "time": f"{date_label} • {_format_time_range(roster.start_time, roster.end_time)}",
                "participantName": roster_participant_names(roster),
            }
        )

    return schedule


@router.get("/provider/activity")
def provider_recent_activity(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Return a lightweight activity feed for the provider dashboard."""
    activity_records: List[Tuple[Optional[datetime], Dict[str, Any]]] = []

    recent_documents = (
        db.query(Document)
        .options(joinedload(Document.participant))
        .filter(Document.is_active.is_(True))
        .order_by(func.coalesce(Document.updated_at, Document.created_at).desc())
        .limit(15)
        .all()
    )
    for doc in recent_documents:
        timestamp = _first_datetime(doc.updated_at, doc.created_at)
        actor = (doc.uploaded_by or "Documents Team").strip()
        action = "updated" if doc.updated_at else "uploaded"
        activity_records.append(
            (
                timestamp,
                {
                    "who": actor or "Documents Team",
                    "what": f"{action} {doc.title or doc.original_filename or doc.filename}",
                    "when": None,  # populated after sorting
                    "participantName": _participant_display(doc.participant, doc.participant_id),
                },
            )
        )

    recent_workflows = (
        db.query(ProspectiveWorkflow)
        .options(joinedload(ProspectiveWorkflow.participant))
        .order_by(func.coalesce(ProspectiveWorkflow.updated_at, ProspectiveWorkflow.created_at).desc())
        .limit(15)
        .all()
    )
    for workflow in recent_workflows:
        timestamp = _first_datetime(workflow.updated_at, workflow.created_at)
        status_label = (workflow.manager_review_status or "updated").replace("_", " ")
        actor = (workflow.manager_reviewed_by or "Workflow Team").strip()
        activity_records.append(
            (
                timestamp,
                {
                    "who": actor or "Workflow Team",
                    "what": f"workflow status {status_label}",
                    "when": None,
                    "participantName": _participant_display(workflow.participant, workflow.participant_id),
                },
            )
        )

    activity_records.sort(key=lambda item: _timestamp_score(item[0]), reverse=True)
    response: List[Dict[str, Any]] = []
    for index, (timestamp, payload) in enumerate(activity_records[:30], start=1):
        payload["id"] = index
        payload["when"] = _to_iso(timestamp)
        response.append(payload)
    return response


@router.get("/provider/participants")
def provider_participant_list(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Return a list of participants with workflow progress indicators."""
    required_categories = (
        db.query(DocumentCategory)
        .filter(DocumentCategory.is_required.is_(True), DocumentCategory.is_active.is_(True))
        .all()
    )
    required_category_ids = [cat.category_id for cat in required_categories]

    documents_by_participant: Dict[int, Dict[str, int]] = {}
    if required_category_ids:
        document_rows = (
            db.query(
                Document.participant_id,
                Document.category,
                func.count(Document.id),
            )
            .filter(Document.category.in_(required_category_ids))
            .group_by(Document.participant_id, Document.category)
            .all()
        )
        for participant_id, category, count in document_rows:
            documents_by_participant.setdefault(participant_id, {})[category] = count

    workflows: List[Tuple[ProspectiveWorkflow, Participant]] = (
        db.query(ProspectiveWorkflow, Participant)
        .join(Participant, Participant.id == ProspectiveWorkflow.participant_id)
        .order_by(ProspectiveWorkflow.updated_at.desc().nullslast())
        .limit(200)
        .all()
    )

    def missing_documents_count(participant_id: int) -> int:
        if not required_category_ids:
            return 0
        participant_docs = documents_by_participant.get(participant_id, {})
        return sum(1 for cat_id in required_category_ids if participant_docs.get(cat_id, 0) == 0)

    def derive_stage(workflow: ProspectiveWorkflow) -> str:
        if workflow.manager_review_status == "pending":
            return "Manager Review"
        if workflow.manager_review_status == "approved" and not workflow.ready_for_onboarding:
            return "Manager Approved"
        if workflow.ready_for_onboarding:
            return "Ready to Onboard"
        if not workflow.care_plan_completed:
            return "Care Plan"
        if not workflow.risk_assessment_completed:
            return "Risk Assessment"
        if not workflow.quotation_generated:
            return "Quotation"
        if not workflow.documents_generated:
            return "Documents"
        return "In Progress"

    response = []
    for workflow, participant in workflows:
        response.append(
            {
                "participantId": participant.id,
                "name": participant.full_name,
                "stage": derive_stage(workflow),
                "participantStatus": participant.status.value if isinstance(participant.status, ParticipantStatus) else str(participant.status),
                "careStatus": "Completed" if workflow.care_plan_completed else "Pending",
                "riskStatus": "Completed" if workflow.risk_assessment_completed else "Pending",
                "quotationStatus": "Generated" if workflow.quotation_generated else "Pending",
                "documentsStatus": "Complete" if workflow.documents_generated else "Pending",
                "missingDocsCount": missing_documents_count(participant.id),
                "lastUpdated": (
                    workflow.updated_at.isoformat()
                    if workflow.updated_at
                    else participant.updated_at.isoformat() if participant.updated_at else None
                ),
            }
        )

    return response


@router.get("/participant/{participant_id}")
def participant_dashboard(
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate participant-facing dashboard data."""
    # Allow participants to view themselves and staff with elevated roles
    allowed_roles = {"PARTICIPANT", "SERVICE_MANAGER", "PROVIDER_ADMIN"}
    current_role = (current_user.role or "").upper()
    if current_role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if current_role == "PARTICIPANT":
        profile_data = current_user.profile_data or {}
        if profile_data.get("participant_id") != participant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")

    document_stats = DocumentService.get_document_stats(db, participant_id)

    pending_documents = (
        db.query(Document)
        .filter(
            Document.participant_id == participant_id,
            Document.status.in_(["pending", "pending_signature", "draft"]),
        )
        .order_by(Document.created_at.desc())
        .limit(20)
        .all()
    )

    today = date.today()
    appointments = (
        db.query(Roster)
        .join(RosterParticipant, RosterParticipant.roster_id == Roster.id)
        .filter(
            RosterParticipant.participant_id == participant_id,
            Roster.support_date >= today,
        )
        .order_by(Roster.support_date.asc(), Roster.start_time.asc())
        .limit(10)
        .all()
    )

    def roster_to_appointment(roster: Roster) -> Dict[str, Any]:
        return {
            "id": roster.id,
            "date": roster.support_date.isoformat(),
            "time": _format_time_range(roster.start_time, roster.end_time),
            "serviceType": roster.eligibility or "Support Session",
            "status": roster.status.value if roster.status else "scheduled",
        }

    signed_documents = document_stats.get("total_documents", 0) - len(pending_documents)

    return {
        "participant": {
            "id": participant.id,
            "name": participant.full_name,
            "status": participant.status.value if isinstance(participant.status, ParticipantStatus) else str(participant.status),
            "onboarding_completed": participant.onboarding_completed,
            "care_plan_completed": participant.care_plan_completed,
        },
        "stats": {
            "onboardingStatus": participant.status.value if isinstance(participant.status, ParticipantStatus) else str(participant.status),
            "signedDocuments": max(signed_documents, 0),
            "upcomingAppointments": len(appointments),
            "outstandingActions": len(pending_documents),
        },
        "documentStats": document_stats,
        "documents": [
            {
                "id": doc.id,
                "name": doc.title or doc.original_filename or doc.filename,
                "status": doc.status,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
            }
            for doc in pending_documents
        ],
        "appointments": [roster_to_appointment(r) for r in appointments],
    }


@router.get("/worker/{worker_id}")
def worker_dashboard(
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPPORT_WORKER", "HR", "SERVICE_MANAGER")),
):
    """Aggregate support worker dashboard data."""
    if (current_user.role or "").upper() == "SUPPORT_WORKER" and current_user.id != worker_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    today_rosters = (
        db.query(Roster)
        .options(joinedload(Roster.participants), joinedload(Roster.tasks))
        .filter(Roster.worker_id == worker_id, Roster.support_date == today)
        .order_by(Roster.start_time.asc())
        .all()
    )

    week_rosters = (
        db.query(Roster)
        .options(joinedload(Roster.participants), joinedload(Roster.tasks))
        .filter(
            Roster.worker_id == worker_id,
            Roster.support_date >= week_start,
            Roster.support_date <= week_end,
        )
        .all()
    )

    participant_ids: set[int] = set()
    for roster in week_rosters:
        for participant in roster.participants or []:
            participant_ids.add(participant.participant_id)

    participants_lookup: Dict[int, Participant] = {}
    if participant_ids:
        participants = (
            db.query(Participant)
            .filter(Participant.id.in_(participant_ids))
            .all()
        )
        participants_lookup = {p.id: p for p in participants}

    def participant_names(roster: Roster) -> str:
        names = []
        for rp in roster.participants or []:
            participant = participants_lookup.get(rp.participant_id)
            names.append(participant.full_name if participant else f"Participant {rp.participant_id}")
        return ", ".join(names) if names else "Unassigned"

    open_tasks = sum(
        1 for roster in today_rosters for task in roster.tasks or [] if not task.is_done
    )

    hours_this_week = sum(_calculate_hours(roster) for roster in week_rosters)

    next_visit_by_participant: Dict[int, datetime] = {}
    for roster in week_rosters:
        roster_start = datetime.combine(roster.support_date, roster.start_time)
        for rp in roster.participants or []:
            existing = next_visit_by_participant.get(rp.participant_id)
            if existing is None or roster_start < existing:
                next_visit_by_participant[rp.participant_id] = roster_start

    today_shifts = [
        {
            "id": roster.id,
            "time": _format_time_range(roster.start_time, roster.end_time),
            "participants": participant_names(roster),
            "notes": roster.notes,
            "status": roster.status.value if roster.status else "scheduled",
        }
        for roster in today_rosters
    ]

    my_participants = []
    for participant_id, next_visit in sorted(
        next_visit_by_participant.items(), key=lambda item: item[1]
    ):
        participant = participants_lookup.get(participant_id)
        my_participants.append(
            {
                "participantId": participant_id,
                "name": participant.full_name if participant else f"Participant {participant_id}",
                "nextAppointment": next_visit.isoformat(),
            }
        )

    return {
        "stats": {
            "shiftsToday": len(today_rosters),
            "hoursThisWeek": round(hours_this_week, 2),
            "participantsAssigned": len(participant_ids),
            "openTasks": open_tasks,
        },
        "todayShifts": today_shifts,
        "participants": my_participants,
    }
