# backend/app/schemas/ai.py
from pydantic import BaseModel, Field
from typing import Any, Optional

class AISuggestionCreate(BaseModel):
    subject_id: int
    suggestion_type: str = Field(pattern="^(care_plan|risk|note)$")
    payload: Any
    raw_text: Optional[str] = None
    provider: Optional[str] = "watsonx"
    model: Optional[str] = None
    confidence: Optional[str] = None
    created_by: Optional[str] = "api"

class AISuggestionResponse(BaseModel):
    id: int
    subject_type: str
    subject_id: int
    suggestion_type: str
    payload: Any
    provider: Optional[str] = None
    model: Optional[str] = None
    applied: bool

    class Config:
        from_attributes = True
