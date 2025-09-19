# backend/app/models/care_plan.py - FIXED VERSION
from sqlalchemy import Column, Integer, String, Text, Date, Boolean, DateTime, ForeignKey, DECIMAL, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class CarePlan(Base):
    __tablename__ = "care_plans"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    
    # Plan Overview
    plan_name = Column(String(255), nullable=False)
    plan_version = Column(String(50), default="1.0")
    plan_period = Column(String(50), default="12 months")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    summary = Column(Text, nullable=False)
    
    # Participant Information
    participant_strengths = Column(Text)
    participant_preferences = Column(Text)
    family_goals = Column(Text)
    
    # Goals (stored as JSON)
    short_goals = Column(JSON)  # Array of goal objects
    long_goals = Column(JSON)   # Array of goal objects
    
    # Supports & Services (stored as JSON)
    supports = Column(JSON)  # Array of support objects
    
    # Monitoring
    monitoring = Column(JSON)  # Object with monitoring details
    
    # Additional Considerations
    risk_considerations = Column(Text)
    emergency_contacts = Column(Text)
    cultural_considerations = Column(Text)
    communication_preferences = Column(Text)
    
    # Status
    status = Column(String(50), default="draft")  # draft, complete, approved
    
    # System fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(255))
    
    # FIXED: Relationships with proper back_populates
    participant = relationship("Participant", back_populates="care_plans")

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    
    # Assessment Details
    assessment_date = Column(Date, nullable=False)
    assessor_name = Column(String(255), nullable=False)
    assessor_role = Column(String(100))
    review_date = Column(Date, nullable=False)
    
    # Context (stored as JSON)
    context = Column(JSON)  # Object with environment, supports, activities, etc.
    
    # Risks (stored as JSON)
    risks = Column(JSON)  # Array of risk objects
    
    # Overall Assessment
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
    
    # Status
    approval_status = Column(String(50), default="draft")  # draft, complete, approved
    notes = Column(Text)
    
    # System fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(255))
    
    # FIXED: Relationships with proper back_populates
    participant = relationship("Participant", back_populates="risk_assessments")

class ProspectiveWorkflow(Base):
    __tablename__ = "prospective_workflows"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False, unique=True)
    
    # Workflow Status
    care_plan_completed = Column(Boolean, default=False)
    risk_assessment_completed = Column(Boolean, default=False)
    ai_review_completed = Column(Boolean, default=False)
    quotation_generated = Column(Boolean, default=False)
    ready_for_onboarding = Column(Boolean, default=False)
    
    # Progress Tracking
    care_plan_id = Column(Integer, ForeignKey("care_plans.id"), nullable=True)
    risk_assessment_id = Column(Integer, ForeignKey("risk_assessments.id"), nullable=True)
    
    # Notes and Comments
    workflow_notes = Column(Text)
    manager_comments = Column(Text)
    
    # Dates
    care_plan_completed_date = Column(DateTime(timezone=True))
    risk_assessment_completed_date = Column(DateTime(timezone=True))
    ai_review_completed_date = Column(DateTime(timezone=True))
    quotation_generated_date = Column(DateTime(timezone=True))
    
    # System fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # FIXED: Relationships with proper back_populates
    participant = relationship("Participant", back_populates="prospective_workflow")
    care_plan = relationship("CarePlan")
    risk_assessment = relationship("RiskAssessment")