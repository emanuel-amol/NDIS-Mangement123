# backend/app/models/participant.py
from sqlalchemy import Column, Integer, String, Text, Date, Boolean, DateTime, ForeignKey, DECIMAL
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    
    # Reference to original referral
    referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=True)
    
    # Basic Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    phone_number = Column(String(20), nullable=False)
    email_address = Column(String(255), nullable=True)
    street_address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    postcode = Column(String(10), nullable=False)
    preferred_contact = Column(String(50), nullable=False)
    disability_type = Column(String(100), nullable=False)
    
    # Representative Details (Optional)
    rep_first_name = Column(String(100), nullable=True)
    rep_last_name = Column(String(100), nullable=True)
    rep_phone_number = Column(String(20), nullable=True)
    rep_email_address = Column(String(255), nullable=True)
    rep_street_address = Column(Text, nullable=True)
    rep_city = Column(String(100), nullable=True)
    rep_state = Column(String(50), nullable=True)
    rep_postcode = Column(String(10), nullable=True)
    rep_relationship = Column(String(100), nullable=True)
    
    # NDIS Details
    ndis_number = Column(String(50), nullable=True, unique=True)
    plan_type = Column(String(50), nullable=False)
    plan_manager_name = Column(String(255), nullable=True)
    plan_manager_agency = Column(String(255), nullable=True)
    available_funding = Column(String(100), nullable=True)
    plan_start_date = Column(Date, nullable=False)
    plan_review_date = Column(Date, nullable=False)
    support_category = Column(String(100), nullable=False)
    
    # Goals and Care
    client_goals = Column(Text, nullable=False)
    support_goals = Column(Text, nullable=True)
    current_supports = Column(Text, nullable=True)
    accessibility_needs = Column(Text, nullable=True)
    cultural_considerations = Column(Text, nullable=True)
    
    # Risk Assessment
    risk_level = Column(String(50), default="low")
    risk_notes = Column(Text, nullable=True)
    
    # Status and Lifecycle
    status = Column(String(50), default="prospective")  # prospective, onboarded, active, inactive
    onboarding_completed = Column(Boolean, default=False)
    care_plan_completed = Column(Boolean, default=False)
    
    # System fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    referral = relationship("Referral", back_populates="participant")
    care_plans = relationship("CarePlan", back_populates="participant")
    risk_assessments = relationship("RiskAssessment", back_populates="participant")
    prospective_workflow = relationship("ProspectiveWorkflow", back_populates="participant", uselist=False)
    documents = relationship("Document", back_populates="participant", cascade="all, delete-orphan")

# Add relationship to Referral model
from app.models.referral import Referral
Referral.participant = relationship("Participant", back_populates="referral", uselist=False)