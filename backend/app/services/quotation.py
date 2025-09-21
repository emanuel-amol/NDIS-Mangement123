# backend/app/schemas/quotation.py - COMPLETE QUOTATION SCHEMAS

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from enum import Enum

class QuotationStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

class QuotationItemCreate(BaseModel):
    service_code: str = Field(..., description="NDIS service code")
    description: str = Field(..., description="Service description")
    quantity: float = Field(..., gt=0, description="Quantity of service")
    unit: str = Field(..., description="Unit of measurement (hour, km, etc.)")
    unit_price: float = Field(..., gt=0, description="Price per unit")
    total_price: float = Field(..., gt=0, description="Total price for this item")
    category: str = Field(..., description="Service category")
    provider: Optional[str] = Field(None, description="Service provider")
    notes: Optional[str] = Field(None, description="Additional notes")
    meta: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    @validator('total_price')
    def validate_total_price(cls, v, values):
        if 'quantity' in values and 'unit_price' in values:
            expected_total = values['quantity'] * values['unit_price']
            if abs(v - expected_total) > 0.01:  # Allow for small rounding differences
                raise ValueError(f"Total price {v} doesn't match quantity {values['quantity']} × unit_price {values['unit_price']} = {expected_total}")
        return v

class QuotationItemUpdate(BaseModel):
    service_code: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = None
    unit_price: Optional[float] = Field(None, gt=0)
    total_price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

class QuotationItemResponse(BaseModel):
    id: int
    quotation_id: int
    service_code: str
    description: str
    quantity: float
    unit: str
    unit_price: float
    total_price: float
    category: str
    provider: Optional[str]
    notes: Optional[str]
    meta: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class QuotationCreate(BaseModel):
    participant_id: int = Field(..., description="Participant ID")
    quotation_number: Optional[str] = Field(None, description="Quotation number (auto-generated if not provided)")
    status: QuotationStatus = Field(QuotationStatus.DRAFT, description="Quotation status")
    valid_from: date = Field(..., description="Valid from date")
    valid_until: date = Field(..., description="Valid until date")
    total_amount: float = Field(..., gt=0, description="Total quotation amount")
    notes: Optional[str] = Field(None, description="Quotation notes")
    meta: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    items: List[QuotationItemCreate] = Field(..., description="Quotation items")

    @validator('valid_until')
    def validate_dates(cls, v, values):
        if 'valid_from' in values and v <= values['valid_from']:
            raise ValueError("Valid until date must be after valid from date")
        return v

    @validator('total_amount')
    def validate_total_amount(cls, v, values):
        if 'items' in values:
            expected_total = sum(item.total_price for item in values['items'])
            if abs(v - expected_total) > 0.01:  # Allow for small rounding differences
                raise ValueError(f"Total amount {v} doesn't match sum of item totals {expected_total}")
        return v

class QuotationUpdate(BaseModel):
    quotation_number: Optional[str] = None
    status: Optional[QuotationStatus] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    total_amount: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

    @validator('valid_until')
    def validate_dates(cls, v, values):
        if v and 'valid_from' in values and values['valid_from'] and v <= values['valid_from']:
            raise ValueError("Valid until date must be after valid from date")
        return v

class QuotationResponse(BaseModel):
    id: int
    participant_id: int
    quotation_number: str
    status: QuotationStatus
    valid_from: date
    valid_until: date
    total_amount: float
    notes: Optional[str]
    meta: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    items: List[QuotationItemResponse] = []

    class Config:
        from_attributes = True

class QuotationSummary(BaseModel):
    """Summary response for listing quotations"""
    id: int
    participant_id: int
    quotation_number: str
    status: QuotationStatus
    valid_from: date
    valid_until: date
    total_amount: float
    item_count: int
    created_at: datetime

    class Config:
        from_attributes = True

# Generation-specific schemas
class SupportItemInput(BaseModel):
    """Support item from care plan for quotation generation"""
    type: str = Field(..., description="Support type code")
    frequency: str = Field(..., description="Frequency code")
    duration: str = Field(..., description="Duration code")
    location: str = Field(..., description="Location code")
    staffRatio: str = Field(..., description="Staff ratio code")
    notes: Optional[str] = Field("", description="Additional notes")
    provider: Optional[str] = Field("", description="Preferred provider")

class QuotationGenerationRequest(BaseModel):
    """Request to generate quotation from care plan"""
    participant_id: int = Field(..., description="Participant ID")
    care_plan_id: Optional[int] = Field(None, description="Specific care plan ID (uses active if not provided)")
    save_to_database: bool = Field(True, description="Whether to save generated quotation to database")
    notes: Optional[str] = Field(None, description="Additional notes for the quotation")

class QuotationGenerationResponse(BaseModel):
    """Response from quotation generation"""
    success: bool
    quotation_data: Optional[Dict[str, Any]] = None
    quotation_id: Optional[int] = None
    errors: List[str] = []
    warnings: List[str] = []
    summary: Optional[Dict[str, Any]] = None

class QuotationItemConversionResult(BaseModel):
    """Result of converting a support item to quotation item"""
    success: bool
    support_item: Dict[str, Any]
    quotation_item: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    calculation_details: Optional[Dict[str, Any]] = None

# Status update schemas
class QuotationStatusUpdate(BaseModel):
    status: QuotationStatus
    notes: Optional[str] = Field(None, description="Reason for status change")

# Validation schemas
class QuotationValidationResult(BaseModel):
    """Result of quotation validation"""
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    total_amount_calculated: Optional[float] = None
    total_amount_provided: Optional[float] = None

# Filter schemas for listing
class QuotationFilters(BaseModel):
    """Filters for listing quotations"""
    participant_id: Optional[int] = None
    status: Optional[QuotationStatus] = None
    valid_from_start: Optional[date] = None
    valid_from_end: Optional[date] = None
    valid_until_start: Optional[date] = None
    valid_until_end: Optional[date] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    min_amount: Optional[float] = Field(None, ge=0)
    max_amount: Optional[float] = Field(None, ge=0)
    search_term: Optional[str] = Field(None, description="Search in quotation number, notes, or item descriptions")

    @validator('max_amount')
    def validate_amount_range(cls, v, values):
        if v and 'min_amount' in values and values['min_amount'] and v < values['min_amount']:
            raise ValueError("Max amount must be greater than min amount")
        return v

# Export schemas for reports
class QuotationExportItem(BaseModel):
    """Quotation item for export"""
    service_code: str
    description: str
    quantity: float
    unit: str
    unit_price: float
    total_price: float
    category: str

class QuotationExport(BaseModel):
    """Quotation data for export/reporting"""
    quotation_number: str
    participant_name: str
    participant_ndis_number: Optional[str]
    status: str
    valid_from: date
    valid_until: date
    total_amount: float
    item_count: int
    created_date: date
    items: List[QuotationExportItem]