# backend/app/api/public/signing.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.signing import EnvelopePublicRead, AcceptSignatureRequest, EnvelopeActionResponse
from app.services.signing_service import SigningService
from app.models.signing import SigningEnvelope
from app.models.document import Document

router = APIRouter(prefix="/api/public/sign", tags=["public-signing"])


@router.get("/{token}", response_model=EnvelopePublicRead)
def get_envelope(token: str, request: Request, db: Session = Depends(get_db)):
    svc = SigningService(db)
    env = svc.get_envelope_by_token(token)
    
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    
    if env.status in ("declined", "cancelled", "expired"):
        raise HTTPException(status_code=410, detail=f"Envelope {env.status}")
    
    # Record viewed
    svc.mark_viewed(env, ip=request.client.host if request.client else None, ua=request.headers.get("User-Agent"))
    
    # Minimal doc info for screen
    docs = db.query(Document).filter(Document.id.in_(env.document_ids_json)).all()
    docs_public = [
        {"id": d.id, "title": d.title or d.original_filename or d.filename, "filename": d.filename, "category": d.category}
        for d in docs
    ]
    
    return EnvelopePublicRead(
        signer_name=env.signer_name,
        signer_role=env.signer_role,
        documents=docs_public,
        status=env.status,
        expires_at=env.expires_at,
    )


@router.post("/{token}/accept", response_model=EnvelopeActionResponse)
def accept(token: str, payload: AcceptSignatureRequest, request: Request, db: Session = Depends(get_db)):
    if not payload.accept_terms:
        raise HTTPException(status_code=400, detail="You must accept the terms to sign")
    
    if not payload.typed_name or len(payload.typed_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Please type your full name")
    
    svc = SigningService(db)
    env = svc.get_envelope_by_token(token)
    
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    
    if env.status in ("declined", "cancelled", "expired", "signed"):
        raise HTTPException(status_code=409, detail=f"Envelope already {env.status}")
    
    svc.accept_signature(
        env, 
        typed_name=payload.typed_name.strip(), 
        ip=request.client.host if request.client else None, 
        ua=request.headers.get("User-Agent")
    )
    
    return EnvelopeActionResponse(ok=True, status="signed")