from datetime import date, datetime
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field


class AssignmentBase(BaseModel):
    support_worker_id: int = Field(..., gt=0)
    support_worker_name: Optional[str]
    role: str = Field(default="primary")
    hours_per_week: int = Field(default=0, ge=0)
    services: Optional[List[str]] = None
    start_date: Optional[date] = None
    notes: Optional[str] = None


class SupportWorkerAssignmentCreate(AssignmentBase):
    pass


class SupportWorkerAssignmentRead(AssignmentBase):
    id: int
    participant_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class SupportWorkerAssignmentRequest(BaseModel):
    assignments: List[SupportWorkerAssignmentCreate] = Field(default_factory=list)
    participant_needs: Optional[Dict[str, Any]] = None


class SupportWorkerAssignmentResponse(BaseModel):
    message: str
    participant_id: int
    assignments_created: int


class SupportWorkerAssignmentListResponse(BaseModel):
    participant_id: int
    assignments: List[SupportWorkerAssignmentRead]

