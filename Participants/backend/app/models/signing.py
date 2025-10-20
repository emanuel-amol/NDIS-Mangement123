# backend/app/models/signing.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SigningEnvelope(Base):
    __tablename__ = "signing_envelopes"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Who/what
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    document_ids_json = Column(JSON, nullable=False, default=list)  # [document_id, ...]
    
    # Public access token (sent via email link)
    token = Column(String(64), unique=True, index=True, nullable=False)
    
    # Signer details
    signer_name = Column(String(255), nullable=False)
    signer_email = Column(String(255), nullable=False)
    signer_role = Column(String(50), nullable=False)  # "participant" | "guardian"
    
    # Status lifecycle
    status = Column(String(32), nullable=False, default="pending")  # pending|viewed|signed|declined|expired|cancelled
    expires_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Provider countersign (optional, out of scope for MVP)
    provider_countersign_required = Column(Boolean, default=False)
    provider_countersigned_at = Column(DateTime(timezone=True), nullable=True)
    
    # Certificate & misc
    certificate_json = Column(JSON, default=dict)  # { "events": [...], "ip": "...", ... }
    last_ip = Column(String(64), nullable=True)
    
    # Audit
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships (lazy, optional)
    events = relationship("SignatureEvent", back_populates="envelope", cascade="all, delete-orphan")


class SignatureEvent(Base):
    __tablename__ = "signature_events"
    
    id = Column(Integer, primary_key=True)
    envelope_id = Column(Integer, ForeignKey("signing_envelopes.id"), index=True, nullable=False)
    event_type = Column(String(32), nullable=False)  # sent|opened|signed|declined|expired|resend|cancel
    at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    meta = Column(JSON, default=dict)  # {"ua":..., "ip":...}
    note = Column(Text, nullable=True)
    
    envelope = relationship("SigningEnvelope", back_populates="events")