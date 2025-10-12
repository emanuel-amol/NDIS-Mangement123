# backend/app/api/v1/endpoints/signing.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.signing import EnvelopeCreate, EnvelopeRead, EnvelopeActionResponse
from app.services.signing_service import SigningService
from app.models.signing import SigningEnvelope

router = APIRouter(prefix="/signing", tags=["signing"])


@router.post("/envelopes", response_model=EnvelopeRead)
def create_envelope(payload: EnvelopeCreate, db: Session = Depends(get_db)):
    svc = SigningService(db)
    try:
        env = svc.create_envelope(
            participant_id=payload.participant_id,
            document_ids=payload.document_ids,
            signer_name=payload.signer_name,
            signer_email=payload.signer_email,
            signer_role=payload.signer_role,
            ttl_days=payload.ttl_days,
        )
        return env
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/envelopes", response_model=List[EnvelopeRead])
def list_envelopes(participant_id: int, db: Session = Depends(get_db)):
    q = db.query(SigningEnvelope).filter(SigningEnvelope.participant_id == participant_id).order_by(SigningEnvelope.id.desc())
    return q.all()


@router.post("/envelopes/{envelope_id}/cancel", response_model=EnvelopeActionResponse)
def cancel_envelope(envelope_id: int, db: Session = Depends(get_db)):
    env = db.get(SigningEnvelope, envelope_id)
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    SigningService(db).cancel(env)
    return EnvelopeActionResponse(ok=True, status="cancelled")


@router.post("/envelopes/{envelope_id}/resend", response_model=EnvelopeActionResponse)
def resend_envelope(envelope_id: int, db: Session = Depends(get_db)):
    env = db.get(SigningEnvelope, envelope_id)
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    SigningService(db).resend(env)
    return EnvelopeActionResponse(ok=True, status=env.status)