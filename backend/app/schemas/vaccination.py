from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class VaccinationBase(BaseModel):
    vaccine_name: str = Field(..., description="Common name e.g. COVID-19, Influenza")
    date_administered: date
    brand: Optional[str] = Field(None, description="Optional vaccine brand e.g. Pfizer")
    dose_number: Optional[str] = Field(None, description="Dose number or label e.g. 1, 2, booster")
    lot_number: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None


class VaccinationCreate(VaccinationBase):
    pass


class VaccinationUpdate(BaseModel):
    vaccine_name: Optional[str] = None
    date_administered: Optional[date] = None
    brand: Optional[str] = None
    dose_number: Optional[str] = None
    lot_number: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None


class VaccinationOut(BaseModel):
    id: int
    participant_id: int
    vaccine_name: str
    brand: Optional[str] = None
    dose_number: Optional[str] = None
    date_administered: date
    lot_number: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

