# backend/app/schemas/signing.py
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


class EnvelopeCreate(BaseModel):
    participant_id: int
    document_ids: List[int]
    signer_name: str
    signer_email: EmailStr
    signer_role: str = Field(pattern="^(participant|guardian)$")
    ttl_days: int = 14


class EnvelopeRead(BaseModel):
    id: int
    participant_id: int
    document_ids: List[int] = Field(alias="document_ids_json")
    signer_name: str
    signer_email: EmailStr
    signer_role: str
    status: str
    expires_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True
        populate_by_name = True


class EnvelopePublicRead(BaseModel):
    signer_name: str
    signer_role: str
    documents: List[dict]  # [{id, title, filename, category}]
    status: str
    expires_at: Optional[datetime]


class AcceptSignatureRequest(BaseModel):
    typed_name: str
    accept_terms: bool


class EnvelopeActionResponse(BaseModel):
    ok: bool
    status: str