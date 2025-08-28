# backend/app/schemas/document.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from enum import Enum

class DocumentType(str, Enum):
    SERVICE_AGREEMENT = "service_agreement"
    MEDICAL_CONSENT = "medical_consent"
    INTAKE_DOCUMENTS = "intake_documents"
    GENERAL_DOCUMENTS = "general_documents"
    REPORTING_DOCUMENTS = "reporting_documents"

class DocumentCreate(BaseModel):
    participant_id: Optional[str] = None
    home_id: Optional[str] = None
    title: str
    document_type: DocumentType
    category: str
    expiry_date: Optional[date] = None
    visible_to_worker: bool = False

class DocumentResponse(BaseModel):
    id: str
    participant_id: Optional[str] = None
    home_id: Optional[str] = None
    title: str
    document_type: DocumentType
    category: str
    file_url: str
    file_size: int
    file_type: str
    expiry_date: Optional[date] = None
    visible_to_worker: bool
    uploaded_by: str
    is_expired: bool
    created_at: datetime
    updated_at: datetime