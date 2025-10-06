# backend/app/api/v1/endpoints/participant.py
from app.schemas.document import DocumentResponse
from backend.app.services.document_service import DocumentService
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.schemas.participant import (
    ParticipantCreate,
    ParticipantUpdate,
    ParticipantResponse,
    ParticipantListResponse,
)
from app.schemas.support_worker_assignment import (
    SupportWorkerAssignmentRequest,
    SupportWorkerAssignmentResponse,
    SupportWorkerAssignmentListResponse,
)
from app.services.participant_service import ParticipantService
from app.services.support_worker_assignment_service import (
    save_support_worker_assignments,
    get_support_worker_assignments,
)
from tkinter.tix import Form
router = APIRouter()

@router.post("/create-from-referral/{referral_id}", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
def create_participant_from_referral(
    referral_id: int,
    db: Session = Depends(get_db)
):
    """
    Convert a referral to a participant (onboarding process)
    """
    try:
        participant = ParticipantService.create_participant_from_referral(db, referral_id)
        return ParticipantResponse(
            id=participant.id,
            first_name=participant.first_name,
            last_name=participant.last_name,
            date_of_birth=participant.date_of_birth,
            phone_number=participant.phone_number,
            email_address=participant.email_address,
            disability_type=participant.disability_type,
            ndis_number=participant.ndis_number,
            plan_type=participant.plan_type,
            support_category=participant.support_category,
            plan_start_date=participant.plan_start_date,
            plan_review_date=participant.plan_review_date,
            status=participant.status,
            risk_level=participant.risk_level,
            onboarding_completed=participant.onboarding_completed,
            care_plan_completed=participant.care_plan_completed,
            created_at=participant.created_at.isoformat() if participant.created_at else "",
            rep_first_name=participant.rep_first_name,
            rep_last_name=participant.rep_last_name,
            rep_relationship=participant.rep_relationship
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create participant: {str(e)}"
        )

@router.post("/", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
def create_participant(
    participant_data: ParticipantCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new participant directly
    """
    try:
        participant = ParticipantService.create_participant(db, participant_data)
        return ParticipantResponse(
            id=participant.id,
            first_name=participant.first_name,
            last_name=participant.last_name,
            date_of_birth=participant.date_of_birth,
            phone_number=participant.phone_number,
            email_address=participant.email_address,
            disability_type=participant.disability_type,
            ndis_number=participant.ndis_number,
            plan_type=participant.plan_type,
            support_category=participant.support_category,
            plan_start_date=participant.plan_start_date,
            plan_review_date=participant.plan_review_date,
            status=participant.status,
            risk_level=participant.risk_level,
            onboarding_completed=participant.onboarding_completed,
            care_plan_completed=participant.care_plan_completed,
            created_at=participant.created_at.isoformat() if participant.created_at else "",
            rep_first_name=participant.rep_first_name,
            rep_last_name=participant.rep_last_name,
            rep_relationship=participant.rep_relationship
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create participant: {str(e)}"
        )

@router.get("/", response_model=List[ParticipantListResponse])
def get_participants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    support_category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get participants with filtering and pagination
    """
    participants = ParticipantService.get_participants(
        db, skip=skip, limit=limit, search=search, status=status, support_category=support_category
    )
    return [
        ParticipantListResponse(
            id=p.id,
            first_name=p.first_name,
            last_name=p.last_name,
            ndis_number=p.ndis_number,
            phone_number=p.phone_number,
            email_address=p.email_address,
            status=p.status,
            support_category=p.support_category,
            plan_start_date=p.plan_start_date,
            plan_review_date=p.plan_review_date,
            risk_level=p.risk_level,
            created_at=p.created_at.isoformat() if p.created_at else ""
        )
        for p in participants
    ]

@router.get("/stats")
def get_participant_stats(db: Session = Depends(get_db)):
    """
    Get participant statistics for dashboard
    """
    return ParticipantService.get_participant_stats(db)

@router.get("/{participant_id}", response_model=ParticipantResponse)
def get_participant(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific participant by ID
    """
    participant = ParticipantService.get_participant(db, participant_id)
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    return ParticipantResponse(
        id=participant.id,
        first_name=participant.first_name,
        last_name=participant.last_name,
        date_of_birth=participant.date_of_birth,
        phone_number=participant.phone_number,
        email_address=participant.email_address,
        disability_type=participant.disability_type,
        ndis_number=participant.ndis_number,
        plan_type=participant.plan_type,
        support_category=participant.support_category,
        plan_start_date=participant.plan_start_date,
        plan_review_date=participant.plan_review_date,
        status=participant.status,
        risk_level=participant.risk_level,
        onboarding_completed=participant.onboarding_completed,
        care_plan_completed=participant.care_plan_completed,
        created_at=participant.created_at.isoformat() if participant.created_at else "",
        rep_first_name=participant.rep_first_name,
        rep_last_name=participant.rep_last_name,
        rep_relationship=participant.rep_relationship
    )

@router.put("/{participant_id}", response_model=ParticipantResponse)
def update_participant(
    participant_id: int,
    participant_data: ParticipantUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a participant
    """
    participant = ParticipantService.update_participant(db, participant_id, participant_data)
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    return ParticipantResponse(
        id=participant.id,
        first_name=participant.first_name,
        last_name=participant.last_name,
        date_of_birth=participant.date_of_birth,
        phone_number=participant.phone_number,
        email_address=participant.email_address,
        disability_type=participant.disability_type,
        ndis_number=participant.ndis_number,
        plan_type=participant.plan_type,
        support_category=participant.support_category,
        plan_start_date=participant.plan_start_date,
        plan_review_date=participant.plan_review_date,
        status=participant.status,
        risk_level=participant.risk_level,
        onboarding_completed=participant.onboarding_completed,
        care_plan_completed=participant.care_plan_completed,
        created_at=participant.created_at.isoformat() if participant.created_at else "",
        rep_first_name=participant.rep_first_name,
        rep_last_name=participant.rep_last_name,
        rep_relationship=participant.rep_relationship
    )

@router.post("/{participant_id}/documents", response_model=DocumentResponse)
async def upload_participant_document(
    participant_id: int,
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form(...),
    description: str = Form(None),
    tags: str = Form(None),
    expiry_date: Optional[str] = Form(None),
    visible_to_support_workers: bool = Form(False),
    requires_approval: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await DocumentService.upload_document(
        db=db,
        participant_id=participant_id,
        file=file,
        title=title,
        category=category,
        description=description,
        tags=tags,
        expiry_date=expiry_date,
        visible_to_support_workers=visible_to_support_workers,
        requires_approval=requires_approval,
        created_by=current_user.email
    )


@router.post("/{participant_id}/support-worker-assignments", response_model=SupportWorkerAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_support_worker_assignments(
    participant_id: int,
    payload: SupportWorkerAssignmentRequest,
    db: Session = Depends(get_db)
):
    """Save support worker assignments for a participant."""
    try:
        created = save_support_worker_assignments(db, participant_id, payload)
        return SupportWorkerAssignmentResponse(
            message="Support worker assignments saved successfully",
            participant_id=participant_id,
            assignments_created=len(created)
        )
    except ValueError as value_error:
        detail = str(value_error)
        status_code = status.HTTP_404_NOT_FOUND if "not found" in detail.lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=detail)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save support worker assignments: {exc}"
        )


@router.get("/{participant_id}/support-worker-assignments", response_model=SupportWorkerAssignmentListResponse)
def get_support_worker_assignments_for_participant(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve saved support worker assignments for a participant."""
    try:
        assignments = get_support_worker_assignments(db, participant_id)
        return SupportWorkerAssignmentListResponse(
            participant_id=participant_id,
            assignments=assignments
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load support worker assignments: {exc}"
        )

@router.patch("/{participant_id}/status")
def update_participant_status(
    participant_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    """
    Update participant status (prospective, onboarded, active, inactive)
    """
    participant = ParticipantService.update_participant_status(db, participant_id, status)
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    return {"message": "Status updated successfully", "participant_id": participant_id, "status": status}

@router.delete("/{participant_id}")
def delete_participant(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a participant
    """
    deleted = ParticipantService.delete_participant(db, participant_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    return {"message": "Participant deleted successfully"}




