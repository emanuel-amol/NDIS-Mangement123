from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# --- Domain constraints (server-side validation) ---
AU_STATES = [
    "Australian Capital Territory",
    "New South Wales",
    "Northern Territory",
    "Queensland",
    "South Australia",
    "Tasmania",
    "Victoria",
    "Western Australia",
]

PROPERTY_TYPES = {"Apartment", "Duplex", "House", "Unit"}
SDA_TYPES = {"Fully Accessible", "High Physical Support", "Improved Livability", "Robust Construction"}


def expected_state_from_postcode(pc: str) -> str:
    if not re.fullmatch(r"\d{4}", pc or ""):
        return ""
    n = int(pc)
    # ACT
    if (200 <= n <= 299) or (2600 <= n <= 2618) or (2900 <= n <= 2920):
        return "Australian Capital Territory"
    # NSW
    if (1000 <= n <= 1999) or (2000 <= n <= 2599) or (2619 <= n <= 2899) or (2921 <= n <= 2999):
        return "New South Wales"
    # VIC
    if (3000 <= n <= 3999) or (8000 <= n <= 8999):
        return "Victoria"
    # QLD
    if (4000 <= n <= 4999) or (9000 <= n <= 9999):
        return "Queensland"
    # SA
    if (5000 <= n <= 5799) or (5800 <= n <= 5999):
        return "South Australia"
    # WA
    if (6000 <= n <= 6797) or (6800 <= n <= 6999):
        return "Western Australia"
    # TAS
    if (7000 <= n <= 7799) or (7800 <= n <= 7999):
        return "Tasmania"
    # NT
    if (800 <= n <= 899) or (900 <= n <= 999):
        return "Northern Territory"
    return ""


class AttachmentResponse(BaseModel):
    id: int
    file_name: str = Field(alias="fileName")
    object_key: str = Field(alias="objectKey")
    url: Optional[str] = None
    content_type: Optional[str] = Field(default=None, alias="contentType")
    file_size: Optional[int] = Field(default=None, alias="fileSize")
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class HomeBase(BaseModel):
    address: str
    state: str
    postal_code: str = Field(alias="postalCode")
    property_type: str = Field(alias="propertyType")
    sda_type: Optional[str] = Field(default=None, alias="sdaType")
    status: Optional[str] = "Available"
    description: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

    # Address must look realistic: contains at least one digit and one letter, min length 5
    @field_validator("address")
    @classmethod
    def _address_valid(cls, v: str) -> str:
        if not v or len(v.strip()) < 5 or not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Address must include a street number and name")
        return v.strip()

    # State must be a known Australian state/territory
    @field_validator("state")
    @classmethod
    def _state_valid(cls, v: str) -> str:
        if v not in AU_STATES:
            raise ValueError("Invalid state selection")
        return v

    # Postcode must be exactly 4 digits
    @field_validator("postal_code")
    @classmethod
    def _postcode_valid(cls, v: str) -> str:
        if not re.fullmatch(r"\d{4}", v or ""):
            raise ValueError("Postcode must be exactly 4 digits")
        return v

    # Property type must be one of supported values
    @field_validator("property_type")
    @classmethod
    def _ptype_valid(cls, v: str) -> str:
        if not v or v not in PROPERTY_TYPES:
            raise ValueError("Property type is required")
        return v

    # SDA type if provided must be valid
    @field_validator("sda_type")
    @classmethod
    def _sdatype_valid(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in SDA_TYPES:
            raise ValueError("Invalid SDA type")
        return v

    # Cross-field validation: postcode must match state
    @model_validator(mode="after")
    def _postcode_state_consistency(self):
        expected = expected_state_from_postcode(self.postal_code)
        if expected and expected != self.state:
            raise ValueError(f"Postcode {self.postal_code} belongs to {expected}, not {self.state}")
        return self


class HomeResponseBase(BaseModel):
    address: str
    state: str
    postal_code: str
    property_type: str
    sda_type: Optional[str]
    status: Optional[str]
    description: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class HomeProfileBase(BaseModel):
    display_name: str = Field(alias="displayName")
    assigned_manager: Optional[str] = Field(default=None, alias="assignedManager")
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("display_name")
    @classmethod
    def _display_name_valid(cls, v: str) -> str:
        # Require at least one letter and length >= 2
        if not v or len(v.strip()) < 2 or not re.search(r"[A-Za-z]", v):
            raise ValueError("Display name must include letters and be at least 2 characters")
        return v.strip()


class HomeProfileResponse(HomeProfileBase):
    id: int
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class HomePropertyDetailBase(BaseModel):
    total_rooms: int = Field(alias="totalRooms")
    bathrooms: int
    kitchens: int
    parking_spaces: int = Field(alias="parkingSpaces")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("total_rooms", "bathrooms", "kitchens", "parking_spaces")
    @classmethod
    def _non_negative(cls, v: int, info):
        if v is None or v < 0:
            raise ValueError(f"{info.field_name} must be a non-negative number")
        return v


class HomePropertyDetailResponse(HomePropertyDetailBase):
    id: int
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class HomeSharedSpaceBase(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def _space_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Shared space name cannot be empty")
        return v.strip()


class HomeSharedSpaceResponse(HomeSharedSpaceBase):
    id: int
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True)


class HomeFeatureBase(BaseModel):
    feature_name: str = Field(alias="featureName")
    is_available: bool = Field(alias="isAvailable")

    model_config = ConfigDict(populate_by_name=True)


class HomeFeatureResponse(HomeFeatureBase):
    id: int
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RoomBase(BaseModel):
    bed_type: str = Field(alias="bedType")
    rent_amount: float = Field(alias="rentAmount")
    rent_frequency: str = Field(alias="rentFrequency")
    ensuite: bool = False
    furnishings: Optional[str] = None
    occupancy_status: Optional[str] = Field(default="Vacant", alias="occupancyStatus")

    model_config = ConfigDict(populate_by_name=True)


class RoomDetailBase(BaseModel):
    name: str
    bed_height: Optional[str] = Field(default=None, alias="bedHeight")
    sofas: Optional[int] = 0
    cupboard: bool = False
    tv: bool = False
    tables: Optional[int] = 0
    door_width: Optional[str] = Field(default=None, alias="doorWidth")
    description: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class RoomDetailResponse(RoomDetailBase):
    id: int
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ParticipantSummary(BaseModel):
    id: int
    first_name: Optional[str] = Field(default=None, alias="firstName")
    last_name: Optional[str] = Field(default=None, alias="lastName")
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class OccupancyBase(BaseModel):
    participant_id: int = Field(alias="participantId")
    move_in_date: date = Field(alias="moveInDate")
    move_out_date: Optional[date] = Field(default=None, alias="moveOutDate")

    model_config = ConfigDict(populate_by_name=True)


class OccupancyCreate(OccupancyBase):
    pass


class OccupancyResponse(OccupancyBase):
    id: int
    participant: Optional[ParticipantSummary] = None
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RoomResponse(RoomBase):
    id: int
    home_id: int = Field(alias="homeId")
    detail: Optional[RoomDetailResponse] = None
    images: List[AttachmentResponse] = []
    occupancies: List[OccupancyResponse] = []
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MaintenanceBase(BaseModel):
    description: str
    status: Optional[str] = "Open"
    priority: Optional[str] = "Medium"
    category: Optional[str] = None
    assigned_to: Optional[str] = Field(default=None, alias="assignedTo")
    scheduled_date: Optional[date] = Field(default=None, alias="scheduledDate")
    completed_date: Optional[date] = Field(default=None, alias="completedDate")
    cost: Optional[float] = None
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceResponse(MaintenanceBase):
    id: int
    home_id: int = Field(alias="homeId")
    attachments: List[AttachmentResponse] = []
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MaintenanceAuditResponse(BaseModel):
    id: int
    maintenance_request_id: int = Field(alias="maintenanceRequestId")
    action: str
    changed_by: Optional[str] = Field(default=None, alias="changedBy")
    from_status: Optional[str] = Field(default=None, alias="fromStatus")
    to_status: Optional[str] = Field(default=None, alias="toStatus")
    comment: Optional[str] = None
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PreventiveScheduleBase(BaseModel):
    description: str
    frequency: str  # Monthly, Quarterly, SemiAnnual, Annual, CustomDays
    interval_days: Optional[int] = Field(default=None, alias="intervalDays")
    assigned_to: Optional[str] = Field(default=None, alias="assignedTo")
    category: Optional[str] = None
    estimated_cost: Optional[float] = Field(default=None, alias="estimatedCost")
    next_due_date: date = Field(alias="nextDueDate")
    active: Optional[bool] = True

    model_config = ConfigDict(populate_by_name=True)


class PreventiveScheduleCreate(PreventiveScheduleBase):
    pass


class PreventiveScheduleResponse(PreventiveScheduleBase):
    id: int
    home_id: int = Field(alias="homeId")
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class NoteBase(BaseModel):
    note: str
    created_by: Optional[str] = Field(default=None, alias="createdBy")

    model_config = ConfigDict(populate_by_name=True)


class NoteCreate(NoteBase):
    pass


class NoteResponse(NoteBase):
    id: int
    home_id: int = Field(alias="homeId")
    attachments: List[AttachmentResponse] = []
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class HomeCreatePayload(BaseModel):
    home: HomeBase
    profile: HomeProfileBase
    property_detail: HomePropertyDetailBase = Field(alias="propertyDetail")
    shared_spaces: List[HomeSharedSpaceBase] = Field(default_factory=list, alias="sharedSpaces")
    features: List[HomeFeatureBase] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class HomeUpdatePayload(HomeCreatePayload):
    pass


class HomeResponse(HomeResponseBase):
    id: int
    profile: Optional[HomeProfileResponse] = None
    property_detail: Optional[HomePropertyDetailResponse] = Field(alias="propertyDetail", default=None)
    shared_spaces: List[HomeSharedSpaceResponse] = Field(default_factory=list, alias="sharedSpaces")
    features: List[HomeFeatureResponse] = []
    rooms: List[RoomResponse] = []
    notes: List[NoteResponse] = []
    maintenance_requests: List[MaintenanceResponse] = Field(default_factory=list, alias="maintenanceRequests")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class HomeSummary(BaseModel):
    id: int
    display_name: str = Field(alias="displayName")
    address: str
    state: str
    postal_code: str = Field(alias="postalCode")
    property_type: str = Field(alias="propertyType")
    sda_type: Optional[str] = Field(default=None, alias="sdaType")
    status: Optional[str]
    assigned_manager: Optional[str] = Field(default=None, alias="assignedManager")
    rooms_total: int = Field(alias="roomsTotal")
    rooms_available: int = Field(alias="roomsAvailable")
    bathrooms: int
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class HomeStatsResponse(BaseModel):
    total_homes: int = Field(alias="totalHomes")
    available_rooms: int = Field(alias="availableRooms")
    occupied_rooms: int = Field(alias="occupiedRooms")
    pending_maintenance: int = Field(alias="pendingMaintenance")


class MaintenanceOverviewItem(BaseModel):
    home: HomeSummary
    open_requests: int = Field(alias="openRequests")
    in_progress_requests: int = Field(alias="inProgressRequests")
    latest_requests: List[MaintenanceResponse] = Field(alias="latestRequests", default_factory=list)


class RoomCreate(RoomBase):
    detail: RoomDetailBase


class RoomUpdate(RoomBase):
    detail: RoomDetailBase

