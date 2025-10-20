# backend/app/schemas/ai.py - COMPLETE VERSION
from pydantic import BaseModel, Field
from typing import Any, List, Optional, Dict
from datetime import datetime

class AISuggestionCreate(BaseModel):
    subject_id: int
    suggestion_type: str = Field(..., description="Type: care_plan, risk, note")
    payload: Dict[str, Any]
    raw_text: str
    provider: str = "watsonx"
    model: str
    confidence: str = "medium"
    created_by: Optional[str] = "api"

class AISuggestionResponse(BaseModel):
    id: int
    subject_type: str
    subject_id: int
    suggestion_type: str
    payload: Dict[str, Any]
    raw_text: str
    provider: str
    model: str
    confidence: str
    created_by: str
    created_at: datetime
    applied: bool
    applied_by: Optional[str]
    applied_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class CarePlanSupport(BaseModel):
    type: str
    frequency: Optional[str] = None
    duration: Optional[str] = None
    staff_ratio: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    citations: List[int] = []  # ai_chunk ids

class CarePlanDraft(BaseModel):
    goals: List[str]
    supports: List[CarePlanSupport]

class RiskItem(BaseModel):
    factor: str
    likelihood: str
    impact: str
    mitigation: str
    monitor: Optional[str] = None
    citations: List[int] = []

class RiskDraft(BaseModel):
    risks: List[RiskItem]

class AIDraftResponse(BaseModel):
    participant_id: int
    careplan: Optional[CarePlanDraft] = None
    risk: Optional[RiskDraft] = None
    source_ids: List[int] = []

class CarePlanSuggestionRequest(BaseModel):
    participant_id: int
    include_goals: bool = True
    include_supports: bool = True
    include_outcomes: bool = True

class RiskAssessmentRequest(BaseModel):
    participant_id: int
    notes: list[str] = Field(default_factory=list)
    include_mitigations: bool = True

class ClinicalNoteRequest(BaseModel):
    participant_id: int
    interaction_summary: str = Field(..., min_length=10, max_length=5000)
    note_type: str = "SOAP"