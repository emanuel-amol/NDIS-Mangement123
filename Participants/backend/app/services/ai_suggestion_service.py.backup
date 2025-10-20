# backend/app/services/ai_suggestion_service.py
from sqlalchemy.orm import Session
from app.models.ai_suggestion import AISuggestion
from app.schemas.ai import AISuggestionCreate

def save_suggestion(db: Session, data: AISuggestionCreate) -> AISuggestion:
    obj = AISuggestion(
        subject_type="participant",
        subject_id=data.subject_id,
        suggestion_type=data.suggestion_type,
        payload=data.payload,
        raw_text=data.raw_text,
        provider=data.provider,
        model=data.model,
        confidence=data.confidence,
        created_by=data.created_by or "api",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
