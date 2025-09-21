# backend/app/models/quotation.py
from __future__ import annotations

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, JSON, Enum, func, Text
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class QuotationStatus(str, enum.Enum):
    draft = "draft"
    final = "final"
    cancelled = "cancelled"


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)

    title = Column(String(255), nullable=False, default="Quotation")
    notes = Column(Text, nullable=True)
    status = Column(Enum(QuotationStatus), nullable=False, default=QuotationStatus.draft)

    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # relationships
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")
    participant = relationship("Participant", lazy="joined")


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)

    service_code = Column(String(64), nullable=False)
    description = Column(Text, nullable=False)

    quantity = Column(Numeric(12, 2), nullable=False, default=1)
    unit = Column(String(32), nullable=False, default="hour")
    rate = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)

    meta = Column(JSON, nullable=True)

    quotation = relationship("Quotation", back_populates="items")
