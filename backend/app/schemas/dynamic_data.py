# backend/app/schemas/dynamic_data.py
from __future__ import annotations

from datetime import datetime
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, ConfigDict

# DataType Schemas
class DataTypeBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    is_active: bool = True

class DataTypeCreate(DataTypeBase):
    pass

class DataTypeUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DataTypeResponse(DataTypeBase):
    id: str
    created_at: datetime
    updated_at: datetime
    data_points_count: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

# DataPoint Schemas
class DataPointBase(BaseModel):
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    extra_data: Optional[Dict[str, Any]] = None  # renamed from metadata

class DataPointCreate(DataPointBase):
    data_type_id: str

class DataPointUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    extra_data: Optional[Dict[str, Any]] = None  # renamed from metadata

class DataPointResponse(DataPointBase):
    id: str
    data_type_id: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Combined response
class DataTypeWithPointsResponse(DataTypeResponse):
    data_points: List[DataPointResponse] = []

# Bulk operations
class BulkDataPointCreate(BaseModel):
    data_type_id: str
    data_points: List[DataPointBase]

class BulkDataPointResponse(BaseModel):
    created_count: int
    data_points: List[DataPointResponse]