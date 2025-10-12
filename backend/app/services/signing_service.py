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
        
        # ✨ NEW: Set documents to pending_signature
        for doc in docs:
            doc.status = "pending_signature"
        
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
        self.db.refresh(env)
        
        # ✨ NEW: Log the event
        self._log(env, "sent", note=f"Sent to {signer_email}")
        self.db.commit()
        
        return env
    
    def get_envelope_by_token(self, token: str) -> Optional[SigningEnvelope]:
        """Get envelope by public token."""
        return self.db.query(SigningEnvelope).filter(SigningEnvelope.token == token).first()
    
    def mark_viewed(self, env: SigningEnvelope, ip: Optional[str] = None, ua: Optional[str] = None):
        """Mark envelope as viewed."""
        if env.status == "pending":
            env.status = "viewed"
            self._log(env, "opened", meta={"ip": ip, "ua": ua})
            self.db.commit()
    
    def accept_signature(
        self, 
        env: SigningEnvelope, 
        typed_name: str, 
        ip: Optional[str] = None, 
        ua: Optional[str] = None
    ):
        """Accept and complete signature."""
        # Update envelope
        env.status = "signed"
        env.completed_at = datetime.now(timezone.utc)
        
        # Update all documents to signed
        docs = self.db.query(Document).filter(Document.id.in_(env.document_ids_json)).all()
        for doc in docs:
            doc.status = "signed"
        
        # Record signature event
        self._log(
            env, 
            "signed", 
            meta={"ip": ip, "ua": ua, "typed_name": typed_name},
            note=f"Signed by {typed_name}"
        )
        
        # Update certificate
        if not env.certificate_json:
            env.certificate_json = {}
        env.certificate_json["signed_by"] = typed_name
        env.certificate_json["signed_at"] = datetime.now(timezone.utc).isoformat()
        env.certificate_json["ip"] = ip
        
        self.db.commit()
    
    def cancel(self, env: SigningEnvelope):
        """Cancel an envelope."""
        if env.status in ("signed", "declined", "expired"):
            raise ValueError(f"Cannot cancel envelope that is {env.status}")
        
        env.status = "cancelled"
        self._log(env, "cancelled")
        self.db.commit()
    
    def resend(self, env: SigningEnvelope):
        """Resend envelope email."""
        if env.status not in ("pending", "viewed"):
            raise ValueError(f"Cannot resend envelope that is {env.status}")
        
        self._log(env, "resend")
        self.db.commit()
        # TODO: Trigger email resend