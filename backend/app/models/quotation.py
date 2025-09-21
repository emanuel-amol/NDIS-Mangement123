# backend/app/models/quotation.py
from __future__ import annotations

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, JSON, func, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    care_plan_id = Column(Integer, ForeignKey("care_plans.id"), nullable=True)
    quote_number = Column(String(50), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default="draft")
    currency = Column(String(8), nullable=False, default="AUD")
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_total = Column(Numeric(12, 2), nullable=False, default=0)
    grand_total = Column(Numeric(12, 2), nullable=False, default=0)
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_to = Column(DateTime(timezone=True), nullable=True)
    pricing_snapshot = Column(JSON, nullable=True)
    care_plan_snapshot = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    finalised_at = Column(DateTime(timezone=True), nullable=True)
    finalised_by = Column(String(255), nullable=True)

    # relationships
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")
    participant = relationship("Participant", lazy="joined")


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    service_code = Column(String(64), nullable=False)
    label = Column(String(255), nullable=False)  # Note: it's 'label' not 'description'
    unit = Column(String(32), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False, default=1)
    rate = Column(Numeric(12, 2), nullable=False, default=0)
    line_total = Column(Numeric(12, 2), nullable=False, default=0)  # Note: it's 'line_total' not 'total'
    meta = Column(JSON, nullable=True)

    quotation = relationship("Quotation", back_populates="items")