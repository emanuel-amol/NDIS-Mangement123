# backend/app/schemas/dynamic_data.py
from typing import Any, Optional
from pydantic import BaseModel, Field

class DynamicDataBase(BaseModel):
    type: str = Field(..., examples=["contact_methods", "disabilities", "pricing_items"])
    code: str = Field(..., examples=["PHONE", "AUTISM", "SVC_001"])
    label: str = Field(..., examples=["Phone", "Autism Spectrum Disorder", "Domestic Assistance"])
    is_active: bool = True
    meta: Optional[dict[str, Any]] = None

class DynamicDataCreate(DynamicDataBase):
    pass

class DynamicDataUpdate(BaseModel):
    code: Optional[str] = None
    label: Optional[str] = None
    is_active: Optional[bool] = None
    meta: Optional[dict] = None

class DynamicDataOut(DynamicDataBase):
    id: int

    class Config:
        from_attributes = True
