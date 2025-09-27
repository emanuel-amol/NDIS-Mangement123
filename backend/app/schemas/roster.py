# backend/app/schemas/roster.py
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import date, time
from enum import Enum

class RosterStatus(str, Enum):
    checked = "checked"
    confirmed = "confirmed"
    notified = "notified"
    cancelled = "cancelled"

class RosterTaskIn(BaseModel):
    title: str
    is_done: bool = False

class RosterWorkerNoteIn(BaseModel):
    note: str

class RosterParticipantIn(BaseModel):
    participant_id: int

class RecurrenceType(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"

class RosterRecurrenceIn(BaseModel):
    pattern_type: RecurrenceType
    interval: int = 1
    by_weekdays: Optional[List[int]] = None    # weekly
    by_monthday: Optional[int] = None          # monthly (15th)
    by_setpos: Optional[int] = None            # monthly (2nd monday)
    by_weekday: Optional[int] = None           # 0..6
    start_date: date
    end_date: date

class RosterBase(BaseModel):
    service_org_id: Optional[int] = None
    service_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    worker_id: Optional[int] = None

    support_date: date
    start_time: time
    end_time: time

    quantity: Optional[float] = None
    ratio_worker_to_participant: Optional[float] = None
    eligibility: Optional[str] = None
    transport_km: Optional[float] = None
    transport_worker_expenses: Optional[float] = None
    transport_non_labour: Optional[float] = None
    notes: Optional[str] = None
    status: RosterStatus = RosterStatus.checked
    is_group_support: bool = False

class RosterCreate(RosterBase):
    participants: List[RosterParticipantIn]
    tasks: Optional[List[RosterTaskIn]] = None
    worker_notes: Optional[List[RosterWorkerNoteIn]] = None
    recurrences: Optional[List[RosterRecurrenceIn]] = None

class RosterUpdate(RosterBase):
    pass

class RosterOut(RosterBase):
    id: int
    class Config:
        from_attributes = True
