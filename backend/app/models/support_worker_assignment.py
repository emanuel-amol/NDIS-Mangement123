from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class SupportWorkerAssignment(Base):
    __tablename__ = "support_worker_assignments"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False, index=True)
    support_worker_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    support_worker_name = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="primary")
    hours_per_week = Column(Integer, nullable=False, default=0)
    services = Column(JSON, nullable=True)
    start_date = Column(Date, nullable=True)
    participant_needs = Column(JSON, nullable=True)
    notes = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    participant = relationship("Participant", backref="support_worker_assignments")
    support_worker = relationship("User")
