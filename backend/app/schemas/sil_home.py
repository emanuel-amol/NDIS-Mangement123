# backend/app/schemas/sil_home.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

class PropertyType(str, Enum):
    APARTMENT = "apartment"
    DUPLEX = "duplex"
    HOUSE = "house"
    UNIT = "unit"

class SDAType(str, Enum):
    FULLY_ACCESSIBLE = "fully_accessible"
    HIGH_PHYSICAL_SUPPORT = "high_physical_support"
    IMPROVED_LIVABILITY = "improved_livability"
    ROBUST_CONSTRUCTION = "robust_construction"

class SILHomeCreate(BaseModel):
    name: str
    address: str
    state: str
    postal_code: str
    property_type: PropertyType
    sda_type: SDAType
    total_rooms: int
    bathrooms: int
    kitchens: int
    parking_spaces: int
    shared_spaces: List[str]
    property_features: List[str]

class SILHomeResponse(BaseModel):
    id: str
    name: str
    address: str
    state: str
    postal_code: str
    property_type: PropertyType
    sda_type: SDAType
    total_rooms: int
    bathrooms: int
    kitchens: int
    parking_spaces: int
    shared_spaces: List[str]
    property_features: List[str]
    status: str  # available, not_available
    created_at: datetime
    updated_at: datetime

class RoomCreate(BaseModel):
    home_id: str
    room_number: str
    bed_type: str
    bed_height: Optional[str] = None
    room_cupboard: bool = False
    room_tv: bool = False
    door_width: Optional[float] = None
    rent_amount: Optional[float] = None
    rent_frequency: Optional[str] = None
    has_ensuite: bool = False
    description: Optional[str] = None

class RoomResponse(BaseModel):
    id: str
    home_id: str
    room_number: str
    bed_type: str
    bed_height: Optional[str]
    room_cupboard: bool
    room_tv: bool
    door_width: Optional[float]
    rent_amount: Optional[float]
    rent_frequency: Optional[str]
    has_ensuite: bool
    description: Optional[str]
    participant_id: Optional[str]
    occupied: bool
    created_at: datetime
    updated_at: datetime