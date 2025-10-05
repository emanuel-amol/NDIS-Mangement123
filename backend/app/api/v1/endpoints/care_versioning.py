# backend/app/api/v1/endpoints/care_versioning.py - COMPLETE FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from app.core.database import get_db
from app.models.participant import Participant
from app.models.care_plan import CarePlan, RiskAssessment, CarePlanVersion, RiskAssessmentVersion
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# ===== SCHEMAS =====

class VersionCreateRequest(BaseModel):
    base_version_id: str  # 'current' or version ID
    revision_note: str

class VersionPublishRequest(BaseModel):
    approved_by: str
    approval_comments: Optional[str] = None

# ===== CARE PLAN VERSIONING ENDPOINTS =====

@router.post("/participants/{participant_id}/care-plan/versions")
async def create_care_plan_version(
    participant_id: int,
    request: VersionCreateRequest,
    db: Session = Depends(get_db)
):
    """Create a new care plan version for editing"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Check if draft already exists
        existing_draft = db.query(CarePlanVersion).filter(
            and_(
                CarePlanVersion.participant_id == participant_id,
                CarePlanVersion.status == 'draft'
            )
        ).first()
        
        if existing_draft:
            raise HTTPException(
                status_code=400, 
                detail="A draft version already exists. Please complete or discard it first."
            )
        
        # Get base version data
        if request.base_version_id == 'current':
            current = db.query(CarePlan).filter(
                CarePlan.participant_id == participant_id
            ).order_by(desc(CarePlan.created_at)).first()
            
            if not current:
                raise HTTPException(status_code=404, detail="No current care plan found")
            
            base_data = {
                'plan_name': current.plan_name,
                'plan_version': current.plan_version,
                'plan_period': current.plan_period,
                'start_date': current.start_date.isoformat() if current.start_date else None,
                'end_date': current.end_date.isoformat() if current.end_date else None,
                'summary': current.summary,
                'participant_strengths': current.participant_strengths,
                'participant_preferences': current.participant_preferences,
                'family_goals': current.family_goals,
                'short_goals': current.short_goals,
                'long_goals': current.long_goals,
                'supports': current.supports,
                'monitoring': current.monitoring,
                'risk_considerations': current.risk_considerations,
                'emergency_contacts': current.emergency_contacts,
                'cultural_considerations': current.cultural_considerations,
                'communication_preferences': current.communication_preferences,
                'status': current.status
            }
            base_version_num = current.plan_version or "1.0"
        else:
            base_version = db.query(CarePlanVersion).filter(
                CarePlanVersion.id == int(request.base_version_id)
            ).first()
            
            if not base_version:
                raise HTTPException(status_code=404, detail="Base version not found")
            
            base_data = base_version.data
            base_version_num = base_version.version_number
        
        # Calculate new version number
        major, minor = base_version_num.split('.')
        new_version_num = f"{major}.{int(minor) + 1}"
        
        # Create new version
        new_version = CarePlanVersion(
            participant_id=participant_id,
            version_number=new_version_num,
            data=base_data,
            status='draft',
            revision_note=request.revision_note,
            created_by='System User'
        )
        
        db.add(new_version)
        db.commit()
        db.refresh(new_version)
        
        return {
            "version_id": new_version.id,
            "version_number": new_version.version_number,
            "status": new_version.status,
            "edit_url": f"/care/plan/{participant_id}/versions/{new_version.id}/edit",
            "message": "Draft version created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating care plan version: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/participants/{participant_id}/care-plan/versions/{version_id}")
async def get_care_plan_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific care plan version"""
    version = db.query(CarePlanVersion).filter(
        and_(
            CarePlanVersion.id == version_id,
            CarePlanVersion.participant_id == participant_id
        )
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return {
        "id": version.id,
        "participant_id": version.participant_id,
        "version_number": version.version_number,
        "status": version.status,
        "revision_note": version.revision_note,
        "created_at": version.created_at.isoformat() if version.created_at else None,
        "published_at": version.published_at.isoformat() if version.published_at else None,
        "approved_by": version.approved_by,
        **version.data
    }

@router.get("/participants/{participant_id}/care-plan/versions")
async def list_care_plan_versions(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """List all versions for a care plan"""
    versions = db.query(CarePlanVersion).filter(
        CarePlanVersion.participant_id == participant_id
    ).order_by(desc(CarePlanVersion.created_at)).all()
    
    return [
        {
            "id": v.id,
            "version_number": v.version_number,
            "status": v.status,
            "revision_note": v.revision_note,
            "plan_name": v.data.get('plan_name') if v.data else None,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "published_at": v.published_at.isoformat() if v.published_at else None,
            "approved_by": v.approved_by
        }
        for v in versions
    ]

@router.put("/participants/{participant_id}/care-plan/versions/{version_id}")
async def update_care_plan_version(
    participant_id: int,
    version_id: int,
    data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Update a draft care plan version"""
    version = db.query(CarePlanVersion).filter(
        and_(
            CarePlanVersion.id == version_id,
            CarePlanVersion.participant_id == participant_id
        )
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != 'draft':
        raise HTTPException(status_code=400, detail="Only draft versions can be edited")
    
    # Update version data
    version.data = data
    version.updated_at = datetime.now()
    
    db.commit()
    db.refresh(version)
    
    return {"message": "Version updated successfully", "version_id": version.id}

@router.post("/participants/{participant_id}/care-plan/versions/{version_id}/publish")
async def publish_care_plan_version(
    participant_id: int,
    version_id: int,
    approval: VersionPublishRequest,
    db: Session = Depends(get_db)
):
    """Publish a care plan version as current"""
    try:
        version = db.query(CarePlanVersion).filter(
            and_(
                CarePlanVersion.id == version_id,
                CarePlanVersion.participant_id == participant_id
            )
        ).first()
        
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        
        if version.status != 'draft':
            raise HTTPException(status_code=400, detail="Only draft versions can be published")
        
        # Get current care plan
        current = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        if current:
            # Archive current version
            archive = CarePlanVersion(
                participant_id=participant_id,
                version_number=current.plan_version or "1.0",
                data={
                    'plan_name': current.plan_name,
                    'plan_version': current.plan_version,
                    'plan_period': current.plan_period,
                    'start_date': current.start_date.isoformat() if current.start_date else None,
                    'end_date': current.end_date.isoformat() if current.end_date else None,
                    'summary': current.summary,
                    'participant_strengths': current.participant_strengths,
                    'participant_preferences': current.participant_preferences,
                    'family_goals': current.family_goals,
                    'short_goals': current.short_goals,
                    'long_goals': current.long_goals,
                    'supports': current.supports,
                    'monitoring': current.monitoring,
                    'risk_considerations': current.risk_considerations,
                    'emergency_contacts': current.emergency_contacts,
                    'cultural_considerations': current.cultural_considerations,
                    'communication_preferences': current.communication_preferences,
                    'status': current.status
                },
                status='archived',
                created_by=current.created_by or 'System'
            )
            db.add(archive)
            
            # Update current with version data
            current.plan_name = version.data.get('plan_name')
            current.plan_version = version.version_number
            current.plan_period = version.data.get('plan_period')
            current.start_date = version.data.get('start_date')
            current.end_date = version.data.get('end_date')
            current.summary = version.data.get('summary')
            current.participant_strengths = version.data.get('participant_strengths')
            current.participant_preferences = version.data.get('participant_preferences')
            current.family_goals = version.data.get('family_goals')
            current.short_goals = version.data.get('short_goals')
            current.long_goals = version.data.get('long_goals')
            current.supports = version.data.get('supports')
            current.monitoring = version.data.get('monitoring')
            current.risk_considerations = version.data.get('risk_considerations')
            current.emergency_contacts = version.data.get('emergency_contacts')
            current.cultural_considerations = version.data.get('cultural_considerations')
            current.communication_preferences = version.data.get('communication_preferences')
            current.updated_at = datetime.now()
        
        # Update version status
        version.status = 'current'
        version.published_at = datetime.now()
        version.approved_by = approval.approved_by
        
        db.commit()
        
        return {
            "message": "Version published successfully",
            "version_id": version.id,
            "version_number": version.version_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing care plan version: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/participants/{participant_id}/care-plan/versions/{version_id}")
async def delete_care_plan_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Delete a draft care plan version"""
    version = db.query(CarePlanVersion).filter(
        and_(
            CarePlanVersion.id == version_id,
            CarePlanVersion.participant_id == participant_id
        )
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != 'draft':
        raise HTTPException(status_code=400, detail="Only draft versions can be deleted")
    
    db.delete(version)
    db.commit()
    
    return {"message": "Draft version deleted successfully"}

# ===== RISK ASSESSMENT VERSIONING ENDPOINTS =====

@router.post("/participants/{participant_id}/risk-assessment/versions")
async def create_risk_assessment_version(
    participant_id: int,
    request: VersionCreateRequest,
    db: Session = Depends(get_db)
):
    """Create a new risk assessment version for editing"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Check if draft already exists
        existing_draft = db.query(RiskAssessmentVersion).filter(
            and_(
                RiskAssessmentVersion.participant_id == participant_id,
                RiskAssessmentVersion.status == 'draft'
            )
        ).first()
        
        if existing_draft:
            raise HTTPException(
                status_code=400, 
                detail="A draft version already exists. Please complete or discard it first."
            )
        
        # Get base version data
        if request.base_version_id == 'current':
            current = db.query(RiskAssessment).filter(
                RiskAssessment.participant_id == participant_id
            ).order_by(desc(RiskAssessment.created_at)).first()
            
            if not current:
                raise HTTPException(status_code=404, detail="No current risk assessment found")
            
            base_data = {
                'assessment_date': current.assessment_date.isoformat() if current.assessment_date else None,
                'assessor_name': current.assessor_name,
                'assessor_role': current.assessor_role,
                'review_date': current.review_date.isoformat() if current.review_date else None,
                'context': current.context,
                'risks': current.risks,
                'overall_risk_rating': current.overall_risk_rating,
                'emergency_procedures': current.emergency_procedures,
                'monitoring_requirements': current.monitoring_requirements,
                'staff_training_needs': current.staff_training_needs,
                'equipment_requirements': current.equipment_requirements,
                'environmental_modifications': current.environmental_modifications,
                'communication_plan': current.communication_plan,
                'family_involvement': current.family_involvement,
                'external_services': current.external_services,
                'review_schedule': current.review_schedule,
                'approval_status': current.approval_status,
                'notes': current.notes
            }
            base_version_num = "1.0"  # Risk assessments don't have version numbers stored
        else:
            base_version = db.query(RiskAssessmentVersion).filter(
                RiskAssessmentVersion.id == int(request.base_version_id)
            ).first()
            
            if not base_version:
                raise HTTPException(status_code=404, detail="Base version not found")
            
            base_data = base_version.data
            base_version_num = base_version.version_number
        
        # Calculate new version number
        major, minor = base_version_num.split('.')
        new_version_num = f"{major}.{int(minor) + 1}"
        
        # Create new version
        new_version = RiskAssessmentVersion(
            participant_id=participant_id,
            version_number=new_version_num,
            data=base_data,
            status='draft',
            revision_note=request.revision_note,
            created_by='System User'
        )
        
        db.add(new_version)
        db.commit()
        db.refresh(new_version)
        
        return {
            "version_id": new_version.id,
            "version_number": new_version.version_number,
            "status": new_version.status,
            "edit_url": f"/care/risk-assessment/{participant_id}/versions/{new_version.id}/edit",
            "message": "Draft version created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating risk assessment version: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/participants/{participant_id}/risk-assessment/versions/{version_id}")
async def get_risk_assessment_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific risk assessment version"""
    version = db.query(RiskAssessmentVersion).filter(
        and_(
            RiskAssessmentVersion.id == version_id,
            RiskAssessmentVersion.participant_id == participant_id
        )
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return {
        "id": version.id,
        "participant_id": version.participant_id,
        "version_number": version.version_number,
        "status": version.status,
        "revision_note": version.revision_note,
        "created_at": version.created_at.isoformat() if version.created_at else None,
        "published_at": version.published_at.isoformat() if version.published_at else None,
        "approved_by": version.approved_by,
        **version.data
    }

@router.get("/participants/{participant_id}/risk-assessment/versions")
async def list_risk_assessment_versions(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """List all versions for a risk assessment"""
    versions = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.participant_id == participant_id
    ).order_by(desc(RiskAssessmentVersion.created_at)).all()
    
    return [
        {
            "id": v.id,
            "version_number": v.version_number,
            "status": v.status,
            "revision_note": v.revision_note,
            "assessor_name": v.data.get('assessor_name') if v.data else None,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "published_at": v.published_at.isoformat() if v.published_at else None,
            "approved_by": v.approved_by
        }
        for v in versions
    ]

@router.put("/participants/{participant_id}/risk-assessment/versions/{version_id}")
async def update_risk_assessment_version(
    participant_id: int,
    version_id: int,
    data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Update a draft risk assessment version"""
    version = db.query(RiskAssessmentVersion).filter(
        and_(
            RiskAssessmentVersion.id == version_id,
            RiskAssessmentVersion.participant_id == participant_id
        )
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != 'draft':
        raise HTTPException(status_code=400, detail="Only draft versions can be edited")
    
    # Update version data
    version.data = data
    version.updated_at = datetime.now()
    
    db.commit()
    db.refresh(version)
    
    return {"message": "Version updated successfully", "version_id": version.id}

@router.post("/participants/{participant_id}/risk-assessment/versions/{version_id}/publish")
async def publish_risk_assessment_version(
    participant_id: int,
    version_id: int,
    approval: VersionPublishRequest,
    db: Session = Depends(get_db)
):
    """Publish a risk assessment version as current - FIXED VERSION"""
    try:
        version = db.query(RiskAssessmentVersion).filter(
            and_(
                RiskAssessmentVersion.id == version_id,
                RiskAssessmentVersion.participant_id == participant_id
            )
        ).first()
        
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        
        if version.status != 'draft':
            raise HTTPException(status_code=400, detail="Only draft versions can be published")
        
        # Get current risk assessment
        current = db.query(RiskAssessment).filter(
            RiskAssessment.participant_id == participant_id
        ).order_by(desc(RiskAssessment.created_at)).first()
        
        if current:
            # Archive current version
            archive = RiskAssessmentVersion(
                participant_id=participant_id,
                version_number=f"{version.version_number.split('.')[0]}.{int(version.version_number.split('.')[1]) - 1}",
                data={
                    'assessment_date': current.assessment_date.isoformat() if current.assessment_date else None,
                    'assessor_name': current.assessor_name,
                    'assessor_role': current.assessor_role,
                    'review_date': current.review_date.isoformat() if current.review_date else None,
                    'context': current.context,
                    'risks': current.risks,
                    'overall_risk_rating': current.overall_risk_rating,
                    'emergency_procedures': current.emergency_procedures,
                    'monitoring_requirements': current.monitoring_requirements,
                    'staff_training_needs': current.staff_training_needs,
                    'equipment_requirements': current.equipment_requirements,
                    'environmental_modifications': current.environmental_modifications,
                    'communication_plan': current.communication_plan,
                    'family_involvement': current.family_involvement,
                    'external_services': current.external_services,
                    'review_schedule': current.review_schedule,
                    'approval_status': current.approval_status,
                    'notes': current.notes
                },
                status='archived',
                created_by=current.created_by or 'System'
            )
            db.add(archive)
            
            # CRITICAL FIX: Update current with ALL version data including risks
            current.assessment_date = version.data.get('assessment_date')
            current.assessor_name = version.data.get('assessor_name')
            current.assessor_role = version.data.get('assessor_role')
            current.review_date = version.data.get('review_date')
            current.context = version.data.get('context')
            current.risks = version.data.get('risks')  # ← THIS IS THE CRITICAL FIX
            current.overall_risk_rating = version.data.get('overall_risk_rating')
            current.emergency_procedures = version.data.get('emergency_procedures')
            current.monitoring_requirements = version.data.get('monitoring_requirements')
            current.staff_training_needs = version.data.get('staff_training_needs')
            current.equipment_requirements = version.data.get('equipment_requirements')
            current.environmental_modifications = version.data.get('environmental_modifications')
            current.communication_plan = version.data.get('communication_plan')
            current.family_involvement = version.data.get('family_involvement')
            current.external_services = version.data.get('external_services')
            current.review_schedule = version.data.get('review_schedule')
            current.notes = version.data.get('notes')
            current.updated_at = datetime.now()
            
            logger.info(f"Updated current risk assessment with version data. Risks count: {len(current.risks) if current.risks else 0}")
        
        # Update version status
        version.status = 'current'
        version.published_at = datetime.now()
        version.approved_by = approval.approved_by
        
        db.commit()
        
        return {
            "message": "Version published successfully",
            "version_id": version.id,
            "version_number": version.version_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing risk assessment version: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/participants/{participant_id}/risk-assessment/versions/{version_id}")
async def delete_risk_assessment_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Delete a draft risk assessment version"""
    version = db.query(RiskAssessmentVersion).filter(
        and_(
            RiskAssessmentVersion.id == version_id,
            RiskAssessmentVersion.participant_id == participant_id
        )
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != 'draft':
        raise HTTPException(status_code=400, detail="Only draft versions can be deleted")
    
    db.delete(version)
    db.commit()
    
    return {"message": "Draft version deleted successfully"}