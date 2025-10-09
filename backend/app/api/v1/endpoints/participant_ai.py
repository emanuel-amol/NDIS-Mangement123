# backend/app/api/v1/endpoints/participant_ai.py - COMPLETE WITH RAG
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import logging

from app.core.database import get_db
from app.models.participant import Participant
from app.schemas.ai import AISuggestionCreate
from app.services.ai_suggestion_service import save_suggestion
from app.services.rag_service import RAGService

router = APIRouter(prefix="/participants/{participant_id}/ai", tags=["participant-ai"])
logger = logging.getLogger(__name__)

# Pydantic models for request bodies
class ClinicalNoteRequest(BaseModel):
    interactionSummary: str

class AskRequest(BaseModel):
    question: str

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
    """Generate AI-powered care plan suggestions for a participant (standard)"""
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
        
        # Validate AI response before saving
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


@router.post("/care-plan/suggest-with-context")
def suggest_care_plan_with_context(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Generate AI-powered care plan WITH document context from RAG"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        ai = get_ai_provider()
        
        # Get participant data
        participant_data = {
            "id": participant.id,
            "name": f"{participant.first_name} {participant.last_name}",
            "date_of_birth": participant.date_of_birth.isoformat() if hasattr(participant, 'date_of_birth') and participant.date_of_birth else None,
            "ndis_number": getattr(participant, 'ndis_number', 'Not provided'),
            "support_needs": getattr(participant, 'support_needs', 'Not specified'),
            "communication_preferences": getattr(participant, 'communication_preferences', {}),
        }
        
        # Get relevant document context using RAG
        rag_service = RAGService()
        query = f"care plan goals supports for {participant.first_name} {participant.last_name}"
        
        document_context, sources = rag_service.get_context_for_ai(
            db=db,
            participant_id=participant_id,
            query=query,
            max_context_length=1500
        )
        
        # Enhanced prompt with document context
        if document_context:
            enhanced_prompt = f"""You are an NDIS support planner with access to participant documents.

PARTICIPANT INFORMATION:
{participant_data}

RELEVANT DOCUMENT EXCERPTS:
{document_context}

Based on the participant information and document excerpts above, create a concise markdown **Care Plan** with:
- 3 specific, achievable goals (based on documents if available)
- 3 recommended supports with NDIS category hints
- 2 measurable SMART outcomes
- Notes (<=80 words, referencing document insights where relevant)

Keep language neutral and person-centered. No medical advice."""
        else:
            # Fallback to original prompt if no documents
            enhanced_prompt = f"""You are an NDIS support planner.
Return a concise markdown **Care Plan** with:
- 3 goals
- 3 recommended supports (include category hints if obvious)
- 2 measurable outcomes (SMART style)
- Notes (<=80 words, human-readable)
Keep neutral language. No medical advice.

Participant (YAML-like):
{participant_data}
"""
        
        # Generate AI care plan
        care_plan_markdown = ai._gen(enhanced_prompt)
        
        # Validate response
        if not care_plan_markdown or len(care_plan_markdown.strip()) < 10:
            raise HTTPException(
                status_code=500, 
                detail="AI service returned insufficient response"
            )
        
        suggestion_data = AISuggestionCreate(
            subject_id=participant_id,
            suggestion_type="care_plan",
            payload={
                "markdown": care_plan_markdown,
                "used_document_context": bool(document_context),
                "sources_used": len(sources)
            },
            raw_text=care_plan_markdown,
            provider="watsonx",
            model=ai.cfg.model_id,
            confidence="high" if document_context else "medium",
            created_by="api"
        )
        
        saved_suggestion = save_suggestion(db, suggestion_data)
        
        logger.info(f"Generated care plan with {len(sources)} document sources for participant {participant_id}")
        
        return {
            "suggestion_id": saved_suggestion.id,
            "participant_id": participant_id,
            "suggestion_type": "care_plan",
            "content": care_plan_markdown,
            "provider": "watsonx",
            "model": ai.cfg.model_id,
            "created_at": saved_suggestion.created_at.isoformat(),
            "document_context_used": bool(document_context),
            "sources": [
                {
                    "document_id": source["document_id"],
                    "chunk_id": source["chunk_id"],
                    "similarity_score": source["similarity_score"],
                    "document_title": source["metadata"].get("document_title", "Unknown")
                }
                for source in sources
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating care plan with context: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate care plan: {str(e)}")


@router.post("/ask")
def ask_ai_about_participant(
    participant_id: int,
    request: AskRequest,
    db: Session = Depends(get_db)
):
    """Ask AI a question about participant using RAG context"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        question = request.question
        if not question or len(question.strip()) < 5:
            raise HTTPException(status_code=400, detail="Question too short")
        
        ai = get_ai_provider()
        
        # Get relevant context
        rag_service = RAGService()
        document_context, sources = rag_service.get_context_for_ai(
            db=db,
            participant_id=participant_id,
            query=question,
            max_context_length=2000
        )
        
        # Build prompt
        if document_context:
            prompt = f"""You are an NDIS care assistant with access to participant documents.

PARTICIPANT: {participant.first_name} {participant.last_name}

RELEVANT DOCUMENT EXCERPTS:
{document_context}

USER QUESTION: {question}

Please answer the question based on the document excerpts above. If the documents don't contain enough information, say so clearly."""
        else:
            prompt = f"""You are an NDIS care assistant.

PARTICIPANT: {participant.first_name} {participant.last_name}

USER QUESTION: {question}

Note: No participant documents are available. Please provide a general answer based on NDIS best practices."""
        
        # Get AI response
        response = ai._gen(prompt)
        
        if not response:
            raise HTTPException(status_code=500, detail="AI returned no response")
        
        return {
            "participant_id": participant_id,
            "question": question,
            "answer": response,
            "document_context_used": bool(document_context),
            "sources_count": len(sources),
            "sources": [
                {
                    "document_id": source["document_id"],
                    "similarity_score": source["similarity_score"],
                    "document_title": source["metadata"].get("document_title", "Unknown")
                }
                for source in sources
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error answering question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        
        # Validate AI response before saving
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
    request: ClinicalNoteRequest,
    db: Session = Depends(get_db)
):
    """Generate AI-powered clinical/SOAP note from interaction summary"""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Validate interaction summary
        interaction_summary = request.interactionSummary
        if not interaction_summary or len(interaction_summary.strip()) < 10:
            raise HTTPException(
                status_code=400, 
                detail="Interaction summary must be at least 10 characters long"
            )
        
        ai = get_ai_provider()
        
        # Generate SOAP note
        soap_note = ai.soap_note(interaction_summary)
        
        # Validate AI response before saving
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