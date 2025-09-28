# backend/app/api/v1/endpoints/participant_ai.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
import json

from app.core.database import get_db
from app.services.ai_suggestion_service import save_suggestion
from app.schemas.ai import AISuggestionCreate
from ai.watsonx_provider import WatsonxLLM

router = APIRouter(prefix="/participants/{participant_id}/ai", tags=["participant-ai"])

def _safe_json(text: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except Exception:
        return {**fallback, "raw": text}

@router.post("/care-plan/suggest")
def care_plan_suggest(participant_id: int,
                      body: Dict[str, Any],
                      db: Session = Depends(get_db)):
    """
    body may contain:
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
def risk_assess(participant_id: int,
                body: Dict[str, Any],
                db: Session = Depends(get_db)):
    """
    body:
      - notes: List[str]  (recent case notes or key bullet points)
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
def notes_clinical(participant_id: int,
                   body: Dict[str, Any],
                   db: Session = Depends(get_db)):
    """
    body:
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