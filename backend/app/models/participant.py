# backend/app/models/participant.py - COMPLETELY FIXED VERSION WITH ALL REQUIRED FIELDS
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class ParticipantStatus(str, enum.Enum):
    prospective = "prospective"
    onboarded = "onboarded"  # ADDED: Missing enum value causing the error
    active = "active"
    inactive = "inactive"
    discharged = "discharged"

class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    phone_number = Column(String(20), nullable=False)
    email_address = Column(String(255), nullable=True)
    
    # Address Information
    street_address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    postcode = Column(String(10), nullable=False)
    
    # Contact Preferences
    preferred_contact = Column(String(50), nullable=False)
    emergency_contact_name = Column(String(200), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relationship = Column(String(100), nullable=True)
    
    # NDIS Information
    ndis_number = Column(String(50), nullable=True, unique=True)
    plan_type = Column(String(50), nullable=False)
    plan_manager_name = Column(String(100), nullable=True)
    plan_manager_agency = Column(String(200), nullable=True)
    plan_start_date = Column(Date, nullable=True)
    plan_review_date = Column(Date, nullable=True)
    plan_end_date = Column(Date, nullable=True)
    available_funding = Column(String(100), nullable=True)
    
    # Disability and Support Information
    disability_type = Column(String(100), nullable=True)
    support_category = Column(String(100), nullable=True)
    support_needs = Column(Text, nullable=True)
    goals = Column(Text, nullable=True)
    client_goals = Column(Text, nullable=True)  # ADDED: Missing field from schema
    support_goals = Column(Text, nullable=True)  # ADDED: Missing field from schema
    current_supports = Column(Text, nullable=True)  # ADDED: Missing field from schema
    accessibility_needs = Column(Text, nullable=True)
    cultural_considerations = Column(Text, nullable=True)
    
    # Representative Information (ALL FIELDS FROM SCHEMA)
    rep_first_name = Column(String(100), nullable=True)
    rep_last_name = Column(String(100), nullable=True)
    rep_phone_number = Column(String(20), nullable=True)
    rep_email_address = Column(String(255), nullable=True)
    rep_street_address = Column(String(255), nullable=True)  # ADDED: Missing field causing error
    rep_city = Column(String(100), nullable=True)  # ADDED: Missing field from schema
    rep_state = Column(String(50), nullable=True)  # ADDED: Missing field from schema
    rep_postcode = Column(String(10), nullable=True)  # ADDED: Missing field from schema
    rep_relationship = Column(String(100), nullable=True)
    
    # Status and Tracking
    status = Column(Enum(ParticipantStatus), nullable=False, default=ParticipantStatus.prospective)
    enrollment_date = Column(Date, nullable=True)
    discharge_date = Column(Date, nullable=True)
    discharge_reason = Column(Text, nullable=True)
    
    # ADDED: Onboarding tracking fields (missing from original)
    onboarding_completed = Column(Boolean, default=False)
    care_plan_completed = Column(Boolean, default=False)
    risk_level = Column(String(50), default="low")
    risk_notes = Column(Text, nullable=True)  # ADDED: From schema
    
    # Referral Information (FIXED - added missing referral_id)
    referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=True)  # ADDED: Missing referral_id field
    referral_source = Column(String(200), nullable=True)
    referrer_name = Column(String(200), nullable=True)
    referrer_contact = Column(String(200), nullable=True)
    created_from_referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=True)
    
    # Care Team
    primary_support_coordinator = Column(String(200), nullable=True)
    case_manager = Column(String(200), nullable=True)
    assigned_team_member = Column(String(200), nullable=True)
    
    # Audit Fields
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    created_by = Column(String(100), nullable=True)
    last_modified_by = Column(String(100), nullable=True)
    
    # Additional Information
    notes = Column(Text, nullable=True)
    risk_assessment_required = Column(Boolean, default=False)
    risk_assessment_completed = Column(Boolean, default=False)
    risk_assessment_date = Column(Date, nullable=True)
    
    # Care Plan Information
    care_plan_created = Column(Boolean, default=False)
    care_plan_approved = Column(Boolean, default=False)
    care_plan_date = Column(Date, nullable=True)
    
    # Service Information
    service_start_date = Column(Date, nullable=True)
    service_frequency = Column(String(100), nullable=True)
    service_location = Column(String(200), nullable=True)
    
    # Relationships
    documents = relationship("Document", back_populates="participant", cascade="all, delete-orphan")
    care_plans = relationship("CarePlan", back_populates="participant", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="participant", cascade="all, delete-orphan")
    prospective_workflow = relationship("ProspectiveWorkflow", back_populates="participant", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Participant(id={self.id}, name={self.first_name} {self.last_name}, status={self.status})>"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_active(self):
        return self.status == ParticipantStatus.active
    
    @property
    def is_prospective(self):
        return self.status == ParticipantStatus.prospective
    
    @property
    def is_onboarded(self):
        return self.status == ParticipantStatus.onboarded