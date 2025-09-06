from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class ReferralCreate(BaseModel):
    # Client Details
    firstName: str = Field(..., min_length=1, max_length=100, description="Client's first name")
    lastName: str = Field(..., min_length=1, max_length=100, description="Client's last name")  
    dateOfBirth: str = Field(..., description="Client's date of birth (YYYY-MM-DD)")
    phoneNumber: str = Field(..., min_length=1, max_length=20, description="Client's phone number")
    emailAddress: Optional[str] = Field(None, max_length=255, description="Client's email address")
    streetAddress: str = Field(..., min_length=1, description="Client's street address")
    city: str = Field(..., min_length=1, max_length=100, description="Client's city")
    state: str = Field(..., min_length=1, max_length=10, description="Client's state")
    postcode: str = Field(..., min_length=1, max_length=10, description="Client's postcode")
    
    # Representative Details (Optional)
    repFirstName: Optional[str] = Field(None, max_length=100, description="Representative's first name")
    repLastName: Optional[str] = Field(None, max_length=100, description="Representative's last name")
    repPhoneNumber: Optional[str] = Field(None, max_length=20, description="Representative's phone number")
    repEmailAddress: Optional[str] = Field(None, max_length=255, description="Representative's email address")
    repRelationship: Optional[str] = Field(None, max_length=50, description="Relationship to client")

class ReferralResponse(BaseModel):
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
    rep_first_name: Optional[str]
    rep_last_name: Optional[str]
    rep_phone_number: Optional[str]
    rep_email_address: Optional[str]
    rep_relationship: Optional[str]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    notes: Optional[str]
    
    class Config:
        from_attributes = True

class ReferralUpdate(BaseModel):
    status: Optional[str] = Field(None, description="Referral status")
    notes: Optional[str] = Field(None, description="Admin notes")