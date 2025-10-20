# backend/app/models/roster.py
from sqlalchemy import (
    Column, Integer, String, Text, Date, Time, DateTime, Boolean, ForeignKey, Numeric, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class RosterStatus(str, enum.Enum):
    checked = "checked"
    confirmed = "confirmed"
    notified = "notified"
    cancelled = "cancelled"
    completed = "completed"

class Roster(Base):
    __tablename__ = "rosters"

    id = Column(Integer, primary_key=True, index=True)
    # Core associations
    service_org_id = Column(Integer, nullable=True)
    service_id = Column(Integer, nullable=True)
    vehicle_id = Column(Integer, nullable=True)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # When and what
    support_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Commercials / SRS fields
    quantity = Column(Numeric(10,2), nullable=True)
    ratio_worker_to_participant = Column(Numeric(5,2), nullable=True)
    eligibility = Column(String(255), nullable=True)
    transport_km = Column(Numeric(10,2), nullable=True)
    transport_worker_expenses = Column(Numeric(10,2), nullable=True)
    transport_non_labour = Column(Numeric(10,2), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(Enum(RosterStatus), nullable=False, default=RosterStatus.checked)
    is_group_support = Column(Boolean, default=False)

    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relations
    participants = relationship("RosterParticipant", back_populates="roster", cascade="all, delete-orphan")
    tasks = relationship("RosterTask", back_populates="roster", cascade="all, delete-orphan")
    worker_notes = relationship("RosterWorkerNote", back_populates="roster", cascade="all, delete-orphan")
    recurrences = relationship("RosterRecurrence", back_populates="roster", cascade="all, delete-orphan")
    instances = relationship("RosterInstance", back_populates="roster", cascade="all, delete-orphan")
    status_history = relationship("RosterStatusHistory", back_populates="roster", cascade="all, delete-orphan")

class RosterParticipant(Base):
    __tablename__ = "roster_participants"
    id = Column(Integer, primary_key=True)
    roster_id = Column(Integer, ForeignKey("rosters.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)

    roster = relationship("Roster", back_populates="participants")

    __table_args__ = (UniqueConstraint("roster_id", "participant_id", name="uq_roster_participant"),)

class RosterTask(Base):
    __tablename__ = "roster_tasks"
    id = Column(Integer, primary_key=True)
    roster_id = Column(Integer, ForeignKey("rosters.id"), nullable=False)
    title = Column(String(255), nullable=False)
    is_done = Column(Boolean, default=False)

    roster = relationship("Roster", back_populates="tasks")

class RosterWorkerNote(Base):
    __tablename__ = "roster_worker_notes"
    id = Column(Integer, primary_key=True)
    roster_id = Column(Integer, ForeignKey("rosters.id"), nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    roster = relationship("Roster", back_populates="worker_notes")

class RecurrenceType(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"

class RosterRecurrence(Base):
    __tablename__ = "roster_recurrences"
    id = Column(Integer, primary_key=True)
    roster_id = Column(Integer, ForeignKey("rosters.id"), nullable=False)
    pattern_type = Column(Enum(RecurrenceType), nullable=False)
    interval = Column(Integer, default=1)       # every N days/weeks/months
    # weekly: 0=Mon..6=Sun
    by_weekdays = Column(String(20), nullable=True)  # CSV like "0,2,4"
    # monthly options
    by_monthday = Column(Integer, nullable=True)     # e.g., 15th
    by_setpos = Column(Integer, nullable=True)       # e.g., 2 (second)
    by_weekday = Column(Integer, nullable=True)      # 0..6
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    roster = relationship("Roster", back_populates="recurrences")

class RosterInstance(Base):
    __tablename__ = "roster_instances"
    id = Column(Integer, primary_key=True)
    roster_id = Column(Integer, ForeignKey("rosters.id"), nullable=False)
    occurrence_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    roster = relationship("Roster", back_populates="instances")

class RosterStatusHistory(Base):
    __tablename__ = "roster_status_history"
    
    id = Column(Integer, primary_key=True)
    roster_id = Column(Integer, ForeignKey("rosters.id"), nullable=False)
    from_status = Column(String(32), nullable=True)
    to_status = Column(String(32), nullable=False)
    changed_at = Column(DateTime, server_default=func.now())
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)

    roster = relationship("Roster", back_populates="status_history")