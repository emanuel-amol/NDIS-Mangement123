# backend/app/api/v1/endpoints/care_versioning.py - COMPLETE FILE
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.participant import Participant
from app.models.care_plan import CarePlan, RiskAssessment
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# ==================== SCHEMAS ====================

class VersionCreateRequest(BaseModel):
    base_version_id: Optional[str] = "current"
    revision_note: Optional[str] = None

class VersionPublishRequest(BaseModel):
    approval_comments: Optional[str] = None
    approved_by: Optional[str] = "System User"

class CarePlanVersionResponse(BaseModel):
    id: int
    participant_id: int
    version_number: str
    status: str
    plan_name: str
    summary: str
    base_version_id: Optional[int]
    revision_note: Optional[str]
    created_by: Optional[str]
    approved_by: Optional[str]
    published_at: Optional[str]
    created_at: str
    updated_at: Optional[str]

    class Config:
        from_attributes = True

class RiskAssessmentVersionResponse(BaseModel):
    id: int
    participant_id: int
    version_number: str
    status: str
    assessor_name: str
    overall_risk_rating: Optional[str]
    base_version_id: Optional[int]
    revision_note: Optional[str]
    created_by: Optional[str]
    approved_by: Optional[str]
    published_at: Optional[str]
    created_at: str
    updated_at: Optional[str]

    class Config:
        from_attributes = True

# ==================== VERSION MODELS (INLINE) ====================

from sqlalchemy import Column, Integer, String, Text, Date, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class VersionStatus(str, enum.Enum):
    draft = "draft"
    current = "current"
    archived = "archived"

class CarePlanVersion(Base):
    __tablename__ = "care_plan_versions"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False, index=True)
    version_number = Column(String(50), nullable=False)
    status = Column(SQLEnum(VersionStatus), default=VersionStatus.draft, nullable=False, index=True)
    
    plan_name = Column(String(255), nullable=False)
    plan_version = Column(String(50))
    plan_period = Column(String(50), default="12 months")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    summary = Column(Text, nullable=False)
    participant_strengths = Column(Text)
    participant_preferences = Column(Text)
    family_goals = Column(Text)
    short_goals = Column(JSON)
    long_goals = Column(JSON)
    supports = Column(JSON)
    monitoring = Column(JSON)
    risk_considerations = Column(Text)
    emergency_contacts = Column(Text)
    cultural_considerations = Column(Text)
    communication_preferences = Column(Text)
    
    base_version_id = Column(Integer, ForeignKey("care_plan_versions.id"), nullable=True)
    revision_note = Column(Text)
    created_by = Column(String(255))
    approved_by = Column(String(255))
    published_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    participant = relationship("Participant", foreign_keys=[participant_id])
    base_version = relationship("CarePlanVersion", remote_side=[id], backref="revisions")

class RiskAssessmentVersion(Base):
    __tablename__ = "risk_assessment_versions"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False, index=True)
    version_number = Column(String(50), nullable=False)
    status = Column(SQLEnum(VersionStatus), default=VersionStatus.draft, nullable=False, index=True)
    
    assessment_date = Column(Date, nullable=False)
    assessor_name = Column(String(255), nullable=False)
    assessor_role = Column(String(100))
    review_date = Column(Date, nullable=False)
    context = Column(JSON)
    risks = Column(JSON)
    overall_risk_rating = Column(String(50))
    emergency_procedures = Column(Text)
    monitoring_requirements = Column(Text)
    staff_training_needs = Column(Text)
    equipment_requirements = Column(Text)
    environmental_modifications = Column(Text)
    communication_plan = Column(Text)
    family_involvement = Column(Text)
    external_services = Column(Text)
    review_schedule = Column(String(50), default="Monthly")
    notes = Column(Text)
    
    base_version_id = Column(Integer, ForeignKey("risk_assessment_versions.id"), nullable=True)
    revision_note = Column(Text)
    created_by = Column(String(255))
    approved_by = Column(String(255))
    published_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    participant = relationship("Participant", foreign_keys=[participant_id])
    base_version = relationship("RiskAssessmentVersion", remote_side=[id], backref="revisions")

# ==================== HELPER FUNCTIONS ====================

def get_next_version_number(participant_id: int, model_class, db: Session) -> str:
    latest_version = db.query(model_class).filter(
        model_class.participant_id == participant_id,
        model_class.status == VersionStatus.current
    ).order_by(desc(model_class.version_number)).first()
    
    if not latest_version:
        return "1.0"
    
    parts = latest_version.version_number.split('.')
    major = int(parts[0])
    minor = int(parts[1]) if len(parts) > 1 else 0
    return f"{major}.{minor + 1}"

def copy_care_plan_to_version(source: CarePlan, version_number: str, base_id: Optional[int] = None) -> CarePlanVersion:
    return CarePlanVersion(
        participant_id=source.participant_id,
        version_number=version_number,
        status=VersionStatus.draft,
        plan_name=source.plan_name,
        plan_version=source.plan_version,
        plan_period=source.plan_period,
        start_date=source.start_date,
        end_date=source.end_date,
        summary=source.summary,
        participant_strengths=source.participant_strengths,
        participant_preferences=source.participant_preferences,
        family_goals=source.family_goals,
        short_goals=source.short_goals,
        long_goals=source.long_goals,
        supports=source.supports,
        monitoring=source.monitoring,
        risk_considerations=source.risk_considerations,
        emergency_contacts=source.emergency_contacts,
        cultural_considerations=source.cultural_considerations,
        communication_preferences=source.communication_preferences,
        base_version_id=base_id
    )

def copy_risk_assessment_to_version(source: RiskAssessment, version_number: str, base_id: Optional[int] = None) -> RiskAssessmentVersion:
    return RiskAssessmentVersion(
        participant_id=source.participant_id,
        version_number=version_number,
        status=VersionStatus.draft,
        assessment_date=source.assessment_date,
        assessor_name=source.assessor_name,
        assessor_role=source.assessor_role,
        review_date=source.review_date,
        context=source.context,
        risks=source.risks,
        overall_risk_rating=source.overall_risk_rating,
        emergency_procedures=source.emergency_procedures,
        monitoring_requirements=source.monitoring_requirements,
        staff_training_needs=source.staff_training_needs,
        equipment_requirements=source.equipment_requirements,
        environmental_modifications=source.environmental_modifications,
        communication_plan=source.communication_plan,
        family_involvement=source.family_involvement,
        external_services=source.external_services,
        review_schedule=source.review_schedule,
        notes=source.notes,
        base_version_id=base_id
    )

def mark_documents_for_regeneration(db: Session, participant_id: int, event_type: str):
    """Mark documents that need regeneration after version publish"""
    try:
        from app.models.document import Document
        
        doc_types = {
            'care_plan.published': ['care_plan_summary', 'service_agreement', 'support_schedule', 'ndis_service_booking'],
            'risk_assessment.published': ['risk_management_plan', 'emergency_procedures', 'staff_briefing', 'safety_protocol']
        }
        
        affected_types = doc_types.get(event_type, [])
        documents = db.query(Document).filter(
            Document.participant_id == participant_id,
            Document.category.in_(affected_types)
        ).all()
        
        for doc in documents:
            if not doc.metadata:
                doc.metadata = {}
            doc.metadata['needs_regeneration'] = True
            doc.metadata['regeneration_reason'] = f"New version published: {event_type}"
            doc.metadata['marked_at'] = datetime.now().isoformat()
            doc.updated_at = datetime.now()
        
        db.commit()
        logger.info(f"Marked {len(documents)} documents for regeneration: {event_type}")
    except Exception as e:
        logger.error(f"Error marking documents for regeneration: {str(e)}")

# ==================== CARE PLAN VERSION ENDPOINTS ====================

@router.get("/participants/{participant_id}/care-plan/versions", response_model=List[CarePlanVersionResponse])
def list_care_plan_versions(
    participant_id: int,
    include_archived: bool = False,
    db: Session = Depends(get_db)
):
    """List all care plan versions for a participant"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    query = db.query(CarePlanVersion).filter(CarePlanVersion.participant_id == participant_id)
    
    if not include_archived:
        query = query.filter(CarePlanVersion.status.in_([VersionStatus.draft, VersionStatus.current]))
    
    versions = query.order_by(desc(CarePlanVersion.created_at)).all()
    
    return [
        CarePlanVersionResponse(
            id=v.id,
            participant_id=v.participant_id,
            version_number=v.version_number,
            status=v.status.value,
            plan_name=v.plan_name,
            summary=v.summary,
            base_version_id=v.base_version_id,
            revision_note=v.revision_note,
            created_by=v.created_by,
            approved_by=v.approved_by,
            published_at=v.published_at.isoformat() if v.published_at else None,
            created_at=v.created_at.isoformat(),
            updated_at=v.updated_at.isoformat() if v.updated_at else None
        )
        for v in versions
    ]

@router.get("/participants/{participant_id}/care-plan/versions/{version_id}")
def get_care_plan_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific care plan version"""
    version = db.query(CarePlanVersion).filter(
        CarePlanVersion.id == version_id,
        CarePlanVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return version

@router.post("/participants/{participant_id}/care-plan/versions")
def create_care_plan_revision(
    participant_id: int,
    request: VersionCreateRequest,
    db: Session = Depends(get_db)
):
    """Create a new care plan revision (draft)"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    if request.base_version_id == "current":
        current_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        if not current_plan:
            raise HTTPException(status_code=404, detail="No current care plan found")
        
        next_version = get_next_version_number(participant_id, CarePlanVersion, db)
        new_version = copy_care_plan_to_version(current_plan, next_version)
        new_version.revision_note = request.revision_note
        new_version.created_by = "System User"
    else:
        base_version = db.query(CarePlanVersion).filter(
            CarePlanVersion.id == int(request.base_version_id),
            CarePlanVersion.participant_id == participant_id
        ).first()
        
        if not base_version:
            raise HTTPException(status_code=404, detail="Base version not found")
        
        parts = base_version.version_number.split('.')
        major = int(parts[0])
        minor = int(parts[1]) + 1
        next_version = f"{major}.{minor}"
        
        new_version = CarePlanVersion(
            participant_id=participant_id,
            version_number=next_version,
            status=VersionStatus.draft,
            plan_name=base_version.plan_name,
            plan_version=base_version.plan_version,
            plan_period=base_version.plan_period,
            start_date=base_version.start_date,
            end_date=base_version.end_date,
            summary=base_version.summary,
            participant_strengths=base_version.participant_strengths,
            participant_preferences=base_version.participant_preferences,
            family_goals=base_version.family_goals,
            short_goals=base_version.short_goals,
            long_goals=base_version.long_goals,
            supports=base_version.supports,
            monitoring=base_version.monitoring,
            risk_considerations=base_version.risk_considerations,
            emergency_contacts=base_version.emergency_contacts,
            cultural_considerations=base_version.cultural_considerations,
            communication_preferences=base_version.communication_preferences,
            base_version_id=base_version.id,
            revision_note=request.revision_note,
            created_by="System User"
        )
    
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    
    logger.info(f"Created care plan revision v{next_version} for participant {participant_id}")
    
    return {
        "message": "Care plan revision created successfully",
        "version_id": new_version.id,
        "version_number": new_version.version_number,
        "status": new_version.status.value,
        "edit_url": f"/care/plan/{participant_id}/versions/{new_version.id}/edit"
    }

@router.put("/participants/{participant_id}/care-plan/versions/{version_id}")
def update_care_plan_version(
    participant_id: int,
    version_id: int,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Update a draft care plan version"""
    version = db.query(CarePlanVersion).filter(
        CarePlanVersion.id == version_id,
        CarePlanVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != VersionStatus.draft:
        raise HTTPException(status_code=400, detail="Can only update draft versions")
    
    for key, value in updates.items():
        if hasattr(version, key):
            setattr(version, key, value)
    
    version.updated_at = datetime.now()
    db.commit()
    db.refresh(version)
    
    return {"message": "Version updated successfully", "version": version}

@router.post("/participants/{participant_id}/care-plan/versions/{version_id}/publish")
def publish_care_plan_version(
    participant_id: int,
    version_id: int,
    request: VersionPublishRequest,
    db: Session = Depends(get_db)
):
    """Publish a draft version as current (archives previous current)"""
    version = db.query(CarePlanVersion).filter(
        CarePlanVersion.id == version_id,
        CarePlanVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != VersionStatus.draft:
        raise HTTPException(status_code=400, detail="Can only publish draft versions")
    
    current_version = db.query(CarePlanVersion).filter(
        CarePlanVersion.participant_id == participant_id,
        CarePlanVersion.status == VersionStatus.current
    ).first()
    
    if current_version:
        current_version.status = VersionStatus.archived
    
    version.status = VersionStatus.current
    version.published_at = datetime.now()
    version.approved_by = request.approved_by
    
    main_plan = db.query(CarePlan).filter(
        CarePlan.participant_id == participant_id
    ).order_by(desc(CarePlan.created_at)).first()
    
    if main_plan:
        main_plan.plan_name = version.plan_name
        main_plan.summary = version.summary
        main_plan.short_goals = version.short_goals
        main_plan.long_goals = version.long_goals
        main_plan.supports = version.supports
        main_plan.monitoring = version.monitoring
        main_plan.updated_at = datetime.now()
    
    db.commit()
    
    mark_documents_for_regeneration(db, participant_id, 'care_plan.published')
    
    logger.info(f"care_plan.published event: participant_id={participant_id}, version={version.version_number}")
    
    return {
        "message": "Care plan version published successfully",
        "version_number": version.version_number,
        "published_at": version.published_at.isoformat(),
        "requires_document_regeneration": True
    }

@router.delete("/participants/{participant_id}/care-plan/versions/{version_id}")
def discard_care_plan_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Discard a draft version"""
    version = db.query(CarePlanVersion).filter(
        CarePlanVersion.id == version_id,
        CarePlanVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != VersionStatus.draft:
        raise HTTPException(status_code=400, detail="Can only discard draft versions")
    
    db.delete(version)
    db.commit()
    
    return {"message": "Draft version discarded successfully"}

# ==================== RISK ASSESSMENT VERSION ENDPOINTS ====================

@router.get("/participants/{participant_id}/risk-assessment/versions", response_model=List[RiskAssessmentVersionResponse])
def list_risk_assessment_versions(
    participant_id: int,
    include_archived: bool = False,
    db: Session = Depends(get_db)
):
    """List all risk assessment versions"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    query = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.participant_id == participant_id
    )
    
    if not include_archived:
        query = query.filter(RiskAssessmentVersion.status.in_([VersionStatus.draft, VersionStatus.current]))
    
    versions = query.order_by(desc(RiskAssessmentVersion.created_at)).all()
    
    return [
        RiskAssessmentVersionResponse(
            id=v.id,
            participant_id=v.participant_id,
            version_number=v.version_number,
            status=v.status.value,
            assessor_name=v.assessor_name,
            overall_risk_rating=v.overall_risk_rating,
            base_version_id=v.base_version_id,
            revision_note=v.revision_note,
            created_by=v.created_by,
            approved_by=v.approved_by,
            published_at=v.published_at.isoformat() if v.published_at else None,
            created_at=v.created_at.isoformat(),
            updated_at=v.updated_at.isoformat() if v.updated_at else None
        )
        for v in versions
    ]

@router.get("/participants/{participant_id}/risk-assessment/versions/{version_id}")
def get_risk_assessment_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific risk assessment version"""
    version = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.id == version_id,
        RiskAssessmentVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return version

@router.post("/participants/{participant_id}/risk-assessment/versions")
def create_risk_assessment_revision(
    participant_id: int,
    request: VersionCreateRequest,
    db: Session = Depends(get_db)
):
    """Create a new risk assessment revision"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    if request.base_version_id == "current":
        current_assessment = db.query(RiskAssessment).filter(
            RiskAssessment.participant_id == participant_id
        ).order_by(desc(RiskAssessment.created_at)).first()
        
        if not current_assessment:
            raise HTTPException(status_code=404, detail="No current risk assessment found")
        
        next_version = get_next_version_number(participant_id, RiskAssessmentVersion, db)
        new_version = copy_risk_assessment_to_version(current_assessment, next_version)
        new_version.revision_note = request.revision_note
        new_version.created_by = "System User"
    
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    
    return {
        "message": "Risk assessment revision created successfully",
        "version_id": new_version.id,
        "version_number": new_version.version_number,
        "edit_url": f"/care/risk-assessment/{participant_id}/versions/{new_version.id}/edit"
    }

@router.put("/participants/{participant_id}/risk-assessment/versions/{version_id}")
def update_risk_assessment_version(
    participant_id: int,
    version_id: int,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Update a draft risk assessment version"""
    version = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.id == version_id,
        RiskAssessmentVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != VersionStatus.draft:
        raise HTTPException(status_code=400, detail="Can only update draft versions")
    
    for key, value in updates.items():
        if hasattr(version, key):
            setattr(version, key, value)
    
    version.updated_at = datetime.now()
    db.commit()
    db.refresh(version)
    
    return {"message": "Version updated successfully", "version": version}

@router.post("/participants/{participant_id}/risk-assessment/versions/{version_id}/publish")
def publish_risk_assessment_version(
    participant_id: int,
    version_id: int,
    request: VersionPublishRequest,
    db: Session = Depends(get_db)
):
    """Publish risk assessment version"""
    version = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.id == version_id,
        RiskAssessmentVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != VersionStatus.draft:
        raise HTTPException(status_code=400, detail="Can only publish draft versions")
    
    current = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.participant_id == participant_id,
        RiskAssessmentVersion.status == VersionStatus.current
    ).first()
    
    if current:
        current.status = VersionStatus.archived
    
    version.status = VersionStatus.current
    version.published_at = datetime.now()
    version.approved_by = request.approved_by
    
    db.commit()
    
    mark_documents_for_regeneration(db, participant_id, 'risk_assessment.published')
    
    logger.info(f"risk_assessment.published event: participant_id={participant_id}, version={version.version_number}")
    
    return {
        "message": "Risk assessment version published successfully",
        "version_number": version.version_number,
        "requires_document_regeneration": True
    }

@router.delete("/participants/{participant_id}/risk-assessment/versions/{version_id}")
def discard_risk_assessment_version(
    participant_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Discard a draft risk assessment version"""
    version = db.query(RiskAssessmentVersion).filter(
        RiskAssessmentVersion.id == version_id,
        RiskAssessmentVersion.participant_id == participant_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.status != VersionStatus.draft:
        raise HTTPException(status_code=400, detail="Can only discard draft versions")
    
    db.delete(version)
    db.commit()
    
    return {"message": "Draft version discarded successfully"}