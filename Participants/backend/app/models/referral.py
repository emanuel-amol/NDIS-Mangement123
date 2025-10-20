# backend/app/models/referral.py - COMPLETE FILE WITH FILE UPLOAD SUPPORT
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class ReferralStatus(str, enum.Enum):
    submitted = "submitted"
    pending = "pending"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    converted = "converted"

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    
    # Client Details
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    phone_number = Column(String(20), nullable=False)
    email_address = Column(String(255), nullable=True)
    street_address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    postcode = Column(String(10), nullable=False)
    preferred_contact = Column(String(50), nullable=False)
    disability_type = Column(String(100), nullable=True)

    # Representative Details (Optional)
    rep_first_name = Column(String(100), nullable=True)
    rep_last_name = Column(String(100), nullable=True)
    rep_phone_number = Column(String(20), nullable=True)
    rep_email_address = Column(String(255), nullable=True)
    rep_street_address = Column(String(255), nullable=True)
    rep_city = Column(String(100), nullable=True)
    rep_state = Column(String(50), nullable=True)
    rep_postcode = Column(String(10), nullable=True)
    rep_relationship = Column(String(100), nullable=True)

    # NDIS Details
    plan_type = Column(String(50), nullable=False)
    plan_manager_name = Column(String(100), nullable=True)
    plan_manager_agency = Column(String(200), nullable=True)
    ndis_number = Column(String(50), nullable=True)
    available_funding = Column(String(100), nullable=True)
    plan_start_date = Column(Date, nullable=False)
    plan_review_date = Column(Date, nullable=False)
    client_goals = Column(Text, nullable=False)
    support_category = Column(String(100), nullable=True)

    # Referrer Details
    referrer_first_name = Column(String(100), nullable=False)
    referrer_last_name = Column(String(100), nullable=False)
    referrer_agency = Column(String(200), nullable=True)
    referrer_role = Column(String(100), nullable=True)
    referrer_email = Column(String(255), nullable=False)
    referrer_phone = Column(String(20), nullable=False)

    # Reason for Referral
    referred_for = Column(String(100), nullable=False)
    referred_for_other = Column(String(255), nullable=True)
    reason_for_referral = Column(Text, nullable=False)
    urgency_level = Column(String(20), nullable=True)
    current_supports = Column(Text, nullable=True)
    support_goals = Column(Text, nullable=True)
    accessibility_needs = Column(Text, nullable=True)
    cultural_considerations = Column(Text, nullable=True)

    # Consent
    consent_checkbox = Column(Boolean, nullable=False, default=False)

    # Status and tracking
    status = Column(Enum(ReferralStatus), nullable=False, default=ReferralStatus.submitted)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Conversion tracking
    converted_to_participant_id = Column(Integer, nullable=True)
    converted_at = Column(DateTime, nullable=True)
    
    # Notes and follow-up
    internal_notes = Column(Text, nullable=True)
    follow_up_required = Column(Boolean, default=False)
    assigned_to = Column(String(100), nullable=True)

    # Relationships - ADD FILE UPLOAD SUPPORT
    attached_files = relationship("Document", back_populates="referral", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Referral(id={self.id}, name={self.first_name} {self.last_name}, status={self.status})>"