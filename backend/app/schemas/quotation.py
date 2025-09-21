# backend/app/schemas/quotation.py - COMPLETE IMPLEMENTATION
from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date
from enum import Enum


class QuotationStatus(str, Enum):
    draft = "draft"
    final = "final"


class QuotationItemBase(BaseModel):
    service_code: str
    label: str
    unit: str
    quantity: float
    rate: float
    line_total: float
    meta: Optional[dict] = None


class QuotationItemCreate(QuotationItemBase):
    pass


class QuotationItemResponse(QuotationItemBase):
    id: int

    class Config:
        from_attributes = True


class QuotationBase(BaseModel):
    participant_id: int
    currency: str = "AUD"
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class QuotationCreate(QuotationBase):
    items: List[QuotationItemCreate] = []
    pricing_snapshot: Optional[dict] = None
    care_plan_snapshot: Optional[dict] = None


class QuotationResponse(QuotationBase):
    id: int
    quote_number: str
    version: int
    status: QuotationStatus
    subtotal: float
    tax_total: float
    grand_total: float
    pricing_snapshot: Optional[dict] = None
    care_plan_snapshot: Optional[dict] = None
    finalised_at: Optional[datetime] = None
    finalised_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[QuotationItemResponse] = []

    class Config:
        from_attributes = True