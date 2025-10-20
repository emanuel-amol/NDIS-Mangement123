# backend/app/schemas/referral.py - UPDATED WITH FILE SUPPORT
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class AttachedFileBase(BaseModel):
    """Schema for attached file information"""
    file_id: str
    original_name: str
    file_url: str
    file_size: int
    file_type: str
    uploaded_at: str
    description: Optional[str] = None

class ReferralCreate(BaseModel):
    # Client Details
    first_name: str
    last_name: str
    date_of_birth: date
    phone_number: str
    email_address: Optional[str] = None
    street_address: str
    city: str
    state: str
    postcode: str
    preferred_contact: str
    disability_type: Optional[str] = None

    # Representative Details (Optional)
    rep_first_name: Optional[str] = None
    rep_last_name: Optional[str] = None
    rep_phone_number: Optional[str] = None
    rep_email_address: Optional[str] = None
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
    support_category: Optional[str] = None

    # Referrer Details
    referrer_first_name: str
    referrer_last_name: str
    referrer_agency: Optional[str] = None
    referrer_role: Optional[str] = None
    referrer_email: str
    referrer_phone: str

    # Reason for Referral
    referred_for: str
    referred_for_other: Optional[str] = None
    reason_for_referral: str
    urgency_level: Optional[str] = None
    current_supports: Optional[str] = None
    support_goals: Optional[str] = None
    accessibility_needs: Optional[str] = None
    cultural_considerations: Optional[str] = None

    # Consent
    consent_checkbox: bool

    # NEW: File attachments
    attached_files: Optional[List[Dict[str, Any]]] = []

    @validator('email_address')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v

    @validator('rep_email_address')
    def validate_rep_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid representative email format')
        return v

    @validator('referrer_email')
    def validate_referrer_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid referrer email format')
        return v

    @validator('consent_checkbox')
    def validate_consent(cls, v):
        if not v:
            raise ValueError('Consent is required')
        return v

    class Config:
        schema_extra = {
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "date_of_birth": "1990-01-01",
                "phone_number": "0400123456",
                "email_address": "john.doe@email.com",
                "street_address": "123 Main St",
                "city": "Melbourne",
                "state": "VIC",
                "postcode": "3000",
                "preferred_contact": "phone",
                "disability_type": "intellectual",
                "plan_type": "self-managed",
                "plan_start_date": "2024-01-01",
                "plan_review_date": "2024-12-31",
                "client_goals": "Increase independence in daily living",
                "referrer_first_name": "Jane",
                "referrer_last_name": "Smith",
                "referrer_email": "jane.smith@agency.com",
                "referrer_phone": "0300654321",
                "referred_for": "physiotherapy",
                "reason_for_referral": "Client requires support with mobility",
                "consent_checkbox": True,
                "attached_files": []
            }
        }

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

class ReferralDetailResponse(BaseModel):
    id: int
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
    disability_type: Optional[str]
    
    # Representative Details
    rep_first_name: Optional[str]
    rep_last_name: Optional[str]
    rep_phone_number: Optional[str]
    rep_email_address: Optional[str]
    rep_relationship: Optional[str]
    
    # NDIS Details
    plan_type: str
    plan_manager_name: Optional[str]
    plan_manager_agency: Optional[str]
    ndis_number: Optional[str]
    available_funding: Optional[str]
    plan_start_date: str
    plan_review_date: str
    client_goals: str
    support_category: Optional[str]
    
    # Referrer Details
    referrer_first_name: str
    referrer_last_name: str
    referrer_agency: Optional[str]
    referrer_role: Optional[str]
    referrer_email: str
    referrer_phone: str
    
    # Reason for Referral
    referred_for: str
    referred_for_other: Optional[str]
    reason_for_referral: str
    urgency_level: Optional[str]
    current_supports: Optional[str]
    support_goals: Optional[str]
    accessibility_needs: Optional[str]
    cultural_considerations: Optional[str]
    
    # Status and tracking
    status: str
    created_at: str
    updated_at: Optional[str]
    internal_notes: Optional[str]
    
    # NEW: Attached files
    attached_files: List[AttachedFileBase] = []
    
    class Config:
        from_attributes = True

class ReferralStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class ReferralFileAssociation(BaseModel):
    file_id: str