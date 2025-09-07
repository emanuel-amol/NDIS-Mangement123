# backend/app/schemas/referral.py
from __future__ import annotations

from datetime import date, datetime
from typing import Optional, List
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
    
    # NDIS Information
    disabilityType: str
    serviceTypes: List[str]
    ndisNumber: Optional[str] = None
    urgencyLevel: str
    preferredContactMethod: str
    
    # Support Requirements
    currentSupports: str
    supportGoals: str
    accessibilityNeeds: Optional[str] = None
    culturalConsiderations: Optional[str] = None
    
    # Representative Details (Optional)
    repFirstName: Optional[str] = None
    repLastName: Optional[str] = None
    repPhoneNumber: Optional[str] = None
    repEmailAddress: Optional[EmailStr] = None
    repRelationship: Optional[str] = None

class ReferralCreate(ReferralBase):
    pass

class ReferralUpdate(BaseModel):
    # Partial update - all fields optional
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    dateOfBirth: Optional[date] = None
    phoneNumber: Optional[str] = None
    emailAddress: Optional[EmailStr] = None
    streetAddress: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    
    # NDIS Information
    disabilityType: Optional[str] = None
    serviceTypes: Optional[List[str]] = None
    ndisNumber: Optional[str] = None
    urgencyLevel: Optional[str] = None
    preferredContactMethod: Optional[str] = None
    
    # Support Requirements
    currentSupports: Optional[str] = None
    supportGoals: Optional[str] = None
    accessibilityNeeds: Optional[str] = None
    culturalConsiderations: Optional[str] = None
    
    # Representative Details
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

    model_config = ConfigDict(from_attributes=True)