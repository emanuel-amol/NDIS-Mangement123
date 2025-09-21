from __future__ import annotations
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Numeric, Enum, JSON, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base  # TODO: ensure this is your declarative Base
import enum


class QuotationStatus(str, enum.Enum):
    draft = "draft"
    final = "final"


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, index=True, nullable=False)
    care_plan_id = Column(Integer, index=True, nullable=True)

    quote_number = Column(String(50), unique=True, index=True, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    status = Column(Enum(QuotationStatus), nullable=False, default=QuotationStatus.draft)

    currency = Column(String(8), nullable=False, default="AUD")
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_total = Column(Numeric(12, 2), nullable=False, default=0)
    grand_total = Column(Numeric(12, 2), nullable=False, default=0)

    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_to   = Column(DateTime(timezone=True), nullable=True)

    pricing_snapshot = Column(JSON, nullable=True)  # snapshot of pricing_items used
    care_plan_snapshot = Column(JSON, nullable=True)  # snapshot of supports used

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)

    # resolution fields
    service_code = Column(String(64), nullable=False)     # NDIS support item code (e.g. 01_011_0107_1_1)
    label        = Column(String(255), nullable=False)    # human label (e.g. "Domestic Assistance")
    unit         = Column(String(32), nullable=False)     # "hour", "session", etc.
    quantity     = Column(Numeric(12, 2), nullable=False, default=0)
    rate         = Column(Numeric(12, 2), nullable=False, default=0)
    line_total   = Column(Numeric(12, 2), nullable=False, default=0)

    meta         = Column(JSON, nullable=True)  # any extra information (e.g., region, day, notes)

    quotation = relationship("Quotation", back_populates="items")
