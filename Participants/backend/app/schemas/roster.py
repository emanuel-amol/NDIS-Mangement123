# backend/app/schemas/roster.py - ENHANCED WITH DYNAMIC FEATURES
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from datetime import date, time, datetime
from enum import Enum

class RosterStatus(str, Enum):
    checked = "checked"
    confirmed = "confirmed"
    notified = "notified"
    cancelled = "cancelled"
    completed = "completed"

class RecurrenceType(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"

# Enhanced task schema with metrics
class RosterTaskIn(BaseModel):
    title: str
    is_done: bool = False
    estimated_duration: Optional[int] = None  # in minutes
    priority: Optional[str] = "medium"

class RosterTaskOut(BaseModel):
    title: str
    is_done: bool
    estimated_duration: Optional[int] = None
    actual_duration: Optional[int] = None
    priority: Optional[str] = "medium"
    id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Enhanced worker note schema
class RosterWorkerNoteIn(BaseModel):
    note: str
    type: Optional[str] = "general"  # general, urgent, follow_up

class RosterWorkerNoteOut(BaseModel):
    note: str
    type: Optional[str] = "general"
    created_at: Optional[datetime] = None
    created_by: Optional[int] = None
    id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Participant association
class RosterParticipantIn(BaseModel):
    participant_id: int

class RosterParticipantOut(BaseModel):
    participant_id: int
    participant_name: Optional[str] = None
    participant_phone: Optional[str] = None
    
    class Config:
        from_attributes = True

# Enhanced recurrence pattern
class RosterRecurrenceIn(BaseModel):
    pattern_type: RecurrenceType
    interval: int = 1
    by_weekdays: Optional[List[int]] = None    # weekly
    by_monthday: Optional[int] = None          # monthly (15th)
    by_setpos: Optional[int] = None            # monthly (2nd monday)
    by_weekday: Optional[int] = None           # 0..6
    start_date: date
    end_date: date

class RosterRecurrenceOut(BaseModel):
    pattern_type: RecurrenceType
    interval: int
    by_weekdays: Optional[str] = None
    by_monthday: Optional[int] = None
    by_setpos: Optional[int] = None
    by_weekday: Optional[int] = None
    start_date: date
    end_date: date
    id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Roster instance for recurring schedules
class RosterInstanceOut(BaseModel):
    id: int
    roster_id: int
    occurrence_date: date
    start_time: time
    end_time: time
    status: Optional[RosterStatus] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

# Base roster schemas
class RosterBase(BaseModel):
    service_org_id: Optional[int] = None
    service_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    worker_id: Optional[int] = None

    support_date: date
    start_time: time
    end_time: time

    quantity: Optional[float] = None
    ratio_worker_to_participant: Optional[float] = None
    eligibility: Optional[str] = None
    transport_km: Optional[float] = None
    transport_worker_expenses: Optional[float] = None
    transport_non_labour: Optional[float] = None
    notes: Optional[str] = None
    status: RosterStatus = RosterStatus.checked
    is_group_support: bool = False

class RosterCreate(RosterBase):
    participants: List[RosterParticipantIn]
    tasks: Optional[List[RosterTaskIn]] = None
    worker_notes: Optional[List[RosterWorkerNoteIn]] = None
    recurrences: Optional[List[RosterRecurrenceIn]] = None

class RosterUpdate(RosterBase):
    support_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[RosterStatus] = None

class RosterOut(RosterBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Related data
    participants: List[RosterParticipantOut] = []
    tasks: List[RosterTaskOut] = []
    worker_notes: List[RosterWorkerNoteOut] = []
    recurrences: List[RosterRecurrenceOut] = []
    instances: List[RosterInstanceOut] = []
    
    class Config:
        from_attributes = True

# ==========================================
# ENHANCED DYNAMIC SCHEMAS
# ==========================================

# Enhanced roster with real-time metrics
class RosterWithMetrics(BaseModel):
    # Base roster data
    id: int
    worker_id: Optional[int] = None
    support_date: date
    start_time: time
    end_time: time
    eligibility: Optional[str] = None
    notes: Optional[str] = None
    status: RosterStatus
    is_group_support: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Dynamic metrics
    duration_hours: float = 0.0
    completion_percentage: int = 0
    real_time_status: str = "scheduled"
    participant_count: int = 0
    tasks_completed: int = 0
    tasks_total: int = 0
    
    # Enhanced related data
    participants: List[Dict[str, Any]] = []
    tasks: List[Dict[str, Any]] = []
    worker_notes: List[Dict[str, Any]] = []
    recurrences: List[Dict[str, Any]] = []
    
    # Additional dynamic fields
    worker_name: Optional[str] = None
    location_address: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    weather_conditions: Optional[str] = None
    traffic_status: Optional[str] = None
    
    class Config:
        from_attributes = True

# Roster statistics for dashboard
class RosterStats(BaseModel):
    total_rosters: int = 0
    active_today: int = 0
    completed_today: int = 0
    cancelled_today: int = 0
    total_hours_scheduled: float = 0.0
    total_hours_completed: float = 0.0
    worker_utilization: float = 0.0
    average_completion_rate: float = 0.0
    conflicts_detected: int = 0
    last_updated: datetime
    
    # Additional metrics
    pending_approvals: int = 0
    overdue_tasks: int = 0
    high_priority_count: int = 0
    efficiency_score: float = 0.0

# Real-time update notifications
class RealTimeRosterUpdate(BaseModel):
    type: str  # created, updated, deleted, status_changed
    roster_id: int
    changes: Dict[str, Any] = {}
    timestamp: datetime
    user_id: Optional[int] = None
    broadcast_to: List[str] = []  # user roles or specific users

# Conflict detection
class ConflictInfo(BaseModel):
    roster_id: int
    conflict_type: str  # time_overlap, resource_conflict, location_conflict, travel_time
    description: str
    severity: str  # low, medium, high, critical
    suggested_resolution: Optional[str] = None
    affected_rosters: List[int] = []
    detection_time: datetime = Field(default_factory=datetime.utcnow)
    
    # Additional conflict data
    conflict_details: Dict[str, Any] = {}
    auto_resolvable: bool = False
    resolution_priority: int = 1  # 1-5, where 5 is highest priority

# Availability checking
class AvailabilityCheck(BaseModel):
    worker_id: int
    start_time: datetime
    end_time: datetime
    available: bool
    conflicts: List[ConflictInfo] = []
    suggestions: List[str] = []
    
    # Additional availability data
    workload_percentage: float = 0.0
    travel_time_required: int = 0  # minutes
    break_time_available: int = 0  # minutes
    preferred_time_slot: bool = False

# Worker performance metrics
class WorkerPerformanceMetrics(BaseModel):
    worker_id: int
    worker_name: str
    period_start: date
    period_end: date
    
    # Core metrics
    total_hours_scheduled: float = 0.0
    total_hours_completed: float = 0.0
    completion_rate: float = 0.0
    punctuality_score: float = 0.0
    participant_satisfaction: float = 0.0
    
    # Advanced metrics
    efficiency_rating: float = 0.0
    task_completion_rate: float = 0.0
    no_show_count: int = 0
    cancellation_rate: float = 0.0
    overtime_hours: float = 0.0
    travel_efficiency: float = 0.0
    
    # Trend data
    performance_trend: str = "stable"  # improving, declining, stable
    recommendations: List[str] = []

# Smart scheduling suggestions
class SchedulingSuggestion(BaseModel):
    suggestion_type: str  # optimize_travel, fill_gap, balance_workload, resolve_conflict
    title: str
    description: str
    impact_score: float  # 0.0 to 1.0
    implementation_effort: str  # low, medium, high
    
    # Suggestion details
    affected_rosters: List[int] = []
    proposed_changes: Dict[str, Any] = {}
    expected_benefits: List[str] = []
    potential_risks: List[str] = []
    
    # Auto-implementation
    auto_implementable: bool = False
    requires_approval: bool = True

# Bulk operations
class BulkRosterOperation(BaseModel):
    operation_type: str  # update, delete, reschedule, approve
    roster_ids: List[int]
    operation_data: Dict[str, Any] = {}
    reason: Optional[str] = None
    notify_participants: bool = True
    notify_workers: bool = True

class BulkOperationResult(BaseModel):
    operation_id: str
    total_items: int
    successful_items: int
    failed_items: int
    errors: List[Dict[str, Any]] = []
    warnings: List[str] = []
    completion_time: datetime

# Advanced filtering
class RosterFilter(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    worker_ids: Optional[List[int]] = None
    participant_ids: Optional[List[int]] = None
    status_list: Optional[List[RosterStatus]] = None
    service_types: Optional[List[str]] = None
    priority_levels: Optional[List[str]] = None
    
    # Advanced filters
    min_duration_hours: Optional[float] = None
    max_duration_hours: Optional[float] = None
    has_conflicts: Optional[bool] = None
    completion_rate_min: Optional[float] = None
    location_radius_km: Optional[float] = None
    location_center: Optional[str] = None
    
    # Sorting and pagination
    sort_by: str = "support_date"
    sort_order: str = "asc"  # asc, desc
    page: int = 1
    page_size: int = 50

# Resource optimization
class ResourceOptimization(BaseModel):
    optimization_type: str  # minimize_travel, maximize_utilization, balance_workload
    current_efficiency: float
    optimized_efficiency: float
    improvement_percentage: float
    
    # Optimization details
    current_schedule: List[Dict[str, Any]]
    optimized_schedule: List[Dict[str, Any]]
    changes_required: List[Dict[str, Any]]
    
    # Implementation
    implementation_complexity: str  # simple, moderate, complex
    estimated_time_savings: float  # hours per week
    cost_impact: float  # positive = savings, negative = additional cost

# Notification preferences
class NotificationSettings(BaseModel):
    roster_created: bool = True
    roster_updated: bool = True
    roster_cancelled: bool = True
    status_changed: bool = True
    conflict_detected: bool = True
    
    # Advanced notifications
    worker_assigned: bool = True
    participant_confirmed: bool = True
    reminder_24h: bool = True
    reminder_2h: bool = True
    completion_required: bool = True
    
    # Delivery methods
    email_enabled: bool = True
    sms_enabled: bool = False
    push_enabled: bool = True
    websocket_enabled: bool = True

# Geographic and location data
class LocationInfo(BaseModel):
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    postcode: Optional[str] = None
    suburb: Optional[str] = None
    state: Optional[str] = None
    
    # Accessibility and logistics
    parking_available: bool = True
    wheelchair_accessible: bool = False
    public_transport_nearby: bool = False
    special_access_requirements: Optional[str] = None

# Export all schemas
__all__ = [
    # Basic schemas
    "RosterStatus",
    "RecurrenceType", 
    "RosterTaskIn",
    "RosterTaskOut",
    "RosterWorkerNoteIn",
    "RosterWorkerNoteOut",
    "RosterParticipantIn",
    "RosterParticipantOut",
    "RosterRecurrenceIn",
    "RosterRecurrenceOut",
    "RosterInstanceOut",
    "RosterBase",
    "RosterCreate",
    "RosterUpdate",
    "RosterOut",
    
    # Enhanced dynamic schemas
    "RosterWithMetrics",
    "RosterStats",
    "RealTimeRosterUpdate",
    "ConflictInfo",
    "AvailabilityCheck",
    "WorkerPerformanceMetrics",
    "SchedulingSuggestion",
    "BulkRosterOperation",
    "BulkOperationResult",
    "RosterFilter",
    "ResourceOptimization",
    "NotificationSettings",
    "LocationInfo"
]