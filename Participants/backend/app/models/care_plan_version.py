# backend/app/models/care_plan_version.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from app.core.database import Base

class CarePlanVersion(Base):
    __tablename__ = "care_plan_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    care_plan_id = Column(Integer, ForeignKey("care_plans.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    version_number = Column(String(50), nullable=False)
    
    # Status: draft, current, superseded
    status = Column(String(50), default="draft")
    
    # Versioning metadata
    revision_note = Column(Text)
    created_by = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Copy of all care plan data at this version
    plan_data = Column(JSON, nullable=False)