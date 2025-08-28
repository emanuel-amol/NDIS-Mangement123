# backend/app/schemas/participant.py
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, date
from enum import Enum

class ParticipantStatus(str, Enum):
    REFERRAL = "referral"
    PROSPECTIVE = "prospective"
    ONBOARDED = "onboarded"
    ACTIVE = "active"
    INACTIVE = "inactive"

class ReferralCreate(BaseModel):
    participant_name: str
    contact_email: EmailStr
    contact_phone: str
    disability_type: str
    care_requirements: str
    referred_by: str
    notes: Optional[str] = None

class ReferralResponse(BaseModel):
    id: str
    participant_name: str
    contact_email: str
    contact_phone: str
    disability_type: str
    care_requirements: str
    referred_by: str
    notes: Optional[str] = None
    status: ParticipantStatus
    created_at: datetime
    updated_at: datetime

class CarePlanCreate(BaseModel):
    participant_id: str
    goals: List[str]
    support_requirements: List[str]
    frequency: str
    duration_hours: int
    special_instructions: Optional[str] = None

class CarePlanResponse(BaseModel):
    id: str
    participant_id: str
    goals: List[str]
    support_requirements: List[str]
    frequency: str
    duration_hours: int
    special_instructions: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class RiskAssessmentCreate(BaseModel):
    participant_id: str
    physical_risks: List[str]
    mental_health_risks: List[str]
    environmental_risks: List[str]
    mitigation_strategies: List[str]
    risk_level: str  # low, medium, high, critical

class RiskAssessmentResponse(BaseModel):
    id: str
    participant_id: str
    physical_risks: List[str]
    mental_health_risks: List[str]
    environmental_risks: List[str]
    mitigation_strategies: List[str]
    risk_level: str
    created_at: datetime
    updated_at: datetime

class ParticipantCreate(BaseModel):
    referral_id: str
    
class ParticipantResponse(BaseModel):
    id: str
    referral_id: str
    status: ParticipantStatus
    care_plan_id: Optional[str] = None
    risk_assessment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime