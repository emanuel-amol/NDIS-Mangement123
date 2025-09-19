# backend/app/schemas/referral.py
from pydantic import BaseModel, validator
from datetime import date
from typing import Optional

class ReferralCreate(BaseModel):
    # Client Details - match frontend field names
    first_name: str
    last_name: str
    date_of_birth: date
    phone_number: str
    email_address: Optional[str] = None  # Changed from EmailStr to str
    street_address: str
    city: str
    state: str
    postcode: str
    preferred_contact: str
    disability_type: str
    
    # Representative Details (Optional)
    rep_first_name: Optional[str] = None
    rep_last_name: Optional[str] = None
    rep_phone_number: Optional[str] = None
    rep_email_address: Optional[str] = None  # Changed from EmailStr to str
    rep_street_address: Optional[str] = None
    rep_city: Optional[str] = None
    rep_state: Optional[str] = None
    rep_postcode: Optional[str] = None
    rep_relationship: Optional[str] = None
    
    # NDIS Details
    plan_type: str
    plan_manager_name: Optional[str] = None
    plan_manager_agency: Optional[str] = None
    ndis_number: Optional[str] = None
    available_funding: Optional[str] = None
    plan_start_date: date
    plan_review_date: date
    client_goals: str
    support_category: str
    
    # Referrer Details
    referrer_first_name: str
    referrer_last_name: str
    referrer_agency: Optional[str] = None
    referrer_role: Optional[str] = None
    referrer_email: str  # Changed from EmailStr to str
    referrer_phone: str
    
    # Reason for Referral
    referred_for: str
    referred_for_other: Optional[str] = None
    reason_for_referral: str
    urgency_level: str
    current_supports: Optional[str] = None
    support_goals: Optional[str] = None
    accessibility_needs: Optional[str] = None
    cultural_considerations: Optional[str] = None
    
    # Consent
    consent_checkbox: bool
    
    @validator('consent_checkbox')
    def consent_must_be_true(cls, v):
        if not v:
            raise ValueError('Consent must be provided')
        return v
    
    @validator('first_name', 'last_name', 'street_address', 'city', 'state', 'postcode', 
               'phone_number', 'preferred_contact', 'disability_type', 'plan_type', 
               'client_goals', 'support_category', 'referrer_first_name', 'referrer_last_name',
               'referrer_phone', 'referred_for', 'reason_for_referral', 'urgency_level')
    def required_fields_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('This field is required and cannot be empty')
        return v.strip()

class ReferralResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone_number: str
    email_address: Optional[str]
    status: str
    created_at: str
    
    class Config:
        from_attributes = True