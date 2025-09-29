# backend/app/api/v1/endpoints/participant_ai.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import logging

from app.core.database import get_db
from app.models.participant import Participant
from app.schemas.ai import AISuggestionCreate
from app.services.ai_suggestion_service import (
    save_suggestion, 
    get_participant_suggestions,
    mark_suggestion_applied
)

router = APIRouter(prefix="/participants/{participant_id}/ai", tags=["participant-ai"])
logger = logging.getLogger(__name__)

def get_ai_provider():
    """Get the configured AI provider (WatsonxLLM)"""
    try:
        from ai.watsonx_provider import WatsonxLLM
        return WatsonxLLM()
    except Exception as e:
        logger.error(f"Failed to initialize AI provider: {e}")
        raise HTTPException(
            status_code=503, 
            detail="AI service unavailable. Check Watsonx configuration."
        )

@router.post("/care-plan/suggest")
def suggest_care_plan(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Generate AI-powered care plan suggestions for a participant"""
    try:
        # Get participant
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get AI provider
        ai = get_ai_provider()
        
        # Prepare participant data
        participant_data = {
            "id": participant.id,
            "name": f"{participant.first_name} {participant.last_name}",
            "date_of_birth": participant.date_of_birth.isoformat() if participant.date_of_birth else None,
            "ndis_number": participant.ndis_number,
            "support_needs": participant.support_needs or "Not specified",
            "communication_preferences": participant.communication_preferences or {},
        }
        
        # Generate care plan
        care_plan_markdown = ai.care_plan_markdown(participant_data)
        
        # Save suggestion
        suggestion_data = AISuggestionCreate(
            subject_id=participant_id,
            suggestion_type="care_plan",
            payload={"markdown": care_plan_markdown},
            raw_text=care_plan_markdown,
            provider="watsonx",
            model=ai.cfg.model_id,
            confidence="medium",
            created_by="api"
        )
        
        saved_suggestion = save_suggestion(db, suggestion_data)
        
        return {
            "suggestion_id": saved_suggestion.id,
            "participant_id": participant_id,
            "suggestion_type": "care_plan",
            "content": care_plan_markdown,
            "provider": "watsonx",
            "model": ai.cfg.model_id,
            "created_at": saved_suggestion.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating care plan suggestion: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate care plan: {str(e)}")

@router.post("/risk/assess")
def assess_risk(
    participant_id: int,
    notes: List[str] = [],
    db: Session = Depends(get_db)
):
    """Generate AI-powered risk assessment for a participant"""
    try:
        # Get participant
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get AI provider
        ai = get_ai_provider()
        
        # If no notes provided, use participant's existing notes/history
        if not notes:
            notes = [
                participant.support_needs or "No support needs documented",
                participant.medical_information or "No medical information available"
            ]
        
        # Generate risk assessment
        risk_summary = ai.risk_summary(notes)
        
        # Save suggestion
        suggestion_data = AISuggestionCreate(
            subject_id=participant_id,
            suggestion_type="risk",
            payload={"summary": risk_summary},
            raw_text=risk_summary,
            provider="watsonx",
            model=ai.cfg.model_id,
            confidence="medium",
            created_by="api"
        )
        
        saved_suggestion = save_suggestion(db, suggestion_data)
        
        return {
            "suggestion_id": saved_suggestion.id,
            "participant_id": participant_id,
            "suggestion_type": "risk_assessment",
            "content": risk_summary,
            "provider": "watsonx",
            "model": ai.cfg.model_id,
            "created_at": saved_suggestion.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating risk assessment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to assess risk: {str(e)}")

@router.post("/notes/clinical")
def generate_clinical_note(
    participant_id: int,
    interaction_summary: str,
    db: Session = Depends(get_db)
):
    """Generate AI-powered clinical/SOAP note from interaction summary"""
    try:
        # Get participant
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get AI provider
        ai = get_ai_provider()
        
        # Generate SOAP note
        soap_note = ai.soap_note(interaction_summary)
        
        # Save suggestion
        suggestion_data = AISuggestionCreate(
            subject_id=participant_id,
            suggestion_type="note",
            payload={"soap_note": soap_note},
            raw_text=soap_note,
            provider="watsonx",
            model=ai.cfg.model_id,
            confidence="medium",
            created_by="api"
        )
        
        saved_suggestion = save_suggestion(db, suggestion_data)
        
        return {
            "suggestion_id": saved_suggestion.id,
            "participant_id": participant_id,
            "suggestion_type": "clinical_note",
            "content": soap_note,
            "provider": "watsonx",
            "model": ai.cfg.model_id,
            "created_at": saved_suggestion.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating clinical note: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate note: {str(e)}")

@router.get("/suggestions/history")
def get_suggestion_history(
    participant_id: int,
    suggestion_type: str = None,
    limit: int = 20,
    applied_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get AI suggestion history for a participant"""
    try:
        # Get participant
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get suggestions
        suggestions = get_participant_suggestions(
            db=db,
            participant_id=participant_id,
            suggestion_type=suggestion_type,
            limit=limit,
            applied_only=applied_only
        )
        
        return {
            "participant_id": participant_id,
            "total": len(suggestions),
            "suggestions": [
                {
                    "id": s.id,
                    "type": s.suggestion_type,
                    "content": s.raw_text,
                    "payload": s.payload,
                    "provider": s.provider,
                    "model": s.model,
                    "applied": s.applied,
                    "applied_by": s.applied_by,
                    "applied_at": s.applied_at.isoformat() if s.applied_at else None,
                    "created_at": s.created_at.isoformat()
                }
                for s in suggestions
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching suggestion history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suggestions/{suggestion_id}/apply")
def apply_suggestion(
    participant_id: int,
    suggestion_id: int,
    applied_by: str = "user",
    db: Session = Depends(get_db)
):
    """Mark an AI suggestion as applied"""
    try:
        success = mark_suggestion_applied(db, suggestion_id, applied_by)
        
        if not success:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        return {
            "message": "Suggestion marked as applied",
            "suggestion_id": suggestion_id,
            "applied_by": applied_by
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))