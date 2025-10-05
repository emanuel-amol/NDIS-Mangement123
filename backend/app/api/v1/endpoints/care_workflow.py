# backend/app/api/v1/endpoints/care_workflow.py - COMPLETE CORRECTED VERSION
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.participant import Participant
from app.models.care_plan import CarePlan, RiskAssessment, ProspectiveWorkflow
from app.schemas.care_workflow import (
    CarePlanCreate, CarePlanResponse, CarePlanUpdate,
    RiskAssessmentCreate, RiskAssessmentResponse, RiskAssessmentUpdate,
    ProspectiveWorkflowResponse
)
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Prospective Workflow Endpoints

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
    
    # Include documents_generated in response
    return ProspectiveWorkflowResponse(
        id=workflow.id,
        participant_id=workflow.participant_id,
        care_plan_completed=workflow.care_plan_completed,
        risk_assessment_completed=workflow.risk_assessment_completed,
        documents_generated=getattr(workflow, 'documents_generated', False),
        quotation_generated=getattr(workflow, 'quotation_generated', False),
        ai_review_completed=getattr(workflow, 'ai_review_completed', False),
        ready_for_onboarding=getattr(workflow, 'ready_for_onboarding', False),
        care_plan_id=workflow.care_plan_id,
        risk_assessment_id=workflow.risk_assessment_id,
        care_plan_completed_date=workflow.care_plan_completed_date,
        risk_assessment_completed_date=workflow.risk_assessment_completed_date,
        documents_generated_date=getattr(workflow, 'documents_generated_date', None),
        quotation_generated_date=getattr(workflow, 'quotation_generated_date', None),
        workflow_notes=getattr(workflow, 'workflow_notes', None),
        manager_comments=getattr(workflow, 'manager_comments', None),
        created_at=workflow.created_at.isoformat() if workflow.created_at else "",
        updated_at=workflow.updated_at.isoformat() if workflow.updated_at else "",
        participant_name=f"{participant.first_name} {participant.last_name}",
        participant_status=participant.status
    )

@router.post("/participants/{participant_id}/convert-to-onboarded")
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
    - Manager approval is OPTIONAL (not required)
    """
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
        raise HTTPException(status_code=409, detail="Care Plan must exist before onboarding.")

    if not getattr(latest_care_plan, "is_finalised", False):
        raise HTTPException(status_code=409, detail="Care Plan must be finalised before onboarding.")

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
            care_plan_completed_date=getattr(latest_care_plan, "created_at", datetime.now()),
            risk_assessment_completed_date=getattr(latest_risk_assessment, "created_at", None) if latest_risk_assessment else None
        )
        db.add(workflow)
        db.flush()

    # Update participant + workflow atomically
    participant.status = "onboarded"
    participant.onboarding_completed = True
    participant.care_plan_completed = True
    participant.updated_at = datetime.now()

    # Ready for onboarding only requires finalised care plan
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
        "risk_assessment_required": False
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
            workflow = ProspectiveWorkflow(participant_id=participant_id)
            db.add(workflow)
            db.commit()
            db.refresh(workflow)
        
        allowed_fields = [
            'care_plan_completed', 'risk_assessment_completed', 
            'ai_review_completed', 'quotation_generated', 'documents_generated',
            'workflow_notes', 'manager_comments'
        ]
        
        updated_fields = []
        for field, value in status_updates.items():
            if field in allowed_fields:
                setattr(workflow, field, value)
                updated_fields.append(field)
        
        # Auto-calculate ready_for_onboarding (only requires care plan now)
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
    """Get onboarding requirements status"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    latest_care_plan = db.query(CarePlan).filter(
        CarePlan.participant_id == participant_id
    ).order_by(desc(CarePlan.created_at)).first()
    
    care_plan_exists = latest_care_plan is not None
    care_plan_finalised = getattr(latest_care_plan, "is_finalised", False) if latest_care_plan else False
    
    latest_risk_assessment = db.query(RiskAssessment).filter(
        RiskAssessment.participant_id == participant_id
    ).order_by(desc(RiskAssessment.created_at)).first()
    
    risk_assessment_exists = latest_risk_assessment is not None
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
                "required": False,
                "exists": risk_assessment_exists,
                "status": "optional",
                "risk_assessment_id": latest_risk_assessment.id if latest_risk_assessment else None
            }
        },
        "can_onboard": can_onboard,
        "blocking_issues": [] if can_onboard else ["Care plan must exist and be finalised"],
        "ready_for_onboarding": can_onboard
    }

# Care Plan Endpoints

@router.post("/participants/{participant_id}/care-plan", response_model=CarePlanResponse)
def create_care_plan(
    participant_id: int,
    care_plan_data: CarePlanCreate,
    db: Session = Depends(get_db)
):
    """Create a care plan for a participant with auto-finalisation"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Check if care plan already exists
        existing_plan = db.query(CarePlan).filter(CarePlan.participant_id == participant_id).first()
        if existing_plan:
            return update_care_plan(participant_id, care_plan_data, db)
        
        # Create care plan
        care_plan = CarePlan(
            participant_id=participant_id,
            **care_plan_data.dict()
        )
        
        # Auto-finalise if it has required content
        if care_plan.summary and care_plan.summary.strip():
            care_plan.is_finalised = True
            care_plan.finalised_at = datetime.now()
            care_plan.finalised_by = "System User"
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
            workflow.ready_for_onboarding = workflow.care_plan_completed
            workflow.updated_at = datetime.now()
        else:
            new_workflow = ProspectiveWorkflow(
                participant_id=participant_id,
                care_plan_completed=True,
                care_plan_id=care_plan.id,
                care_plan_completed_date=datetime.now(),
                ready_for_onboarding=True
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

@router.put("/participants/{participant_id}/care-plan", response_model=CarePlanResponse)
def update_care_plan(
    participant_id: int,
    care_plan_data: CarePlanUpdate,
    db: Session = Depends(get_db)
):
    """Update a care plan for a participant with auto-finalisation"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
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
        
        # Auto-finalise if it has required content and isn't already finalised
        if not getattr(care_plan, 'is_finalised', False):
            if care_plan.summary and care_plan.summary.strip():
                care_plan.is_finalised = True
                care_plan.finalised_at = datetime.now()
                care_plan.finalised_by = "System User"
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

# Risk Assessment Endpoints

@router.post("/participants/{participant_id}/risk-assessment", response_model=RiskAssessmentResponse)
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
        
        existing_assessment = db.query(RiskAssessment).filter(RiskAssessment.participant_id == participant_id).first()
        if existing_assessment:
            return update_risk_assessment(participant_id, risk_assessment_data, db)
        
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
            workflow.ready_for_onboarding = workflow.care_plan_completed
            workflow.updated_at = datetime.now()
        else:
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

@router.put("/participants/{participant_id}/risk-assessment", response_model=RiskAssessmentResponse)
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
        
        risk_assessment = db.query(RiskAssessment).filter(
            RiskAssessment.participant_id == participant_id
        ).order_by(desc(RiskAssessment.created_at)).first()
        
        if not risk_assessment:
            raise HTTPException(status_code=404, detail="Risk assessment not found")
        
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

# Finalisation Endpoints

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
        
        care_plan.is_finalised = True
        care_plan.finalised_at = datetime.now()
        care_plan.finalised_by = "System User"
        care_plan.updated_at = datetime.now()
        
        workflow = db.query(ProspectiveWorkflow).filter(
            ProspectiveWorkflow.participant_id == participant_id
        ).first()
        
        if workflow:
            workflow.ready_for_onboarding = True
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
    """Auto-finalise existing care plan if it exists but isn't finalised"""
    try:
        care_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        if not care_plan:
            raise HTTPException(status_code=404, detail="Care plan not found")
        
        if getattr(care_plan, 'is_finalised', False):
            return {
                "message": "Care plan already finalised",
                "care_plan_id": care_plan.id,
                "is_finalised": True,
                "ready_for_onboarding": True,
                "risk_assessment_required": False
            }
        
        if care_plan.summary and care_plan.summary.strip():
            care_plan.is_finalised = True
            care_plan.finalised_at = datetime.now()
            care_plan.finalised_by = "Auto-finalised"
            care_plan.updated_at = datetime.now()
            
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
        
        risk_assessment.is_finalised = True
        risk_assessment.finalised_at = datetime.now()
        risk_assessment.finalised_by = "System User"
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

# Debug Endpoint

@router.get("/participants/{participant_id}/care-plan/debug", tags=["debug"])
def debug_care_plan(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Debug endpoint to check care plan data"""
    try:
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