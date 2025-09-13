from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum

class ReferralStatus(str, Enum):
    NEW = "new"
    ASSIGNED = "assigned"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DECLINED = "declined"
    CANCELLED = "cancelled"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class ProviderDashboardResponse(BaseModel):
    total_referrals: int
    new_referrals: int
    accepted_referrals: int
    completed_referrals: int
    active_participants: int
    performance_rating: Optional[float] = None
    recent_activity: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

class ProviderReferralResponse(BaseModel):
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
    plan_type: str
    ndis_number: Optional[str]
    plan_start_date: str
    plan_review_date: str
    client_goals: str
    referred_for: str
    reason_for_referral: str
    status: str
    priority: str = "medium"
    referrer_first_name: str
    referrer_last_name: str
    referrer_email: str
    referrer_phone: str
    created_at: datetime
    updated_at: Optional[datetime]
    provider_notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class ReferralStatusUpdate(BaseModel):
    status: ReferralStatus
    notes: Optional[str] = None