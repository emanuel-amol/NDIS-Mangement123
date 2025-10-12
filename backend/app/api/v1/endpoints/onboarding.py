# backend/app/api/v1/endpoints/onboarding.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.models.participant import Participant
from app.models.document import Document
from app.services.signing_service import SigningService

router = APIRouter(prefix="/participants", tags=["onboarding"])


class OnboardingPackItem(BaseModel):
    document_id: int | None
    document_type: str
    title: str
    status: str  # MISSING | pending_signature | signed | ready
    required: bool
    category: str


class OnboardingPackResponse(BaseModel):
    participant_id: int
    participant_name: str
    items: List[OnboardingPackItem]
    all_required_complete: bool
    missing_count: int
    pending_signature_count: int
    signed_count: int


class SendPackRequest(BaseModel):
    signer_name: str
    signer_email: EmailStr
    signer_role: str  # "participant" | "guardian"


class SendPackResponse(BaseModel):
    ok: bool
    envelope_id: int
    token: str
    document_count: int
    public_url: str


@router.get("/{participant_id}/onboarding/pack", response_model=OnboardingPackResponse)
def get_onboarding_pack(participant_id: int, db: Session = Depends(get_db)):
    """Get the onboarding pack status for a participant."""
    participant = db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Define required onboarding documents
    required_docs = [
        {"type": "ndis_service_agreement", "title": "NDIS Service Agreement", "category": "service_agreements"},
        {"type": "medical_consent_form", "title": "Medical Consent Form", "category": "medical_consent"},
        {"type": "participant_handbook", "title": "Participant Handbook", "category": "intake_documents"},
        {"type": "medication_management_form", "title": "Medication Management", "category": "medical_consent"},
    ]
    
    # Get all documents for this participant
    docs = db.query(Document).filter(
        Document.participant_id == participant_id,
        Document.is_active == True
    ).all()
    
    # Map documents by type
    doc_map: Dict[str, Document] = {}
    for doc in docs:
        doc_type = doc.document_type or doc.category
        if doc_type and doc_type not in doc_map:
            doc_map[doc_type] = doc
    
    items = []
    missing_count = 0
    pending_count = 0
    signed_count = 0
    
    for req in required_docs:
        doc = doc_map.get(req["type"])
        
        if doc:
            status = doc.status or "ready"
            item = OnboardingPackItem(
                document_id=doc.id,
                document_type=req["type"],
                title=doc.title or req["title"],
                status=status,
                required=True,
                category=req["category"]
            )
            
            if status == "pending_signature":
                pending_count += 1
            elif status == "signed":
                signed_count += 1
        else:
            missing_count += 1
            item = OnboardingPackItem(
                document_id=None,
                document_type=req["type"],
                title=req["title"],
                status="MISSING",
                required=True,
                category=req["category"]
            )
        
        items.append(item)
    
    all_complete = missing_count == 0 and pending_count == 0 and signed_count == len(required_docs)
    participant_name = f"{participant.first_name} {participant.last_name}"
    
    return OnboardingPackResponse(
        participant_id=participant_id,
        participant_name=participant_name,
        items=items,
        all_required_complete=all_complete,
        missing_count=missing_count,
        pending_signature_count=pending_count,
        signed_count=signed_count
    )


@router.post("/{participant_id}/onboarding/send-pack", response_model=SendPackResponse)
def send_onboarding_pack(
    participant_id: int,
    payload: SendPackRequest,
    db: Session = Depends(get_db)
):
    """Create a signing envelope for all required onboarding documents."""
    participant = db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Get pack status
    pack = get_onboarding_pack(participant_id, db)
    
    # Get document IDs that need signature
    doc_ids = [
        item.document_id 
        for item in pack.items 
        if item.document_id and item.status not in ["signed", "MISSING"]
    ]
    
    if not doc_ids:
        raise HTTPException(
            status_code=400,
            detail="No documents available to send. Generate required documents first or all are already signed."
        )
    
    # Create signing envelope
    svc = SigningService(db)
    try:
        envelope = svc.create_envelope(
            participant_id=participant_id,
            document_ids=doc_ids,
            signer_name=payload.signer_name,
            signer_email=payload.signer_email,
            signer_role=payload.signer_role,
            ttl_days=14
        )
        
        # Build public URL - TODO: Get from settings
        base_url = "http://localhost:5173"
        public_url = f"{base_url}/sign/{envelope.token}"
        
        return SendPackResponse(
            ok=True,
            envelope_id=envelope.id,
            token=envelope.token,
            document_count=len(doc_ids),
            public_url=public_url
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))