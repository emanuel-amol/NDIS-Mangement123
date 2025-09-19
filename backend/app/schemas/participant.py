# backend/app/schemas/participant.py - FIXED VERSION
from pydantic import BaseModel, validator
from datetime import date
from typing import Optional

class ParticipantBase(BaseModel):
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
    disability_type: str
    
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
    ndis_number: Optional[str] = None
    plan_type: str
    plan_manager_name: Optional[str] = None
    plan_manager_agency: Optional[str] = None
    available_funding: Optional[str] = None
    plan_start_date: date
    plan_review_date: date
    support_category: str
    
    # Goals and Care
    client_goals: str
    support_goals: Optional[str] = None
    current_supports: Optional[str] = None
    accessibility_needs: Optional[str] = None
    cultural_considerations: Optional[str] = None
    
    # Risk Assessment
    risk_level: str = "low"
    risk_notes: Optional[str] = None

    @validator('first_name', 'last_name', 'street_address', 'city', 'state', 'postcode', 
               'phone_number', 'preferred_contact', 'disability_type', 'plan_type', 
               'client_goals', 'support_category')
    def required_fields_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('This field is required and cannot be empty')
        return v.strip()

class ParticipantCreate(ParticipantBase):
    pass

class ParticipantUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    phone_number: Optional[str] = None
    email_address: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    preferred_contact: Optional[str] = None
    disability_type: Optional[str] = None
    
    # Representative Details
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
    ndis_number: Optional[str] = None
    plan_type: Optional[str] = None
    plan_manager_name: Optional[str] = None
    plan_manager_agency: Optional[str] = None
    available_funding: Optional[str] = None
    plan_start_date: Optional[date] = None
    plan_review_date: Optional[date] = None
    support_category: Optional[str] = None
    
    # Goals and Care
    client_goals: Optional[str] = None
    support_goals: Optional[str] = None
    current_supports: Optional[str] = None
    accessibility_needs: Optional[str] = None
    cultural_considerations: Optional[str] = None
    
    # Risk Assessment
    risk_level: Optional[str] = None
    risk_notes: Optional[str] = None
    
    # Status
    status: Optional[str] = None

class ParticipantResponse(BaseModel):
    """Response schema that handles potentially missing data gracefully"""
    id: int
    first_name: str
    last_name: str
    date_of_birth: date
    phone_number: str
    email_address: Optional[str] = None
    
    # Address fields - make optional to handle legacy data
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    preferred_contact: Optional[str] = None
    
    disability_type: str
    
    # Representative Details (Optional)
    rep_first_name: Optional[str] = None
    rep_last_name: Optional[str] = None
    rep_relationship: Optional[str] = None
    
    # NDIS Details
    ndis_number: Optional[str] = None
    plan_type: str
    plan_manager_name: Optional[str] = None
    plan_manager_agency: Optional[str] = None
    available_funding: Optional[str] = None
    plan_start_date: date
    plan_review_date: date
    support_category: str
    
    # Goals and Care - make optional to handle legacy data
    client_goals: Optional[str] = None
    support_goals: Optional[str] = None
    current_supports: Optional[str] = None
    accessibility_needs: Optional[str] = None
    cultural_considerations: Optional[str] = None
    
    # Status and Risk
    status: str
    risk_level: str
    onboarding_completed: bool
    care_plan_completed: bool
    created_at: str
    
    class Config:
        from_attributes = True

class ParticipantListResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    ndis_number: Optional[str]
    phone_number: str
    email_address: Optional[str]
    status: str
    support_category: str
    plan_start_date: date
    plan_review_date: date
    risk_level: str
    created_at: str
    
    class Config:
        from_attributes = True