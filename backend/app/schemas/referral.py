# backend/app/schemas/referral.py
from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

class ReferralBase(BaseModel):
    firstName: str
    lastName: str
    dateOfBirth: date
    phoneNumber: str
    emailAddress: EmailStr
    streetAddress: str
    city: str
    state: str
    postcode: str
    repFirstName: Optional[str] = None
    repLastName: Optional[str] = None
    repPhoneNumber: Optional[str] = None
    repEmailAddress: Optional[EmailStr] = None
    repRelationship: Optional[str] = None

class ReferralCreate(ReferralBase):
    pass

class ReferralUpdate(BaseModel):
    # Partial update
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    dateOfBirth: Optional[date] = None
    phoneNumber: Optional[str] = None
    emailAddress: Optional[EmailStr] = None
    streetAddress: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    repFirstName: Optional[str] = None
    repLastName: Optional[str] = None
    repPhoneNumber: Optional[str] = None
    repEmailAddress: Optional[EmailStr] = None
    repRelationship: Optional[str] = None

class ReferralResponse(ReferralBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime

    # allow `from_attributes=True` if you ever return ORM directly
    model_config = ConfigDict(from_attributes=True)
