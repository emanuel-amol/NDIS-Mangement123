# backend/app/models/referral.py - FIXED VERSION
from sqlalchemy import Column, Integer, String, Text, Date, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    
    # Client Details
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
    plan_type = Column(String(50), nullable=False)
    plan_manager_name = Column(String(255), nullable=True)
    plan_manager_agency = Column(String(255), nullable=True)
    ndis_number = Column(String(50), nullable=True)
    available_funding = Column(String(100), nullable=True)
    plan_start_date = Column(Date, nullable=False)
    plan_review_date = Column(Date, nullable=False)
    client_goals = Column(Text, nullable=False)
    support_category = Column(String(100), nullable=False)
    
    # Referrer Details
    referrer_first_name = Column(String(100), nullable=False)
    referrer_last_name = Column(String(100), nullable=False)
    referrer_agency = Column(String(255), nullable=True)
    referrer_role = Column(String(100), nullable=True)
    referrer_email = Column(String(255), nullable=False)
    referrer_phone = Column(String(20), nullable=False)
    
    # Reason for Referral
    referred_for = Column(String(100), nullable=False)
    referred_for_other = Column(String(255), nullable=True)
    reason_for_referral = Column(Text, nullable=False)
    urgency_level = Column(String(50), nullable=False)
    current_supports = Column(Text, nullable=True)
    support_goals = Column(Text, nullable=True)
    accessibility_needs = Column(Text, nullable=True)
    cultural_considerations = Column(Text, nullable=True)
    
    # Consent
    consent_checkbox = Column(Boolean, nullable=False, default=False)
    
    # System fields
    status = Column(String(50), default="submitted")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # FIXED: Relationship with proper back_populates
    participant = relationship("Participant", back_populates="referral", uselist=False)