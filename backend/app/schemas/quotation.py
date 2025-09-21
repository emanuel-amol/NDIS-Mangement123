# backend/app/schemas/quotation.py - CLEAN VERSION WITH NO CIRCULAR IMPORTS

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

class QuotationStatus(str, Enum):
    draft = "draft"
    final = "final"
    expired = "expired"
    cancelled = "cancelled"

class QuotationItemCreate(BaseModel):
    service_code: str = Field(..., description="NDIS service code")
    label: str = Field(..., description="Service description") 
    unit: str = Field(..., description="Unit of measurement (hour, session, etc.)")
    quantity: float = Field(..., gt=0, description="Quantity of service")
    rate: float = Field(..., gt=0, description="Rate per unit")
    line_total: float = Field(..., gt=0, description="Total price for this item")
    meta: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    @validator('line_total')
    def validate_line_total(cls, v, values):
        if 'quantity' in values and 'rate' in values:
            expected_total = values['quantity'] * values['rate']
            if abs(v - expected_total) > 0.01:
                raise ValueError(f"Line total {v} doesn't match quantity × rate")
        return v

class QuotationItemResponse(BaseModel):
    id: int
    quotation_id: int
    service_code: str
    label: str
    unit: str
    quantity: float
    rate: float
    line_total: float
    meta: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True

class QuotationCreate(BaseModel):
    participant_id: int = Field(..., description="Participant ID")
    quote_number: Optional[str] = Field(None, description="Quote number (auto-generated if not provided)")
    version: int = Field(1, description="Quote version")
    status: QuotationStatus = Field(QuotationStatus.draft, description="Quotation status")
    currency: str = Field("AUD", description="Currency code")
    subtotal: float = Field(..., gt=0, description="Subtotal amount")
    tax_total: float = Field(0, ge=0, description="Tax total")
    grand_total: float = Field(..., gt=0, description="Grand total amount")
    valid_from: Optional[date] = Field(None, description="Valid from date")
    valid_to: Optional[date] = Field(None, description="Valid until date")
    pricing_snapshot: Optional[Dict[str, Any]] = None
    care_plan_snapshot: Optional[Dict[str, Any]] = None
    items: List[QuotationItemCreate] = Field(..., description="Quotation items")

class QuotationResponse(BaseModel):
    id: int
    participant_id: int
    quote_number: str
    version: int
    status: QuotationStatus
    currency: str
    subtotal: float
    tax_total: float
    grand_total: float
    valid_from: Optional[date]
    valid_to: Optional[date]
    finalised_at: Optional[datetime]
    finalised_by: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: List[QuotationItemResponse] = []

    class Config:
        from_attributes = True

class QuotationUpdate(BaseModel):
    quote_number: Optional[str] = None
    status: Optional[QuotationStatus] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    subtotal: Optional[float] = Field(None, gt=0)
    tax_total: Optional[float] = Field(None, ge=0)
    grand_total: Optional[float] = Field(None, gt=0)
    pricing_snapshot: Optional[Dict[str, Any]] = None
    care_plan_snapshot: Optional[Dict[str, Any]] = None