# backend/app/models/risk_assessment_version.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class RiskAssessmentVersion(Base):
    __tablename__ = "risk_assessment_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    risk_assessment_id = Column(Integer, ForeignKey("risk_assessments.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    version_number = Column(String(50), nullable=False)
    
    # Status: draft, current, superseded
    status = Column(String(50), default="draft")
    
    # Versioning metadata
    revision_note = Column(Text)
    created_by = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Approval tracking
    approved_by = Column(String(255))
    approved_at = Column(DateTime(timezone=True))
    
    # Copy of all risk assessment data at this version
    assessment_data = Column(JSON, nullable=False)