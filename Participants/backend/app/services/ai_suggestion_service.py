# backend/app/services/ai_suggestion_service.py - FIXED FOR POSTGRESQL
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.models.ai_suggestion import AISuggestion
from app.schemas.ai import AISuggestionCreate
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

def save_suggestion(db: Session, data: AISuggestionCreate) -> AISuggestion:
    """Save an AI suggestion to the database"""
    # Convert payload dict to JSON string if needed for PostgreSQL JSONB
    payload_data = data.payload
    if isinstance(payload_data, dict):
        # PostgreSQL JSONB will handle dict automatically
        payload_data = data.payload
    
    obj = AISuggestion(
        subject_type="participant",
        subject_id=data.subject_id,
        suggestion_type=data.suggestion_type,
        payload=payload_data,  # PostgreSQL JSONB field
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

def get_suggestion_statistics(db: Session, days: int = 30) -> Dict[str, Any]:
    """Get AI suggestion statistics for analytics"""
    try:
        start_date = datetime.now() - timedelta(days=days)
        
        # Total suggestions
        total = db.query(AISuggestion).filter(
            AISuggestion.created_at >= start_date
        ).count()
        
        # Applied suggestions
        applied = db.query(AISuggestion).filter(
            AISuggestion.created_at >= start_date,
            AISuggestion.applied == True
        ).count()
        
        # By type
        by_type = db.query(
            AISuggestion.suggestion_type,
            func.count(AISuggestion.id).label('count')
        ).filter(
            AISuggestion.created_at >= start_date
        ).group_by(AISuggestion.suggestion_type).all()
        
        # By provider
        by_provider = db.query(
            AISuggestion.provider,
            func.count(AISuggestion.id).label('count')
        ).filter(
            AISuggestion.created_at >= start_date
        ).group_by(AISuggestion.provider).all()
        
        # Daily stats - Fixed for PostgreSQL
        daily_stats = db.query(
            func.date_trunc('day', AISuggestion.created_at).label('date'),
            func.count(AISuggestion.id).label('count')
        ).filter(
            AISuggestion.created_at >= start_date
        ).group_by(func.date_trunc('day', AISuggestion.created_at)).all()
        
        return {
            "period_days": days,
            "total_suggestions": total,
            "applied_suggestions": applied,
            "application_rate": round((applied / max(total, 1)) * 100, 2),
            "suggestions_by_type": {item.suggestion_type: item.count for item in by_type},
            "providers": {item.provider or "unknown": item.count for item in by_provider},
            "daily_activity": [
                {"date": str(item.date), "count": item.count} 
                for item in daily_stats
            ],
            "most_active_day": max(daily_stats, key=lambda x: x.count).date.isoformat() if daily_stats else None,
        }
        
    except Exception as e:
        return {
            "period_days": days,
            "total_suggestions": 0,
            "applied_suggestions": 0,
            "application_rate": 0,
            "suggestions_by_type": {},
            "providers": {},
            "daily_activity": [],
            "most_active_day": None,
            "error": f"Statistics unavailable: {str(e)}"
        }

def get_participant_suggestions(
    db: Session, 
    participant_id: int, 
    suggestion_type: Optional[str] = None,
    limit: int = 20,
    applied_only: bool = False
) -> List[AISuggestion]:
    """Get AI suggestions for a specific participant - FIXED FOR POSTGRESQL"""
    try:
        query = db.query(AISuggestion).filter(
            AISuggestion.subject_type == "participant",
            AISuggestion.subject_id == participant_id
        )
        
        if suggestion_type:
            query = query.filter(AISuggestion.suggestion_type == suggestion_type)
            
        if applied_only:
            query = query.filter(AISuggestion.applied == True)
        
        # Order by created_at descending and limit
        suggestions = query.order_by(AISuggestion.created_at.desc()).limit(limit).all()
        
        # Ensure payload is properly serializable
        for suggestion in suggestions:
            if suggestion.payload and isinstance(suggestion.payload, str):
                try:
                    suggestion.payload = json.loads(suggestion.payload)
                except:
                    pass  # Keep as string if not valid JSON
        
        return suggestions
        
    except Exception as e:
        print(f"Error getting participant suggestions: {e}")
        import traceback
        traceback.print_exc()
        return []

def get_suggestion_by_id(db: Session, suggestion_id: int) -> Optional[AISuggestion]:
    """Get a specific AI suggestion by ID"""
    try:
        suggestion = db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()
        
        # Ensure payload is properly serializable
        if suggestion and suggestion.payload and isinstance(suggestion.payload, str):
            try:
                suggestion.payload = json.loads(suggestion.payload)
            except:
                pass
                
        return suggestion
    except Exception:
        return None

def mark_suggestion_applied(
    db: Session, 
    suggestion_id: int, 
    applied_by: str = "user"
) -> bool:
    """Mark an AI suggestion as applied"""
    try:
        suggestion = db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()
        if suggestion:
            suggestion.applied = True
            suggestion.applied_by = applied_by
            suggestion.applied_at = datetime.now()
            db.commit()
            return True
        return False
    except Exception as e:
        print(f"Error marking suggestion as applied: {e}")
        return False

def delete_suggestion(db: Session, suggestion_id: int) -> bool:
    """Delete an AI suggestion"""
    try:
        suggestion = db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()
        if suggestion:
            db.delete(suggestion)
            db.commit()
            return True
        return False
    except Exception as e:
        print(f"Error deleting suggestion: {e}")
        return False

def get_recent_suggestions_count(db: Session, hours: int = 24) -> int:
    """Get count of recent AI suggestions"""
    try:
        since = datetime.now() - timedelta(hours=hours)
        return db.query(AISuggestion).filter(
            AISuggestion.created_at >= since
        ).count()
    except Exception:
        return 0