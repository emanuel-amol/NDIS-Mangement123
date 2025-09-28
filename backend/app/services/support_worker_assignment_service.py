from typing import List

from sqlalchemy.orm import Session

from app.models import Participant, User, SupportWorkerAssignment
from app.schemas.support_worker_assignment import (
    SupportWorkerAssignmentRequest,
    SupportWorkerAssignmentRead,
)


def ensure_assignment_table(db: Session) -> None:
    """Ensure the assignment table exists (helpful in local environments)."""
    SupportWorkerAssignment.__table__.create(bind=db.get_bind(), checkfirst=True)


def save_support_worker_assignments(
    db: Session,
    participant_id: int,
    payload: SupportWorkerAssignmentRequest,
) -> List[SupportWorkerAssignment]:
    ensure_assignment_table(db)

    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise ValueError("Participant not found")

    # Remove existing assignments before adding new ones
    db.query(SupportWorkerAssignment).filter(
        SupportWorkerAssignment.participant_id == participant_id
    ).delete(synchronize_session=False)

    created_assignments: List[SupportWorkerAssignment] = []

    for assignment in payload.assignments:
        worker = db.query(User).filter(User.id == assignment.support_worker_id).first()
        if not worker:
            raise ValueError(f"Support worker {assignment.support_worker_id} not found")

        record = SupportWorkerAssignment(
            participant_id=participant_id,
            support_worker_id=worker.id,
            support_worker_name=assignment.support_worker_name or worker.full_name,
            role=assignment.role or "primary",
            hours_per_week=assignment.hours_per_week,
            services=assignment.services,
            start_date=assignment.start_date,
            notes=assignment.notes,
            participant_needs=payload.participant_needs,
        )
        db.add(record)
        created_assignments.append(record)

    db.commit()

    for record in created_assignments:
        db.refresh(record)

    return created_assignments


def get_support_worker_assignments(db: Session, participant_id: int) -> List[SupportWorkerAssignmentRead]:
    ensure_assignment_table(db)

    assignments = (
        db.query(SupportWorkerAssignment)
        .filter(SupportWorkerAssignment.participant_id == participant_id)
        .order_by(SupportWorkerAssignment.created_at.desc())
        .all()
    )

    return [SupportWorkerAssignmentRead.model_validate(assignment) for assignment in assignments]
