from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from app.core.database import get_db
from app.models.participant import Participant
from app.models.care_plan import CarePlan, RiskAssessment, ProspectiveWorkflow
from app.models.quotation import Quotation
from app.models.user import User
from app.schemas.care_workflow import (
    CarePlanCreate, CarePlanResponse, CarePlanUpdate,
    RiskAssessmentCreate, RiskAssessmentResponse, RiskAssessmentUpdate,
    ProspectiveWorkflowResponse
)
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import logging

from app.security.deps import require_perm, require_roles

router = APIRouter()
logger = logging.getLogger(__name__)

# ============================================================================
# PROSPECTIVE WORKFLOW ENDPOINTS
# ============================================================================

@router.get("/participants/{participant_id}/prospective-workflow", response_model=ProspectiveWorkflowResponse)
def get_prospective_workflow(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Get the prospective workflow status for a participant"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Get or create prospective workflow
    workflow = db.query(ProspectiveWorkflow).filter(
        ProspectiveWorkflow.participant_id == participant_id
    ).first()
    
    if not workflow:
        # Check if participant has existing care plan or risk assessment
        latest_care_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        latest_risk_assessment = db.query(RiskAssessment).filter(
            RiskAssessment.participant_id == participant_id
        ).order_by(desc(RiskAssessment.created_at)).first()
        
        # Create workflow with current status
        workflow = ProspectiveWorkflow(
            participant_id=participant_id,
            care_plan_completed=latest_care_plan is not None,
            risk_assessment_completed=latest_risk_assessment is not None,
            documents_generated=False,
            manager_review_status="not_requested",
            care_plan_id=latest_care_plan.id if latest_care_plan else None,
            risk_assessment_id=latest_risk_assessment.id if latest_risk_assessment else None,
            care_plan_completed_date=latest_care_plan.created_at if latest_care_plan else None,
            risk_assessment_completed_date=latest_risk_assessment.created_at if latest_risk_assessment else None
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)
        
        # Also update participant's care_plan_completed flag if needed
        if latest_care_plan and not participant.care_plan_completed:
            participant.care_plan_completed = True
            db.commit()
    else:
        # Verify workflow status is accurate
        latest_care_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        latest_risk_assessment = db.query(RiskAssessment).filter(
            RiskAssessment.participant_id == participant_id
        ).order_by(desc(RiskAssessment.created_at)).first()
        
        # Update workflow if it's out of sync
        needs_update = False
        
        if latest_care_plan and not workflow.care_plan_completed:
            workflow.care_plan_completed = True
            workflow.care_plan_id = latest_care_plan.id
            workflow.care_plan_completed_date = latest_care_plan.created_at
            needs_update = True
            
        if latest_risk_assessment and not workflow.risk_assessment_completed:
            workflow.risk_assessment_completed = True
            workflow.risk_assessment_id = latest_risk_assessment.id
            workflow.risk_assessment_completed_date = latest_risk_assessment.created_at
            needs_update = True
            
        if needs_update:
            workflow.updated_at = datetime.now()
            db.commit()
            db.refresh(workflow)
    
    return ProspectiveWorkflowResponse(
        id=workflow.id,
        participant_id=workflow.participant_id,
        care_plan_completed=workflow.care_plan_completed,
        risk_assessment_completed=workflow.risk_assessment_completed,
        ai_review_completed=workflow.ai_review_completed,
        quotation_generated=workflow.quotation_generated,
        documents_generated=workflow.documents_generated,
        ready_for_onboarding=workflow.ready_for_onboarding,
        care_plan_id=workflow.care_plan_id,
        risk_assessment_id=workflow.risk_assessment_id,
        workflow_notes=workflow.workflow_notes,
        manager_comments=workflow.manager_comments,
        manager_review_status=workflow.manager_review_status,
        manager_reviewed_by=workflow.manager_reviewed_by,
        manager_reviewed_at=workflow.manager_reviewed_at.isoformat() if workflow.manager_reviewed_at else None,
        created_at=workflow.created_at.isoformat() if workflow.created_at else "",
        updated_at=workflow.updated_at.isoformat() if workflow.updated_at else "",
        participant_name=f"{participant.first_name} {participant.last_name}",
        participant_status=participant.status
    )


@router.post("/participants/{participant_id}/prospective-workflow/mark-documents-complete")
def mark_documents_complete(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Mark documents as generated for a prospective participant."""
    workflow = db.query(ProspectiveWorkflow).filter(
        ProspectiveWorkflow.participant_id == participant_id
    ).first()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if not workflow.documents_generated:
        workflow.documents_generated = True
        workflow.updated_at = datetime.now()
        db.commit()
        db.refresh(workflow)

    return {
        "message": "Documents marked as complete",
        "documents_generated": True
    }


@router.post("/participants/{participant_id}/submit-for-manager-review")
def submit_for_manager_review(
    participant_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Submit the participant workflow for manager review."""
    workflow = (
        db.query(ProspectiveWorkflow)
        .filter(ProspectiveWorkflow.participant_id == participant_id)
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if workflow.manager_review_status == "pending":
        return {"status": "pending"}

    if workflow.manager_review_status == "approved":
        raise HTTPException(status_code=409, detail="Workflow already approved")

    care_plan = (
        db.query(CarePlan)
        .filter(CarePlan.participant_id == participant_id)
        .order_by(desc(CarePlan.created_at))
        .first()
    )
    if not care_plan or not getattr(care_plan, "is_finalised", False):
        raise HTTPException(
            status_code=409,
            detail="Care plan must be finalised before requesting manager review.",
        )

    quotation = (
        db.query(Quotation)
        .filter(Quotation.participant_id == participant_id)
        .order_by(desc(Quotation.created_at))
        .first()
    )
    if not quotation or quotation.status != "final":
        raise HTTPException(
            status_code=409,
            detail="Quotation must be finalised before requesting manager review.",
        )

    workflow.manager_review_status = "pending"
    workflow.manager_reviewed_by = None
    workflow.manager_reviewed_at = None
    workflow.manager_comments = None
    workflow.updated_at = datetime.now()
    db.commit()
    db.refresh(workflow)
    return {"status": "pending"}


@router.get("/manager/reviews")
def get_manager_review_queue(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Return all workflows waiting for manager approval OR ready to onboard."""
    
    # Get both pending AND approved workflows
    workflows = (
        db.query(ProspectiveWorkflow)
        .filter(
            ProspectiveWorkflow.manager_review_status.in_(["pending", "approved"])
        )
        .order_by(desc(ProspectiveWorkflow.updated_at))
        .all()
    )

    queue = []
    for workflow in workflows:
        participant = workflow.participant
        queue.append({
            "participant_id": workflow.participant_id,
            "participant_name": f"{participant.first_name} {participant.last_name}" if participant else None,
            "manager_review_status": workflow.manager_review_status,
            "updated_at": workflow.updated_at.isoformat() if workflow.updated_at else None,
        })
    return queue


@router.get("/manager/stats")
def get_manager_stats(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Aggregate statistics for the service manager dashboard."""
    today = date.today()

    total_pending = (
        db.query(func.count(ProspectiveWorkflow.id))
        .filter(ProspectiveWorkflow.manager_review_status == "pending")
        .scalar()
        or 0
    )

    approved_today = (
        db.query(func.count(ProspectiveWorkflow.id))
        .filter(
            and_(
                ProspectiveWorkflow.manager_review_status == "approved",
                func.date(ProspectiveWorkflow.manager_reviewed_at) == today,
            )
        )
        .scalar()
        or 0
    )

    rejected_today = (
        db.query(func.count(ProspectiveWorkflow.id))
        .filter(
            and_(
                ProspectiveWorkflow.manager_review_status == "rejected",
                func.date(ProspectiveWorkflow.manager_reviewed_at) == today,
            )
        )
        .scalar()
        or 0
    )

    ready_to_convert = (
        db.query(func.count(ProspectiveWorkflow.id))
        .filter(ProspectiveWorkflow.ready_for_onboarding.is_(True))
        .scalar()
        or 0
    )

    return {
        "awaitingSignoff": total_pending,
        "approvedToday": approved_today,
        "rejectedToday": rejected_today,
        "readyToConvert": ready_to_convert,
    }


@router.post("/participants/{participant_id}/manager-approve")
def manager_approve_workflow(
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Approve the prospective workflow and flag it ready for onboarding."""
    workflow = (
        db.query(ProspectiveWorkflow)
        .filter(ProspectiveWorkflow.participant_id == participant_id)
        .first()
    )
    if not workflow or workflow.manager_review_status != "pending":
        raise HTTPException(status_code=409, detail="No pending manager review found")

    workflow.manager_review_status = "approved"
    workflow.manager_reviewed_by = current_user.full_name or current_user.email
    workflow.manager_reviewed_at = datetime.now()
    workflow.manager_comments = None
    workflow.ready_for_onboarding = True
    workflow.updated_at = datetime.now()
    
    db.commit()
    db.refresh(workflow)
    return {"approved": True, "status": "approved"}

@router.post("/participants/{participant_id}/manager-reject")
def manager_reject_workflow(
    participant_id: int,
    payload: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER")),
):
    """Reject the workflow and capture manager feedback."""
    workflow = (
        db.query(ProspectiveWorkflow)
        .filter(ProspectiveWorkflow.participant_id == participant_id)
        .first()
    )
    if not workflow or workflow.manager_review_status != "pending":
        raise HTTPException(status_code=409, detail="No pending manager review found")

    comments = (payload or {}).get("comments")
    workflow.manager_review_status = "rejected"
    workflow.manager_comments = comments
    workflow.manager_reviewed_by = current_user.full_name or current_user.email
    workflow.manager_reviewed_at = datetime.now()
    workflow.ready_for_onboarding = False
    workflow.updated_at = datetime.now()
    db.commit()
    db.refresh(workflow)
    return {"approved": False, "status": "rejected"}


@router.post(
    "/participants/{participant_id}/convert-to-onboarded",
    dependencies=[Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))]
)
def convert_to_onboarded(
    participant_id: int,
    approval_data: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db)
):
    """
    Convert a prospective participant to onboarded status.
    SRS Requirements:
    - Care Plan exists and is finalised
    - Participant is currently 'prospective'
    - Risk Assessment is OPTIONAL (not required)
    - Manager approval is required prior to conversion
    """

    # Verify participant exists
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    if participant.status != "prospective":
        raise HTTPException(status_code=409, detail=f"Participant is not prospective (current status: {participant.status})")

    # ONLY requirement: Care Plan must be finalised (SRS requirement)
    latest_care_plan = db.query(CarePlan).filter(
        CarePlan.participant_id == participant_id
    ).order_by(desc(CarePlan.created_at)).first()

    if not latest_care_plan:
        raise HTTPException(
            status_code=409,
            detail="Care Plan must exist before onboarding."
        )

    # Check if care plan is finalised - this is the critical check
    if not getattr(latest_care_plan, "is_finalised", False):
        raise HTTPException(
            status_code=409,
            detail="Care Plan must be finalised before onboarding."
        )

    # Optional: Check for Risk Assessment (but don't require it)
    latest_risk_assessment = db.query(RiskAssessment).filter(
        RiskAssessment.participant_id == participant_id
    ).order_by(desc(RiskAssessment.created_at)).first()

    # Ensure workflow exists
    workflow = db.query(ProspectiveWorkflow).filter(
        ProspectiveWorkflow.participant_id == participant_id
    ).first()
    if not workflow:
        workflow = ProspectiveWorkflow(
            participant_id=participant_id,
            care_plan_id=latest_care_plan.id,
            risk_assessment_id=latest_risk_assessment.id if latest_risk_assessment else None,
            care_plan_completed=True,
            risk_assessment_completed=latest_risk_assessment is not None,
            manager_review_status="not_requested",
            care_plan_completed_date=getattr(latest_care_plan, "created_at", datetime.now()),
            risk_assessment_completed_date=getattr(latest_risk_assessment, "created_at", None) if latest_risk_assessment else None
        )
        db.add(workflow)
        db.flush()

    manager_status = getattr(workflow, "manager_review_status", None)
    if manager_status != "approved":
        raise HTTPException(
            status_code=409,
            detail="Manager approval required before onboarding."
        )

    # Update participant + workflow atomically
    participant.status = "onboarded"
    participant.onboarding_completed = True
    participant.care_plan_completed = True
    participant.updated_at = datetime.now()

    # UPDATED: Ready for onboarding only requires finalised care plan
    workflow.ready_for_onboarding = True
    workflow.ai_review_completed = workflow.ai_review_completed or False
    workflow.quotation_generated = workflow.quotation_generated or False
    workflow.updated_at = datetime.now()

    # Record approval trail (if provided - optional)
    if approval_data:
        approval_notes = f"Approved by: {approval_data.get('manager_name', 'System')}"
        if approval_data.get('manager_title'):
            approval_notes += f" ({approval_data['manager_title']})"
        if approval_data.get('approval_comments'):
            approval_notes += f"\nComments: {approval_data['approval_comments']}"
        if approval_data.get('scheduled_start_date'):
            approval_notes += f"\nScheduled Start: {approval_data['scheduled_start_date']}"

        workflow.manager_comments = (workflow.manager_comments or "")
        workflow.manager_comments = (workflow.manager_comments + ("\n" if workflow.manager_comments else "") + approval_notes).strip()

    db.commit()

    return {
        "message": "Participant successfully converted to onboarded status",
        "participant_id": participant.id,
        "participant_status": participant.status,
        "onboarding_completed": participant.onboarding_completed,
        "workflow_ready_for_onboarding": workflow.ready_for_onboarding,
        "care_plan_finalised": True,
        "risk_assessment_available": latest_risk_assessment is not None,
        "risk_assessment_required": False  # Explicitly state it's not required
    }

@router.patch("/participants/{participant_id}/workflow-status")
def update_workflow_status(
    participant_id: int,
    status_updates: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Update specific workflow status flags"""
    try:
        workflow = db.query(ProspectiveWorkflow).filter(
            ProspectiveWorkflow.participant_id == participant_id
        ).first()
        
        if not workflow:
            # Create workflow if it doesn't exist
            workflow = ProspectiveWorkflow(participant_id=participant_id)
            db.add(workflow)
            db.commit()
            db.refresh(workflow)
        
        # Update allowed fields
        allowed_fields = [
            'care_plan_completed', 'risk_assessment_completed', 
            'ai_review_completed', 'quotation_generated',
            'workflow_notes', 'manager_comments'
        ]
        
        updated_fields = []
        for field, value in status_updates.items():
            if field in allowed_fields:
                setattr(workflow, field, value)
                updated_fields.append(field)
        
        # UPDATED: Auto-calculate ready_for_onboarding (only requires care plan now)
        workflow.ready_for_onboarding = workflow.care_plan_completed
        
        workflow.updated_at = datetime.now()
        db.commit()
        
        return {
            "message": "Workflow status updated successfully",
            "updated_fields": updated_fields,
            "ready_for_onboarding": workflow.ready_for_onboarding,
            "risk_assessment_required": False
        }
        
    except Exception as e:
        logger.error(f"Error updating workflow status for participant {participant_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/participants/{participant_id}/onboarding-requirements")
def get_onboarding_requirements(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Get onboarding requirements status - UPDATED TO SHOW RISK ASSESSMENT AS OPTIONAL"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Check care plan
    latest_care_plan = db.query(CarePlan).filter(
        CarePlan.participant_id == participant_id
    ).order_by(desc(CarePlan.created_at)).first()
    
    care_plan_exists = latest_care_plan is not None
    care_plan_finalised = getattr(latest_care_plan, "is_finalised", False) if latest_care_plan else False
    
    # Check risk assessment (optional)
    latest_risk_assessment = db.query(RiskAssessment).filter(
        RiskAssessment.participant_id == participant_id
    ).order_by(desc(RiskAssessment.created_at)).first()
    
    risk_assessment_exists = latest_risk_assessment is not None
    
    # Calculate readiness
    can_onboard = care_plan_exists and care_plan_finalised
    
    return {
        "participant_id": participant_id,
        "participant_status": participant.status,
        "requirements": {
            "care_plan": {
                "required": True,
                "exists": care_plan_exists,
                "finalised": care_plan_finalised,
                "status": "complete" if (care_plan_exists and care_plan_finalised) else "incomplete",
                "care_plan_id": latest_care_plan.id if latest_care_plan else None
            },
            "risk_assessment": {
                "required": False,  # UPDATED: Not required
                "exists": risk_assessment_exists,
                "status": "optional",
                "risk_assessment_id": latest_risk_assessment.id if latest_risk_assessment else None
            }
        },
        "can_onboard": can_onboard,
        "blocking_issues": [] if can_onboard else [
            "Care plan must exist and be finalised" if not (care_plan_exists and care_plan_finalised) else None
        ],
        "ready_for_onboarding": can_onboard
    }


# ============================================================================
# CARE PLAN ENDPOINTS
# ============================================================================

@router.post("/participants/{participant_id}/care-plan")
def create_or_update_care_plan(
    participant_id: int,
    care_plan_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Create or update care plan"""
    from app.models import CarePlan
    from datetime import datetime
    from sqlalchemy import desc
    
    try:
        care_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        if care_plan:
            for key, value in care_plan_data.items():
                if hasattr(care_plan, key):
                    setattr(care_plan, key, value)
            care_plan.updated_at = datetime.utcnow()
            message = "Care plan updated"
        else:
            care_plan = CarePlan(participant_id=participant_id, **care_plan_data)
            db.add(care_plan)
            message = "Care plan created"
        
        db.commit()
        db.refresh(care_plan)
        
        return {"message": message, "id": care_plan.id}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/participants/{participant_id}/care-plan",
    response_model=CarePlanResponse,
    dependencies=[Depends(require_perm("care.edit"))]
)
def create_care_plan(
    participant_id: int,
    care_plan_data: CarePlanCreate,
    db: Session = Depends(get_db)
):
    """Create a care plan for a participant - FIXED WITH AUTO-FINALISATION"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Check if care plan already exists
        existing_plan = db.query(CarePlan).filter(CarePlan.participant_id == participant_id).first()
        if existing_plan:
            # Update existing plan instead of creating new one
            return update_care_plan(participant_id, care_plan_data, db)
        
        # Create care plan
        care_plan = CarePlan(
            participant_id=participant_id,
            **care_plan_data.dict()
        )
        
        # FIXED: Auto-finalise if it has required content
        if care_plan.summary and care_plan.summary.strip():
            care_plan.is_finalised = True
            care_plan.finalised_at = datetime.now()
            care_plan.finalised_by = "System User"  # TODO: Get from auth context
            logger.info(f"Auto-finalised care plan for participant {participant_id}")
        
        db.add(care_plan)
        db.commit()
        db.refresh(care_plan)
        
        # Update participant care_plan_completed flag
        participant.care_plan_completed = True
        participant.updated_at = datetime.now()
        
        # Update or create prospective workflow
        workflow = db.query(ProspectiveWorkflow).filter(
            ProspectiveWorkflow.participant_id == participant_id
        ).first()
        
        if workflow:
            workflow.care_plan_completed = True
            workflow.care_plan_id = care_plan.id
            workflow.care_plan_completed_date = datetime.now()
            workflow.updated_at = datetime.now()
            
            # UPDATED: Auto-calculate ready_for_onboarding (only requires care plan now)
            workflow.ready_for_onboarding = workflow.care_plan_completed
        else:
            # Create workflow if it doesn't exist
            new_workflow = ProspectiveWorkflow(
                participant_id=participant_id,
                care_plan_completed=True,
                care_plan_id=care_plan.id,
                care_plan_completed_date=datetime.now(),
                ready_for_onboarding=True  # Care plan is sufficient now
            )
            db.add(new_workflow)
        
        db.commit()
        
        logger.info(f"Care plan created successfully for participant {participant_id}")
        
        return CarePlanResponse(
            id=care_plan.id,
            participant_id=care_plan.participant_id,
            plan_name=care_plan.plan_name,
            plan_version=care_plan.plan_version,
            plan_period=care_plan.plan_period,
            start_date=care_plan.start_date,
            end_date=care_plan.end_date,
            summary=care_plan.summary,
            participant_strengths=care_plan.participant_strengths,
            participant_preferences=care_plan.participant_preferences,
            family_goals=care_plan.family_goals,
            short_goals=care_plan.short_goals,
            long_goals=care_plan.long_goals,
            supports=care_plan.supports,
            monitoring=care_plan.monitoring,
            risk_considerations=care_plan.risk_considerations,
            emergency_contacts=care_plan.emergency_contacts,
            cultural_considerations=care_plan.cultural_considerations,
            communication_preferences=care_plan.communication_preferences,
            status=care_plan.status,
            created_at=care_plan.created_at.isoformat() if care_plan.created_at else "",
            updated_at=care_plan.updated_at.isoformat() if care_plan.updated_at else ""
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating care plan for participant {participant_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/participants/{participant_id}/care-plan", response_model=CarePlanResponse)
def get_care_plan(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Get the latest care plan for a participant"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Get the latest care plan
    care_plan = db.query(CarePlan).filter(
        CarePlan.participant_id == participant_id
    ).order_by(desc(CarePlan.created_at)).first()
    
    if not care_plan:
        raise HTTPException(status_code=404, detail="Care plan not found")
    
    return CarePlanResponse(
        id=care_plan.id,
        participant_id=care_plan.participant_id,
        plan_name=care_plan.plan_name,
        plan_version=care_plan.plan_version,
        plan_period=care_plan.plan_period,
        start_date=care_plan.start_date,
        end_date=care_plan.end_date,
        summary=care_plan.summary,
        participant_strengths=care_plan.participant_strengths,
        participant_preferences=care_plan.participant_preferences,
        family_goals=care_plan.family_goals,
        short_goals=care_plan.short_goals,
        long_goals=care_plan.long_goals,
        supports=care_plan.supports,
        monitoring=care_plan.monitoring,
        risk_considerations=care_plan.risk_considerations,
        emergency_contacts=care_plan.emergency_contacts,
        cultural_considerations=care_plan.cultural_considerations,
        communication_preferences=care_plan.communication_preferences,
        status=care_plan.status,
        created_at=care_plan.created_at.isoformat() if care_plan.created_at else "",
        updated_at=care_plan.updated_at.isoformat() if care_plan.updated_at else ""
    )

@router.put(
    "/participants/{participant_id}/care-plan",
    response_model=CarePlanResponse,
    dependencies=[Depends(require_perm("care.edit"))]
)
def update_care_plan(
    participant_id: int,
    care_plan_data: CarePlanUpdate,
    db: Session = Depends(get_db)
):
    """Update a care plan for a participant - FIXED WITH AUTO-FINALISATION"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get existing care plan
        care_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        if not care_plan:
            raise HTTPException(status_code=404, detail="Care plan not found")
        
        # Update fields that are provided
        update_data = care_plan_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(care_plan, field, value)
        
        care_plan.updated_at = datetime.now()
        
        # FIXED: Auto-finalise if it has required content and isn't already finalised
        if not getattr(care_plan, 'is_finalised', False):
            if care_plan.summary and care_plan.summary.strip():
                care_plan.is_finalised = True
                care_plan.finalised_at = datetime.now()
                care_plan.finalised_by = "System User"  # TODO: Get from auth context
                logger.info(f"Auto-finalised updated care plan for participant {participant_id}")
        
        db.commit()
        db.refresh(care_plan)
        
        logger.info(f"Care plan updated successfully for participant {participant_id}")
        
        return CarePlanResponse(
            id=care_plan.id,
            participant_id=care_plan.participant_id,
            plan_name=care_plan.plan_name,
            plan_version=care_plan.plan_version,
            plan_period=care_plan.plan_period,
            start_date=care_plan.start_date,
            end_date=care_plan.end_date,
            summary=care_plan.summary,
            participant_strengths=care_plan.participant_strengths,
            participant_preferences=care_plan.participant_preferences,
            family_goals=care_plan.family_goals,
            short_goals=care_plan.short_goals,
            long_goals=care_plan.long_goals,
            supports=care_plan.supports,
            monitoring=care_plan.monitoring,
            risk_considerations=care_plan.risk_considerations,
            emergency_contacts=care_plan.emergency_contacts,
            cultural_considerations=care_plan.cultural_considerations,
            communication_preferences=care_plan.communication_preferences,
            status=care_plan.status,
            created_at=care_plan.created_at.isoformat() if care_plan.created_at else "",
            updated_at=care_plan.updated_at.isoformat() if care_plan.updated_at else ""
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating care plan for participant {participant_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/participants/{participant_id}/care-plan/finalise")
def finalise_care_plan(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Mark the care plan as finalised"""
    try:
        care_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        if not care_plan:
            raise HTTPException(status_code=404, detail="Care plan not found")
        
        # Mark as finalised
        care_plan.is_finalised = True
        care_plan.finalised_at = datetime.now()
        care_plan.finalised_by = "System User"  # TODO: Get from auth context
        care_plan.updated_at = datetime.now()
        
        # Update workflow to reflect readiness for onboarding
        workflow = db.query(ProspectiveWorkflow).filter(
            ProspectiveWorkflow.participant_id == participant_id
        ).first()
        
        if workflow:
            workflow.ready_for_onboarding = True  # Care plan finalised is sufficient
            workflow.updated_at = datetime.now()
        
        db.commit()
        
        return {
            "message": "Care plan finalised successfully - participant ready for onboarding",
            "care_plan_id": care_plan.id,
            "is_finalised": care_plan.is_finalised,
            "finalised_at": care_plan.finalised_at.isoformat(),
            "ready_for_onboarding": True,
            "risk_assessment_required": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finalising care plan for participant {participant_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/participants/{participant_id}/care-plan/auto-finalise")
def auto_finalise_existing_care_plan(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Auto-finalise existing care plan if it exists but isn't finalised (helper endpoint)"""
    try:
        care_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        if not care_plan:
            raise HTTPException(status_code=404, detail="Care plan not found")
        
        # Check if already finalised
        if getattr(care_plan, 'is_finalised', False):
            return {
                "message": "Care plan already finalised",
                "care_plan_id": care_plan.id,
                "is_finalised": True,
                "ready_for_onboarding": True,
                "risk_assessment_required": False
            }
        
        # Auto-finalise if it has required content
        if care_plan.summary and care_plan.summary.strip():
            care_plan.is_finalised = True
            care_plan.finalised_at = datetime.now()
            care_plan.finalised_by = "Auto-finalised"
            care_plan.updated_at = datetime.now()
            
            # Update workflow
            workflow = db.query(ProspectiveWorkflow).filter(
                ProspectiveWorkflow.participant_id == participant_id
            ).first()
            
            if workflow:
                workflow.ready_for_onboarding = True
                workflow.updated_at = datetime.now()
            
            db.commit()
            
            return {
                "message": "Care plan auto-finalised successfully",
                "care_plan_id": care_plan.id,
                "is_finalised": True,
                "ready_for_onboarding": True,
                "risk_assessment_required": False
            }
        else:
            raise HTTPException(status_code=400, detail="Care plan needs summary to be finalised")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error auto-finalising care plan for participant {participant_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# RISK ASSESSMENT ENDPOINTS
# ============================================================================

@router.post(
    "/participants/{participant_id}/risk-assessment",
    response_model=RiskAssessmentResponse,
    dependencies=[Depends(require_perm("risk.edit"))]
)
def create_risk_assessment(
    participant_id: int,
    risk_assessment_data: RiskAssessmentCreate,
    db: Session = Depends(get_db)
):
    """Create a risk assessment for a participant (OPTIONAL)"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Check if risk assessment already exists
        existing_assessment = db.query(RiskAssessment).filter(RiskAssessment.participant_id == participant_id).first()
        if existing_assessment:
            # Update existing assessment instead of creating new one
            return update_risk_assessment(participant_id, risk_assessment_data, db)
        
        # Create risk assessment
        risk_assessment = RiskAssessment(
            participant_id=participant_id,
            **risk_assessment_data.dict()
        )
        db.add(risk_assessment)
        db.commit()
        db.refresh(risk_assessment)
        
        # Update prospective workflow
        workflow = db.query(ProspectiveWorkflow).filter(
            ProspectiveWorkflow.participant_id == participant_id
        ).first()
        
        if workflow:
            workflow.risk_assessment_completed = True
            workflow.risk_assessment_id = risk_assessment.id
            workflow.risk_assessment_completed_date = datetime.now()
            workflow.updated_at = datetime.now()
            
            # UPDATED: Ready for onboarding only requires care plan now
            workflow.ready_for_onboarding = workflow.care_plan_completed
        else:
            # Create workflow if it doesn't exist
            new_workflow = ProspectiveWorkflow(
                participant_id=participant_id,
                risk_assessment_completed=True,
                risk_assessment_id=risk_assessment.id,
                risk_assessment_completed_date=datetime.now()
            )
            db.add(new_workflow)
        
        db.commit()
        
        logger.info(f"Risk assessment created successfully for participant {participant_id}")
        
        return RiskAssessmentResponse(
            id=risk_assessment.id,
            participant_id=risk_assessment.participant_id,
            assessment_date=risk_assessment.assessment_date,
            assessor_name=risk_assessment.assessor_name,
            assessor_role=risk_assessment.assessor_role,
            review_date=risk_assessment.review_date,
            context=risk_assessment.context,
            risks=risk_assessment.risks,
            overall_risk_rating=risk_assessment.overall_risk_rating,
            emergency_procedures=risk_assessment.emergency_procedures,
            monitoring_requirements=risk_assessment.monitoring_requirements,
            staff_training_needs=risk_assessment.staff_training_needs,
            equipment_requirements=risk_assessment.equipment_requirements,
            environmental_modifications=risk_assessment.environmental_modifications,
            communication_plan=risk_assessment.communication_plan,
            family_involvement=risk_assessment.family_involvement,
            external_services=risk_assessment.external_services,
            review_schedule=risk_assessment.review_schedule,
            approval_status=risk_assessment.approval_status,
            notes=risk_assessment.notes,
            created_at=risk_assessment.created_at.isoformat() if risk_assessment.created_at else "",
            updated_at=risk_assessment.updated_at.isoformat() if risk_assessment.updated_at else ""
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating risk assessment for participant {participant_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/participants/{participant_id}/risk-assessment", response_model=RiskAssessmentResponse)
def get_risk_assessment(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Get the latest risk assessment for a participant"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Get the latest risk assessment
    risk_assessment = db.query(RiskAssessment).filter(
        RiskAssessment.participant_id == participant_id
    ).order_by(desc(RiskAssessment.created_at)).first()
    
    if not risk_assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    
    return RiskAssessmentResponse(
        id=risk_assessment.id,
        participant_id=risk_assessment.participant_id,
        assessment_date=risk_assessment.assessment_date,
        assessor_name=risk_assessment.assessor_name,
        assessor_role=risk_assessment.assessor_role,
        review_date=risk_assessment.review_date,
        context=risk_assessment.context,
        risks=risk_assessment.risks,
        overall_risk_rating=risk_assessment.overall_risk_rating,
        emergency_procedures=risk_assessment.emergency_procedures,
        monitoring_requirements=risk_assessment.monitoring_requirements,
        staff_training_needs=risk_assessment.staff_training_needs,
        equipment_requirements=risk_assessment.equipment_requirements,
        environmental_modifications=risk_assessment.environmental_modifications,
        communication_plan=risk_assessment.communication_plan,
        family_involvement=risk_assessment.family_involvement,
        external_services=risk_assessment.external_services,
        review_schedule=risk_assessment.review_schedule,
        approval_status=risk_assessment.approval_status,
        notes=risk_assessment.notes,
        created_at=risk_assessment.created_at.isoformat() if risk_assessment.created_at else "",
        updated_at=risk_assessment.updated_at.isoformat() if risk_assessment.updated_at else ""
    )

@router.put(
    "/participants/{participant_id}/risk-assessment",
    response_model=RiskAssessmentResponse,
    dependencies=[Depends(require_perm("risk.edit"))]
)
def update_risk_assessment(
    participant_id: int,
    risk_assessment_data: RiskAssessmentUpdate,
    db: Session = Depends(get_db)
):
    """Update a risk assessment for a participant"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get existing risk assessment
        risk_assessment = db.query(RiskAssessment).filter(
            RiskAssessment.participant_id == participant_id
        ).order_by(desc(RiskAssessment.created_at)).first()
        
        if not risk_assessment:
            raise HTTPException(status_code=404, detail="Risk assessment not found")
        
        # Update fields that are provided
        update_data = risk_assessment_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(risk_assessment, field, value)
        
        risk_assessment.updated_at = datetime.now()
        db.commit()
        db.refresh(risk_assessment)
        
        logger.info(f"Risk assessment updated successfully for participant {participant_id}")
        
        return RiskAssessmentResponse(
            id=risk_assessment.id,
            participant_id=risk_assessment.participant_id,
            assessment_date=risk_assessment.assessment_date,
            assessor_name=risk_assessment.assessor_name,
            assessor_role=risk_assessment.assessor_role,
            review_date=risk_assessment.review_date,
            context=risk_assessment.context,
            risks=risk_assessment.risks,
            overall_risk_rating=risk_assessment.overall_risk_rating,
            emergency_procedures=risk_assessment.emergency_procedures,
            monitoring_requirements=risk_assessment.monitoring_requirements,
            staff_training_needs=risk_assessment.staff_training_needs,
            equipment_requirements=risk_assessment.equipment_requirements,
            environmental_modifications=risk_assessment.environmental_modifications,
            communication_plan=risk_assessment.communication_plan,
            family_involvement=risk_assessment.family_involvement,
            external_services=risk_assessment.external_services,
            review_schedule=risk_assessment.review_schedule,
            approval_status=risk_assessment.approval_status,
            notes=risk_assessment.notes,
            created_at=risk_assessment.created_at.isoformat() if risk_assessment.created_at else "",
            updated_at=risk_assessment.updated_at.isoformat() if risk_assessment.updated_at else ""
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating risk assessment for participant {participant_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/participants/{participant_id}/risk-assessment/finalise")
def finalise_risk_assessment(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Mark the risk assessment as finalised (OPTIONAL)"""
    try:
        risk_assessment = db.query(RiskAssessment).filter(
            RiskAssessment.participant_id == participant_id
        ).order_by(desc(RiskAssessment.created_at)).first()
        
        if not risk_assessment:
            raise HTTPException(status_code=404, detail="Risk assessment not found")
        
        # Mark as finalised
        risk_assessment.is_finalised = True
        risk_assessment.finalised_at = datetime.now()
        risk_assessment.finalised_by = "System User"  # TODO: Get from auth context
        risk_assessment.updated_at = datetime.now()
        
        db.commit()
        
        return {
            "message": "Risk assessment finalised successfully (optional step)",
            "risk_assessment_id": risk_assessment.id,
            "is_finalised": risk_assessment.is_finalised,
            "finalised_at": risk_assessment.finalised_at.isoformat(),
            "note": "Risk assessment finalisation is optional for onboarding"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finalising risk assessment for participant {participant_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CARE PLAN VERSIONING ENDPOINTS
# ============================================================================

@router.get("/participants/{participant_id}/care-plan/versions")
def get_care_plan_versions(
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Get all versions of care plan for a participant"""
    from app.models.care_plan_version import CarePlanVersion
    
    versions = db.query(CarePlanVersion).filter(
        CarePlanVersion.participant_id == participant_id
    ).order_by(CarePlanVersion.created_at.desc()).all()
    
    return [{
        "id": v.id,
        "version_number": v.version_number,
        "status": v.status,
        "revision_note": v.revision_note,
        "created_by": v.created_by,
        "created_at": v.created_at
    } for v in versions]


@router.post("/participants/{participant_id}/care-plan/versions")
def create_care_plan_version(
    participant_id: int,
    version_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Create a new version/revision of care plan"""
    from app.models.care_plan_version import CarePlanVersion
    from app.models import CarePlan
    from datetime import datetime
    
    # Get current care plan
    current_plan = db.query(CarePlan).filter(
        CarePlan.participant_id == participant_id
    ).order_by(CarePlan.created_at.desc()).first()
    
    if not current_plan:
        raise HTTPException(status_code=404, detail="No care plan found")
    
    # Get existing versions to calculate new version number
    existing_versions = db.query(CarePlanVersion).filter(
        CarePlanVersion.participant_id == participant_id
    ).count()
    
    new_version_number = f"1.{existing_versions + 1}"
    
    # Create version record
    version = CarePlanVersion(
        care_plan_id=current_plan.id,
        participant_id=participant_id,
        version_number=new_version_number,
        status="draft",
        revision_note=version_data.get("revision_note", ""),
        created_by=current_user.full_name or current_user.email,
        plan_data={
            "plan_name": current_plan.plan_name,
            "summary": current_plan.summary,
            "short_goals": current_plan.short_goals,
            "long_goals": current_plan.long_goals,
            "supports": current_plan.supports,
            "monitoring": current_plan.monitoring
        }
    )
    
    db.add(version)
    db.commit()
    db.refresh(version)
    
    return {
        "message": "Version created",
        "version_id": version.id,
        "version_number": version.version_number
    }


@router.get("/participants/{participant_id}/care-plan/versions/{version_id}")
def get_care_plan_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Get a specific care plan version"""
    from app.models.care_plan_version import CarePlanVersion
    
    version = db.query(CarePlanVersion).filter(
        CarePlanVersion.id == version_id,
        CarePlanVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return {
        "id": version.id,
        "version_number": version.version_number,
        "status": version.status,
        "revision_note": version.revision_note,
        "created_by": version.created_by,
        "created_at": version.created_at,
        **version.plan_data
    }


@router.put("/participants/{participant_id}/care-plan/versions/{version_id}")
def update_care_plan_version(
    participant_id: int,
    version_id: int,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Update a draft care plan version"""
    from app.models.care_plan_version import CarePlanVersion
    from datetime import datetime
    
    version = db.query(CarePlanVersion).filter(
        CarePlanVersion.id == version_id,
        CarePlanVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != "draft":
        raise HTTPException(status_code=400, detail="Can only update draft versions")
    
    version.plan_data = {
        "plan_name": update_data.get("plan_name"),
        "summary": update_data.get("summary"),
        "short_goals": update_data.get("short_goals"),
        "long_goals": update_data.get("long_goals"),
        "supports": update_data.get("supports"),
        "monitoring": update_data.get("monitoring")
    }
    
    version.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(version)
    
    return {"message": "Version updated successfully", "version_id": version.id}


@router.post("/participants/{participant_id}/care-plan/versions/{version_id}/publish")
def publish_care_plan_version(
    participant_id: int,
    version_id: int,
    publish_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Publish a draft version as the current care plan"""
    from app.models.care_plan_version import CarePlanVersion
    from app.models import CarePlan
    from datetime import datetime
    
    version = db.query(CarePlanVersion).filter(
        CarePlanVersion.id == version_id,
        CarePlanVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != "draft":
        raise HTTPException(status_code=400, detail="Can only publish draft versions")
    
    # Mark all other versions as superseded
    db.query(CarePlanVersion).filter(
        CarePlanVersion.participant_id == participant_id,
        CarePlanVersion.status == "current"
    ).update({"status": "superseded"})
    
    # Mark this version as current
    version.status = "current"
    version.approved_by = publish_data.get("approved_by", current_user.full_name or current_user.email)
    version.approved_at = datetime.utcnow()
    
    # Update the main care plan record
    care_plan = db.query(CarePlan).filter(
        CarePlan.id == version.care_plan_id
    ).first()
    
    if care_plan:
        for key, value in version.plan_data.items():
            if hasattr(care_plan, key):
                setattr(care_plan, key, value)
        care_plan.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(version)
    
    return {
        "message": "Version published successfully",
        "version_id": version.id,
        "version_number": version.version_number,
        "status": version.status
    }


@router.delete("/participants/{participant_id}/care-plan/versions/{version_id}")
def delete_care_plan_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Delete a draft care plan version"""
    from app.models.care_plan_version import CarePlanVersion
    
    version = db.query(CarePlanVersion).filter(
        CarePlanVersion.id == version_id,
        CarePlanVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != "draft":
        raise HTTPException(status_code=400, detail="Can only delete draft versions")
    
    db.delete(version)
    db.commit()
    
    return {"message": "Version deleted successfully"}


# ============================================================================
# RISK ASSESSMENT VERSIONING ENDPOINTS
# ============================================================================

@router.get("/participants/{participant_id}/risk-assessment/versions")
def get_risk_assessment_versions(
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Get all versions of risk assessment for a participant"""
    from app.models.risk_assessment_version import RiskAssessmentVersion
    
    versions = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.participant_id == participant_id
    ).order_by(RiskAssessmentVersion.created_at.desc()).all()
    
    return [{
        "id": v.id,
        "version_number": v.version_number,
        "status": v.status,
        "revision_note": v.revision_note,
        "created_by": v.created_by,
        "created_at": v.created_at
    } for v in versions]


@router.post("/participants/{participant_id}/risk-assessment/versions")
def create_risk_assessment_version(
    participant_id: int,
    version_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Create a new version/revision of risk assessment"""
    from app.models.risk_assessment_version import RiskAssessmentVersion
    from app.models import RiskAssessment
    from datetime import datetime
    
    # Get current risk assessment
    current_assessment = db.query(RiskAssessment).filter(
        RiskAssessment.participant_id == participant_id
    ).order_by(RiskAssessment.created_at.desc()).first()
    
    if not current_assessment:
        raise HTTPException(status_code=404, detail="No risk assessment found")
    
    # Get existing versions to calculate new version number
    existing_versions = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.participant_id == participant_id
    ).count()
    
    new_version_number = f"1.{existing_versions + 1}"
    
    # Create version record
    version = RiskAssessmentVersion(
        risk_assessment_id=current_assessment.id,
        participant_id=participant_id,
        version_number=new_version_number,
        status="draft",
        revision_note=version_data.get("revision_note", ""),
        created_by=current_user.full_name or current_user.email,
        assessment_data={
            "assessment_date": str(current_assessment.assessment_date),
            "assessor_name": current_assessment.assessor_name,
            "assessor_role": current_assessment.assessor_role,
            "review_date": str(current_assessment.review_date),
            "context": current_assessment.context,
            "risks": current_assessment.risks,
            "overall_risk_rating": current_assessment.overall_risk_rating,
            "emergency_procedures": current_assessment.emergency_procedures,
            "monitoring_requirements": current_assessment.monitoring_requirements,
            "staff_training_needs": current_assessment.staff_training_needs,
            "equipment_requirements": current_assessment.equipment_requirements,
            "environmental_modifications": current_assessment.environmental_modifications,
            "communication_plan": current_assessment.communication_plan,
            "family_involvement": current_assessment.family_involvement,
            "external_services": current_assessment.external_services,
            "review_schedule": current_assessment.review_schedule,
            "notes": current_assessment.notes
        }
    )
    
    db.add(version)
    db.commit()
    db.refresh(version)
    
    return {
        "message": "Version created",
        "version_id": version.id,
        "version_number": version.version_number
    }


@router.get("/participants/{participant_id}/risk-assessment/versions/{version_id}")
def get_risk_assessment_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Get a specific risk assessment version"""
    from app.models.risk_assessment_version import RiskAssessmentVersion
    
    version = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.id == version_id,
        RiskAssessmentVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Return the stored assessment_data with version metadata
    return {
        "id": version.id,
        "version_number": version.version_number,
        "status": version.status,
        "revision_note": version.revision_note,
        "created_by": version.created_by,
        "created_at": version.created_at,
        **version.assessment_data  # Include all assessment fields
    }


@router.put("/participants/{participant_id}/risk-assessment/versions/{version_id}")
def update_risk_assessment_version(
    participant_id: int,
    version_id: int,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Update a draft risk assessment version"""
    from app.models.risk_assessment_version import RiskAssessmentVersion
    from datetime import datetime
    
    version = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.id == version_id,
        RiskAssessmentVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != "draft":
        raise HTTPException(status_code=400, detail="Can only update draft versions")
    
    # Update the assessment_data
    version.assessment_data = {
        "assessment_date": update_data.get("assessment_date"),
        "assessor_name": update_data.get("assessor_name"),
        "assessor_role": update_data.get("assessor_role"),
        "review_date": update_data.get("review_date"),
        "context": update_data.get("context"),
        "risks": update_data.get("risks"),
        "overall_risk_rating": update_data.get("overall_risk_rating"),
        "emergency_procedures": update_data.get("emergency_procedures"),
        "monitoring_requirements": update_data.get("monitoring_requirements"),
        "staff_training_needs": update_data.get("staff_training_needs"),
        "equipment_requirements": update_data.get("equipment_requirements"),
        "environmental_modifications": update_data.get("environmental_modifications"),
        "communication_plan": update_data.get("communication_plan"),
        "family_involvement": update_data.get("family_involvement"),
        "external_services": update_data.get("external_services"),
        "review_schedule": update_data.get("review_schedule"),
        "notes": update_data.get("notes")
    }
    
    version.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(version)
    
    return {"message": "Version updated successfully", "version_id": version.id}


@router.post("/participants/{participant_id}/risk-assessment/versions/{version_id}/publish")
def publish_risk_assessment_version(
    participant_id: int,
    version_id: int,
    publish_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Publish a draft version as the current risk assessment"""
    from app.models.risk_assessment_version import RiskAssessmentVersion
    from app.models import RiskAssessment
    from datetime import datetime
    
    version = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.id == version_id,
        RiskAssessmentVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != "draft":
        raise HTTPException(status_code=400, detail="Can only publish draft versions")
    
    # Mark all other versions as superseded
    db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.participant_id == participant_id,
        RiskAssessmentVersion.status == "current"
    ).update({"status": "superseded"})
    
    # Mark this version as current
    version.status = "current"
    version.approved_by = publish_data.get("approved_by", current_user.full_name or current_user.email)
    version.approved_at = datetime.utcnow()
    
    # Update the main risk assessment record
    risk_assessment = db.query(RiskAssessment).filter(
        RiskAssessment.id == version.risk_assessment_id
    ).first()
    
    if risk_assessment:
        # Update main record with version data
        for key, value in version.assessment_data.items():
            if hasattr(risk_assessment, key):
                setattr(risk_assessment, key, value)
        risk_assessment.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(version)
    
    return {
        "message": "Version published successfully",
        "version_id": version.id,
        "version_number": version.version_number,
        "status": version.status
    }


@router.delete("/participants/{participant_id}/risk-assessment/versions/{version_id}")
def delete_risk_assessment_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PROVIDER_ADMIN", "SERVICE_MANAGER"))
):
    """Delete a draft risk assessment version"""
    from app.models.risk_assessment_version import RiskAssessmentVersion
    
    version = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.id == version_id,
        RiskAssessmentVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != "draft":
        raise HTTPException(status_code=400, detail="Can only delete draft versions")
    
    db.delete(version)
    db.commit()
    
    return {"message": "Version deleted successfully"}


# ============================================================================
# DEBUG ENDPOINT
# ============================================================================

@router.get("/participants/{participant_id}/care-plan/debug", tags=["debug"])
def debug_care_plan(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Debug endpoint to check care plan supports data"""
    try:
        # Get the care plan
        care_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        if not care_plan:
            return {"error": "No care plan found"}
        
        return {
            "care_plan_id": care_plan.id,
            "participant_id": care_plan.participant_id,
            "plan_name": care_plan.plan_name,
            "is_finalised": getattr(care_plan, 'is_finalised', False),
            "status": care_plan.status,
            "supports_raw": care_plan.supports,
            "supports_type": type(care_plan.supports).__name__,
            "supports_length": len(care_plan.supports) if care_plan.supports else 0,
            "supports_sample": care_plan.supports[0] if care_plan.supports and len(care_plan.supports) > 0 else None,
            "created_at": care_plan.created_at.isoformat() if care_plan.created_at else None,
            "all_fields": {
                "summary": care_plan.summary[:100] if care_plan.summary else None,
                "participant_strengths": care_plan.participant_strengths[:100] if care_plan.participant_strengths else None,
                "short_goals": care_plan.short_goals,
                "long_goals": care_plan.long_goals,
                "supports": care_plan.supports,
                "monitoring": care_plan.monitoring
            }
        }
        
    except Exception as e:
        return {"error": str(e)}