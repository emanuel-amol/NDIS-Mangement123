# backend/app/services/signing_service.py
from __future__ import annotations
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import os, secrets
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.models.signing import SigningEnvelope, SignatureEvent
from app.models.document import Document
from app.models.participant import Participant
from app.services.email_service import EmailService


class SigningService:
    def __init__(self, db: Session):
        self.db = db
        self.email = EmailService()
    
    # ===== Helpers =====
    @staticmethod
    def _make_token() -> str:
        return secrets.token_urlsafe(32)  # ~43 chars base64
    
    def _log(self, env: SigningEnvelope, event_type: str, meta: Dict[str, Any] | None = None, note: str | None = None):
        ev = SignatureEvent(envelope_id=env.id, event_type=event_type, meta=meta or {}, note=note)
        self.db.add(ev)
        self.db.flush()
    
    # ===== Core ops =====
    def create_envelope(
        self,
        participant_id: int,
        document_ids: List[int],
        signer_name: str,
        signer_email: str,
        signer_role: str,
        created_by_user_id: Optional[int] = None,
        ttl_days: int = 14,
    ) -> SigningEnvelope:
        # Validate participant exists
        participant = self.db.get(Participant, participant_id)
        if not participant:
            raise ValueError("Participant not found")
        
        # Validate docs exist & belong to participant
        docs = self.db.scalars(select(Document).where(Document.id.in_(document_ids))).all()
        if len(docs) != len(document_ids):
            raise ValueError("One or more documents not found")
        if any(d.participant_id != participant_id for d in docs):
            raise ValueError("All documents must belong to the participant")
        
        env = SigningEnvelope(
            participant_id=participant_id,
            document_ids_json=document_ids,
            token=self._make_token(),
            signer_name=signer_name,
            signer_email=signer_email,
            signer_role=signer_role,
            status="pending",
            expires_at=(datetime.now(timezone.utc) + timedelta(days=ttl_days)),
            created_by_user_id=created_by_user_id,
        )
        self.db.add(env)
        self.db.commit()
        return env