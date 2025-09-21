# backend/app/models/quotation.py - COMPLETE IMPLEMENTATION
from __future__ import annotations
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Numeric, Enum, JSON, func, Date
)
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class QuotationStatus(str, enum.Enum):
    draft = "draft"
    final = "final"


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)

    quote_number = Column(String(64), unique=True, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    status = Column(Enum(QuotationStatus), nullable=False, default=QuotationStatus.draft)

    currency = Column(String(8), nullable=False, default="AUD")
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_total = Column(Numeric(12, 2), nullable=False, default=0)
    grand_total = Column(Numeric(12, 2), nullable=False, default=0)

    pricing_snapshot = Column(JSON, nullable=True)
    care_plan_snapshot = Column(JSON, nullable=True)

    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)

    finalised_at = Column(DateTime(timezone=True), nullable=True)
    finalised_by = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")
    participant = relationship("Participant", back_populates="quotations")


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)

    service_code = Column(String(64), nullable=False)   # e.g. 01_011_0107_1_1
    label        = Column(String(255), nullable=False)  # human label
    unit         = Column(String(32), nullable=False)   # hour, session, etc.
    quantity     = Column(Numeric(12, 2), nullable=False, default=0)
    rate         = Column(Numeric(12, 2), nullable=False, default=0)
    line_total   = Column(Numeric(12, 2), nullable=False, default=0)

    meta         = Column(JSON, nullable=True)

    quotation = relationship("Quotation", back_populates="items")