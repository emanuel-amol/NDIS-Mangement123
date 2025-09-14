# Save this content to: backend/app/schemas/provider.py

from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, date, time
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

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

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

# Provider Schedule Schemas
class ProviderScheduleResponse(BaseModel):
    id: int
    appointment_date: datetime
    duration_minutes: int
    status: AppointmentStatus
    service_type: str
    participant_name: str
    location: Optional[str] = None
    appointment_notes: Optional[str] = None
    
    class Config:
        from_attributes = True

# Provider Availability Schemas
class ProviderAvailabilityCreate(BaseModel):
    day_of_week: int  # 0-6 (Monday-Sunday)
    start_time: time
    end_time: time
    is_available: bool = True
    max_appointments: int = 8
    location: Optional[str] = None

class ProviderAvailabilityResponse(BaseModel):
    id: int
    day_of_week: int
    start_time: time
    end_time: time
    is_available: bool
    max_appointments: int
    location: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Additional Provider Schemas
class ProviderProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    service_type: Optional[str] = None
    provider_license: Optional[str] = None
    provider_agency: Optional[str] = None
    provider_bio: Optional[str] = None

class ProviderNotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    priority: str
    is_read: bool
    is_acknowledged: bool
    action_required: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProviderPerformanceResponse(BaseModel):
    total_referrals: int
    accepted_referrals: int
    completed_referrals: int
    declined_referrals: int
    acceptance_rate: float
    completion_rate: float
    average_response_time_hours: Optional[float] = None
    average_completion_time_days: Optional[float] = None
    participant_satisfaction_avg: Optional[float] = None
    recent_performance_trend: str  # "improving", "stable", "declining"
    
    class Config:
        from_attributes = True

class ParticipantSummary(BaseModel):
    id: int
    name: str
    ndis_number: Optional[str]
    status: str
    last_appointment: Optional[datetime]
    next_appointment: Optional[datetime]
    total_sessions: int
    
    class Config:
        from_attributes = True