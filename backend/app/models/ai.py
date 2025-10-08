# backend/app/models/ai.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class AIDocument(Base):
    __tablename__ = "ai_documents"
    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, index=True, nullable=False)
    referral_id = Column(Integer, index=True, nullable=True)
    document_id = Column(Integer, index=True, nullable=True)  # link to your Document table
    cos_key = Column(String, nullable=False)
    doc_type = Column(String, nullable=True)   # 'referral','assessment','medical','notes', etc.
    token_count = Column(Integer, default=0)
    processed_at = Column(DateTime, default=datetime.utcnow)
    meta = Column(JSONB, default={})

class AIChunk(Base):
    __tablename__ = "ai_chunks"
    id = Column(Integer, primary_key=True, index=True)
    ai_document_id = Column(Integer, ForeignKey("ai_documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    meta = Column(JSONB, default={})
    embedding = Column(Text, nullable=True)  # store as JSON/text if not enabling pgvector now

class AICarePlanDraft(Base):
    __tablename__ = "ai_careplan_drafts"
    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, index=True, nullable=False)
    draft_json = Column(JSONB, default={})   # goals[], supports[], citations[]
    source_ids = Column(JSONB, default=[])   # list of ai_chunk ids used
    created_at = Column(DateTime, default=datetime.utcnow)

class AIRiskDraft(Base):
    __tablename__ = "ai_risk_drafts"
    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, index=True, nullable=False)
    draft_json = Column(JSONB, default={})   # risks[], mitigations[], citations[]
    source_ids = Column(JSONB, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)