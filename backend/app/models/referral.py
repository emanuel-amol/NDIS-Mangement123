from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    
    # Client Details
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(String(10), nullable=False)  # YYYY-MM-DD format
    phone_number = Column(String(20), nullable=False)
    email_address = Column(String(255), nullable=True)
    street_address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(10), nullable=False)
    postcode = Column(String(10), nullable=False)
    preferred_contact = Column(String(20), nullable=False)  # phone, email, sms
    
    # Representative Details (Optional)
    rep_first_name = Column(String(100), nullable=True)
    rep_last_name = Column(String(100), nullable=True)
    rep_phone_number = Column(String(20), nullable=True)
    rep_email_address = Column(String(255), nullable=True)
    rep_street_address = Column(Text, nullable=True)
    rep_city = Column(String(100), nullable=True)
    rep_state = Column(String(10), nullable=True)
    rep_postcode = Column(String(10), nullable=True)
    
    # NDIS Details
    plan_type = Column(String(50), nullable=False)  # plan-managed, self-managed, agency-managed
    plan_manager_name = Column(String(100), nullable=True)
    plan_manager_agency = Column(String(100), nullable=True)
    ndis_number = Column(String(20), nullable=True)
    available_funding = Column(String(100), nullable=True)
    plan_start_date = Column(String(10), nullable=False)  # YYYY-MM-DD format
    plan_review_date = Column(String(10), nullable=False)  # YYYY-MM-DD format
    client_goals = Column(Text, nullable=False)
    
    # Referrer Details
    referrer_first_name = Column(String(100), nullable=False)
    referrer_last_name = Column(String(100), nullable=False)
    referrer_agency = Column(String(100), nullable=True)
    referrer_role = Column(String(100), nullable=True)
    referrer_email = Column(String(255), nullable=False)
    referrer_phone = Column(String(20), nullable=False)
    
    # Reason for Referral
    referred_for = Column(String(50), nullable=False)  # physiotherapy, chiro, psychologist, other
    reason_for_referral = Column(Text, nullable=False)
    
    # Consent
    consent_checkbox = Column(Boolean, nullable=False, default=False)
    
    # System Fields
    status = Column(String(20), default="new")  # new, reviewed, contacted, processed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    notes = Column(Text, nullable=True)  # Admin notes
    
    # Metadata & Audit
    form_metadata = Column(JSON, nullable=True)  # Flexible extras and submission info
    raw_submission = Column(JSON, nullable=True)  # Original form data for traceability
    
    # Relationships
    email_logs = relationship("EmailLog", back_populates="referral")