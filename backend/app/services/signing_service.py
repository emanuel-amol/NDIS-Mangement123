# backend/app/services/signing_service.py - COMPLETE UPDATED VERSION
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
import logging

logger = logging.getLogger(__name__)


class SigningService:
    def __init__(self, db: Session):
        self.db = db
        self.email = EmailService()
        self.signing_base_url = os.getenv('SIGNING_BASE_URL', 'http://localhost:5173')
    
    # ===== Helpers =====
    @staticmethod
    def _make_token() -> str:
        return secrets.token_urlsafe(32)  # ~43 chars base64
    
    def _log(self, env: SigningEnvelope, event_type: str, meta: Dict[str, Any] | None = None, note: str | None = None):
        ev = SignatureEvent(envelope_id=env.id, event_type=event_type, meta=meta or {}, note=note)
        self.db.add(ev)
        self.db.flush()
    
    def _get_signing_url(self, token: str) -> str:
        """Generate the public signing URL using environment configuration"""
        # Remove trailing slash from base URL if present
        base_url = self.signing_base_url.rstrip('/')
        return f"{base_url}/sign/{token}"
    
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
        send_email: bool = True,
    ) -> SigningEnvelope:
        """
        Create signing envelope and optionally send invitation email
        
        Args:
            participant_id: ID of the participant
            document_ids: List of document IDs to include
            signer_name: Name of the person who will sign
            signer_email: Email of the signer
            signer_role: Role of signer ('participant' or 'guardian')
            created_by_user_id: Optional user ID who created this
            ttl_days: Days until expiration (default 14)
            send_email: Whether to send invitation email (default True)
        
        Returns:
            SigningEnvelope: Created envelope
        """
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
        
        # Set documents to pending_signature
        for doc in docs:
            doc.status = "pending_signature"
        
        # Create envelope
        token = self._make_token()
        env = SigningEnvelope(
            participant_id=participant_id,
            document_ids_json=document_ids,
            token=token,
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
        
        # Log the creation event
        self._log(env, "created", note=f"Envelope created for {signer_email}")
        
        # Send invitation email
        if send_email:
            try:
                signing_url = self._get_signing_url(token)
                email_sent = self.email.send_signing_invitation(env, participant, signing_url)
                
                if email_sent:
                    self._log(env, "sent", meta={"email": signer_email}, note=f"Invitation email sent to {signer_email}")
                    logger.info(f"Signing invitation email sent for envelope {env.id} to {signer_email}")
                else:
                    self._log(env, "email_failed", meta={"email": signer_email}, note="Failed to send invitation email")
                    logger.warning(f"Failed to send signing invitation email for envelope {env.id}")
                    
            except Exception as e:
                logger.error(f"Error sending signing invitation email for envelope {env.id}: {str(e)}")
                self._log(env, "email_error", meta={"error": str(e)}, note=f"Email error: {str(e)}")
        
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
            logger.info(f"Envelope {env.id} marked as viewed from IP {ip}")
    
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
        env.certificate_json["user_agent"] = ua
        
        self.db.commit()
        logger.info(f"Envelope {env.id} signed by {typed_name} from IP {ip}")
    
    def cancel(self, env: SigningEnvelope, reason: Optional[str] = None):
        """Cancel an envelope."""
        if env.status in ("signed", "declined", "expired"):
            raise ValueError(f"Cannot cancel envelope that is {env.status}")
        
        env.status = "cancelled"
        self._log(env, "cancelled", note=reason or "Envelope cancelled")
        
        # Update document statuses back to active
        docs = self.db.query(Document).filter(Document.id.in_(env.document_ids_json)).all()
        for doc in docs:
            if doc.status == "pending_signature":
                doc.status = "active"
        
        self.db.commit()
        logger.info(f"Envelope {env.id} cancelled: {reason}")
    
    def resend(self, env: SigningEnvelope) -> bool:
        """Resend envelope email."""
        if env.status not in ("pending", "viewed"):
            raise ValueError(f"Cannot resend envelope that is {env.status}")
        
        try:
            # Get participant
            participant = self.db.get(Participant, env.participant_id)
            if not participant:
                raise ValueError("Participant not found")
            
            # Generate signing URL
            signing_url = self._get_signing_url(env.token)
            
            # Send email
            email_sent = self.email.send_signing_invitation(env, participant, signing_url)
            
            if email_sent:
                self._log(env, "resent", meta={"email": env.signer_email}, note=f"Invitation resent to {env.signer_email}")
                self.db.commit()
                logger.info(f"Envelope {env.id} resent to {env.signer_email}")
                return True
            else:
                logger.warning(f"Failed to resend envelope {env.id}")
                return False
                
        except Exception as e:
            logger.error(f"Error resending envelope {env.id}: {str(e)}")
            return False
    
    def check_expired_envelopes(self) -> int:
        """Check and mark expired envelopes. Returns count of envelopes expired."""
        now = datetime.now(timezone.utc)
        
        expired_envelopes = self.db.query(SigningEnvelope).filter(
            SigningEnvelope.status.in_(["pending", "viewed"]),
            SigningEnvelope.expires_at < now
        ).all()
        
        count = 0
        for env in expired_envelopes:
            env.status = "expired"
            self._log(env, "expired", note="Envelope expired automatically")
            
            # Update document statuses back to active
            docs = self.db.query(Document).filter(Document.id.in_(env.document_ids_json)).all()
            for doc in docs:
                if doc.status == "pending_signature":
                    doc.status = "active"
            
            count += 1
            logger.info(f"Envelope {env.id} marked as expired")
        
        if count > 0:
            self.db.commit()
            
        return count
    
    def get_envelope_events(self, envelope_id: int) -> List[SignatureEvent]:
        """Get all events for an envelope."""
        return self.db.query(SignatureEvent).filter(
            SignatureEvent.envelope_id == envelope_id
        ).order_by(SignatureEvent.at.desc()).all()
    
    def get_participant_envelopes(
        self, 
        participant_id: int, 
        status: Optional[str] = None
    ) -> List[SigningEnvelope]:
        """Get all envelopes for a participant, optionally filtered by status."""
        query = self.db.query(SigningEnvelope).filter(
            SigningEnvelope.participant_id == participant_id
        )
        
        if status:
            query = query.filter(SigningEnvelope.status == status)
        
        return query.order_by(SigningEnvelope.created_at.desc()).all()