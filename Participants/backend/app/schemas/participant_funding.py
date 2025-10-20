# backend/app/schemas/participant_funding.py
from pydantic import BaseModel, validator
from datetime import date, datetime
from typing import Optional
from decimal import Decimal

class ParticipantFundingBase(BaseModel):
    funding_source: str = "NDIS"
    managed_by: str  # "self", "plan", "ndia"
    catalog_version: str
    total_amount: float
    funding_start_date: date
    funding_end_date: date
    progress_date: Optional[date] = None
    review_date: Optional[date] = None
    referred_date: Optional[date] = None
    signed_date: Optional[date] = None
    notes: Optional[str] = None

    @validator('managed_by')
    def validate_managed_by(cls, v):
        if v not in ['self', 'plan', 'ndia']:
            raise ValueError('managed_by must be one of: self, plan, ndia')
        return v

    @validator('total_amount')
    def validate_total_amount(cls, v):
        if v <= 0:
            raise ValueError('total_amount must be greater than 0')
        return v

class ParticipantFundingCreate(ParticipantFundingBase):
    pass

class ParticipantFundingUpdate(BaseModel):
    funding_source: Optional[str] = None
    managed_by: Optional[str] = None
    catalog_version: Optional[str] = None
    total_amount: Optional[float] = None
    used_amount: Optional[float] = None
    funding_start_date: Optional[date] = None
    funding_end_date: Optional[date] = None
    progress_date: Optional[date] = None
    review_date: Optional[date] = None
    referred_date: Optional[date] = None
    signed_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ParticipantFundingResponse(ParticipantFundingBase):
    id: int
    participant_id: int
    used_amount: float
    remaining_amount: float
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: Optional[str]
    
    class Config:
        from_attributes = True