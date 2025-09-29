# backend/app/api/v1/endpoints/participant_ai.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
import json

from app.core.database import get_db
from app.services.ai_suggestion_service import save_suggestion
from app.schemas.ai import AISuggestionCreate
from app.models.document import Document
from ai.watsonx_provider import WatsonxLLM, WatsonX
from ai.document_ingest import extract_text

router = APIRouter(prefix="/participants/{participant_id}/ai", tags=["participant-ai"])

def _safe_json(text: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    """Safely parse JSON text with a fallback structure."""
    try:
        return json.loads(text)
    except Exception:
        return {**fallback, "raw": text}


@router.post("/care-plan/suggest")
def care_plan_suggest(
    participant_id: int,
    body: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Generate AI care plan suggestions.
    
    Body may contain:
      - participantContext: dict (minimised participant info)
      - carePlanDraft: dict (optional)
    """
    wx = WatsonxLLM()
    ctx = body.get("participantContext") or {}
    ctx.setdefault("id", participant_id)
    text = wx.care_plan_markdown(ctx)

    payload = _safe_json(text, {"markdown": text})
    saved = save_suggestion(db, AISuggestionCreate(
        subject_id=participant_id,
        suggestion_type="care_plan",
        payload=payload,
        raw_text=text,
        provider="watsonx",
        model=None,
        created_by="api",
    ))
    return {"ok": True, "suggestion_id": saved.id, "data": payload}


@router.post("/risk/assess")
def risk_assess(
    participant_id: int,
    body: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Assess participant risk based on case notes.
    
    Body:
      - notes: List[str] (recent case notes or key bullet points)
    """
    wx = WatsonxLLM()
    notes: List[str] = body.get("notes") or []
    text = wx.risk_summary(notes)
    payload = _safe_json(text, {"summary": text})

    saved = save_suggestion(db, AISuggestionCreate(
        subject_id=participant_id,
        suggestion_type="risk",
        payload=payload,
        raw_text=text,
        provider="watsonx",
        model=None,
        created_by="api",
    ))
    return {"ok": True, "suggestion_id": saved.id, "data": payload}


@router.post("/notes/clinical")
def notes_clinical(
    participant_id: int,
    body: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Generate clinical notes in SOAP format.
    
    Body:
      - interactionSummary: str (free text summary of the interaction)
    """
    wx = WatsonxLLM()
    summary: Optional[str] = body.get("interactionSummary")
    if not summary or not summary.strip():
        raise HTTPException(400, detail="interactionSummary is required")

    text = wx.soap_note(summary)
    payload = _safe_json(text, {"markdown": text})

    saved = save_suggestion(db, AISuggestionCreate(
        subject_id=participant_id,
        suggestion_type="note",
        payload=payload,
        raw_text=text,
        provider="watsonx",
        model=None,
        created_by="api",
    ))
    return {"ok": True, "suggestion_id": saved.id, "data": payload}


@router.post("/documents/{doc_id}/summary")
def summarize_document(
    participant_id: int,
    doc_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate AI summary of a participant document.
    
    Extracts text from the document and generates a progress note summary.
    """
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.participant_id == participant_id
    ).first()
    
    if not doc or not doc.storage_key:
        raise HTTPException(status_code=404, detail="document not found")
    
    text = extract_text(doc)[:15000]
    wx = WatsonX()
    
    return {"summary": wx.progress_note(text)}