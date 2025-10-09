# backend/app/api/v1/endpoints/participant_ai.py - COMPLETE FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.database import get_db
from app.models.participant import Participant
from app.schemas.ai import AISuggestionCreate
from app.services.ai_suggestion_service import save_suggestion

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
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        ai = get_ai_provider()
        
        # Safely build participant data with getattr
        participant_data = {
            "id": participant.id,
            "name": f"{participant.first_name} {participant.last_name}",
            "date_of_birth": participant.date_of_birth.isoformat() if hasattr(participant, 'date_of_birth') and participant.date_of_birth else None,
            "ndis_number": getattr(participant, 'ndis_number', 'Not provided'),
            "support_needs": getattr(participant, 'support_needs', 'Not specified'),
            "communication_preferences": getattr(participant, 'communication_preferences', {}),
        }
        
        # Generate AI care plan
        care_plan_markdown = ai.care_plan_markdown(participant_data)
        
        # ✅ CRITICAL FIX: Validate AI response before saving
        if not care_plan_markdown:
            logger.error(f"AI returned None for participant {participant_id}")
            raise HTTPException(
                status_code=500, 
                detail="AI service returned no response. Please check Watsonx configuration and try again."
            )
        
        if len(care_plan_markdown.strip()) < 10:
            logger.error(f"AI returned very short response for participant {participant_id}: '{care_plan_markdown}'")
            raise HTTPException(
                status_code=500, 
                detail="AI service returned an insufficient response. The response was too short to be useful."
            )
        
        # Check for error indicators in response
        if any(indicator in care_plan_markdown.lower() for indicator in ['error', 'failed', 'unable to', 'could not']):
            logger.warning(f"AI response may contain error for participant {participant_id}: {care_plan_markdown[:100]}")
        
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
        
        logger.info(f"Successfully generated care plan suggestion for participant {participant_id}")
        
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
        logger.error(f"Error generating care plan suggestion: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate care plan: {str(e)}")

@router.post("/risk/assess")
def assess_risk(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Generate AI-powered risk assessment for a participant"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        ai = get_ai_provider()
        
        # Build notes list safely
        notes = []
        support_needs = getattr(participant, 'support_needs', None)
        medical_info = getattr(participant, 'medical_information', None)
        
        if support_needs:
            notes.append(support_needs)
        else:
            notes.append("No support needs documented")
            
        if medical_info:
            notes.append(medical_info)
        else:
            notes.append("No medical information available")
        
        # Generate risk assessment
        risk_summary = ai.risk_summary(notes)
        
        # ✅ CRITICAL FIX: Validate AI response before saving
        if not risk_summary:
            logger.error(f"AI returned None for risk assessment of participant {participant_id}")
            raise HTTPException(
                status_code=500, 
                detail="AI service returned no risk assessment. Please check Watsonx configuration."
            )
        
        if len(risk_summary.strip()) < 10:
            logger.error(f"AI returned very short risk assessment for participant {participant_id}: '{risk_summary}'")
            raise HTTPException(
                status_code=500, 
                detail="AI service returned an insufficient risk assessment. The response was too short."
            )
        
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
        
        logger.info(f"Successfully generated risk assessment for participant {participant_id}")
        
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
        logger.error(f"Error generating risk assessment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to assess risk: {str(e)}")

@router.post("/notes/clinical")
def generate_clinical_note(
    participant_id: int,
    interaction_summary: str,
    db: Session = Depends(get_db)
):
    """Generate AI-powered clinical/SOAP note from interaction summary"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Validate interaction summary
        if not interaction_summary or len(interaction_summary.strip()) < 10:
            raise HTTPException(
                status_code=400, 
                detail="Interaction summary must be at least 10 characters long"
            )
        
        ai = get_ai_provider()
        
        # Generate SOAP note
        soap_note = ai.soap_note(interaction_summary)
        
        # ✅ CRITICAL FIX: Validate AI response before saving
        if not soap_note:
            logger.error(f"AI returned None for clinical note of participant {participant_id}")
            raise HTTPException(
                status_code=500, 
                detail="AI service returned no clinical note. Please check Watsonx configuration."
            )
        
        if len(soap_note.strip()) < 10:
            logger.error(f"AI returned very short clinical note for participant {participant_id}: '{soap_note}'")
            raise HTTPException(
                status_code=500, 
                detail="AI service returned an insufficient clinical note. The response was too short."
            )
        
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
        
        logger.info(f"Successfully generated clinical note for participant {participant_id}")
        
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
        logger.error(f"Error generating clinical note: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate note: {str(e)}")

@router.get("/suggestions/history")
def get_suggestion_history(
    participant_id: int,
    suggestion_type: Optional[str] = None,
    limit: int = 20,
    applied_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get AI suggestion history for a participant"""
    try:
        from app.services.ai_suggestion_service import get_participant_suggestions
        
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
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
        logger.error(f"Error fetching suggestion history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))