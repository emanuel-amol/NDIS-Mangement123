# backend/app/schemas/referral.py - COMPLETE FIX
from __future__ import annotations

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict, Field

class ReferralCreate(BaseModel):
    """Schema for creating a new referral"""
    # Client Details
    firstName: str = Field(..., min_length=1, max_length=100)
    lastName: str = Field(..., min_length=1, max_length=100)
    dateOfBirth: str = Field(..., description="Date of birth in YYYY-MM-DD format")
    phoneNumber: str = Field(..., min_length=1, max_length=20)
    emailAddress: Optional[str] = Field(None, max_length=255)
    streetAddress: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=10)
    postcode: str = Field(..., min_length=1, max_length=10)
    preferredContact: str = Field(..., min_length=1, max_length=20)
    
    # Representative Details (Optional)
    repFirstName: Optional[str] = Field(None, max_length=100)
    repLastName: Optional[str] = Field(None, max_length=100)
    repPhoneNumber: Optional[str] = Field(None, max_length=20)
    repEmailAddress: Optional[str] = Field(None, max_length=255)
    repStreetAddress: Optional[str] = Field(None)
    repCity: Optional[str] = Field(None, max_length=100)
    repState: Optional[str] = Field(None, max_length=10)
    repPostcode: Optional[str] = Field(None, max_length=10)

    # NDIS Details
    planType: str = Field(..., min_length=1, max_length=50)
    planManagerName: Optional[str] = Field(None, max_length=100)
    planManagerAgency: Optional[str] = Field(None, max_length=100)
    ndisNumber: Optional[str] = Field(None, max_length=20)
    availableFunding: Optional[str] = Field(None, max_length=100)
    planStartDate: str = Field(..., description="Plan start date in YYYY-MM-DD format")
    planReviewDate: str = Field(..., description="Plan review date in YYYY-MM-DD format")
    clientGoals: str = Field(..., min_length=1)

    # Referrer Details
    referrerFirstName: str = Field(..., min_length=1, max_length=100)
    referrerLastName: str = Field(..., min_length=1, max_length=100)
    referrerAgency: Optional[str] = Field(None, max_length=100)
    referrerRole: Optional[str] = Field(None, max_length=100)
    referrerEmail: str = Field(..., max_length=255)
    referrerPhone: str = Field(..., min_length=1, max_length=20)

    # Reason for Referral
    referredFor: str = Field(..., min_length=1, max_length=50)
    reasonForReferral: str = Field(..., min_length=10)

    # Consent
    consentCheckbox: bool = Field(..., description="Consent must be true")


class ReferralUpdate(BaseModel):
    """Schema for updating an existing referral - all fields optional"""
    # Client Details
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    dateOfBirth: Optional[str] = None
    phoneNumber: Optional[str] = None
    emailAddress: Optional[str] = None
    streetAddress: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    preferredContact: Optional[str] = None
    
    # Representative Details
    repFirstName: Optional[str] = None
    repLastName: Optional[str] = None
    repPhoneNumber: Optional[str] = None
    repEmailAddress: Optional[str] = None
    repStreetAddress: Optional[str] = None
    repCity: Optional[str] = None
    repState: Optional[str] = None
    repPostcode: Optional[str] = None
    
    # NDIS Details
    planType: Optional[str] = None
    planManagerName: Optional[str] = None
    planManagerAgency: Optional[str] = None
    ndisNumber: Optional[str] = None
    availableFunding: Optional[str] = None
    planStartDate: Optional[str] = None
    planReviewDate: Optional[str] = None
    clientGoals: Optional[str] = None
    
    # Referrer Details
    referrerFirstName: Optional[str] = None
    referrerLastName: Optional[str] = None
    referrerAgency: Optional[str] = None
    referrerRole: Optional[str] = None
    referrerEmail: Optional[str] = None
    referrerPhone: Optional[str] = None
    
    # Reason for Referral
    referredFor: Optional[str] = None
    reasonForReferral: Optional[str] = None
    
    # Consent
    consentCheckbox: Optional[bool] = None
    
    # Status and notes (for admin updates)
    status: Optional[str] = None
    notes: Optional[str] = None


class ReferralResponse(BaseModel):
    """Schema for referral API responses"""
    id: int
    
    # Client Details (using database column names)
    first_name: str
    last_name: str
    date_of_birth: str
    phone_number: str
    email_address: Optional[str]
    street_address: str
    city: str
    state: str
    postcode: str
    preferred_contact: str
    
    # Representative Details
    rep_first_name: Optional[str]
    rep_last_name: Optional[str]
    rep_phone_number: Optional[str]
    rep_email_address: Optional[str]
    rep_street_address: Optional[str]
    rep_city: Optional[str]
    rep_state: Optional[str]
    rep_postcode: Optional[str]
    
    # NDIS Details
    plan_type: str
    plan_manager_name: Optional[str]
    plan_manager_agency: Optional[str]
    ndis_number: Optional[str]
    available_funding: Optional[str]
    plan_start_date: str
    plan_review_date: str
    client_goals: str
    
    # Referrer Details
    referrer_first_name: str
    referrer_last_name: str
    referrer_agency: Optional[str]
    referrer_role: Optional[str]
    referrer_email: str
    referrer_phone: str
    
    # Reason for Referral
    referred_for: str
    reason_for_referral: str
    
    # Consent
    consent_checkbox: bool
    
    # System Fields
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    notes: Optional[str]
    
    # Additional metadata fields
    form_metadata: Optional[dict] = None
    raw_submission: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)