# backend/app/models/ai_suggestion.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.database import Base

class AISuggestion(Base):
    __tablename__ = "ai_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    subject_type = Column(String(32), nullable=False, default="participant")
    subject_id = Column(Integer, nullable=False)

    suggestion_type = Column(String(32), nullable=False)  # 'care_plan'|'risk'|'note'
    payload = Column(JSONB)        # parsed JSON or structured dict
    raw_text = Column(Text)        # original model text if needed

    provider = Column(String(32))  # 'watsonx'
    model = Column(String(128))    # e.g. 'ibm/granite-3-8b-instruct'
    confidence = Column(String(16))

    created_by = Column(String(128))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    applied = Column(Boolean, default=False)
    applied_by = Column(String(128))
    applied_at = Column(DateTime(timezone=True))