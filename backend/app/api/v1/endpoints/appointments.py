# backend/app/api/v1/endpoints/appointments.py - ENHANCED WITH SMART FEATURES
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text, case
from datetime import date, time, datetime, timedelta
from typing import List, Optional, Dict, Any, Union
import logging
from pydantic import BaseModel, Field
import asyncio
from enum import Enum

from app.core.database import get_db
from app.api.deps_admin_key import require_admin_key
from app.models.roster import Roster, RosterParticipant, RosterStatus
from app.models.participant import Participant
from app.models.user import User
from app.core.scheduling import (
    ConflictDetector, 
    ScheduleOptimizer, 
    SuggestionEngine,
    PerformanceAnalyzer,
    AvailabilityCalculator
)

router = APIRouter(dependencies=[Depends(require_admin_key)])
logger = logging.getLogger(__name__)

# ==========================================
# ENHANCED SCHEMA DEFINITIONS
# ==========================================

class PriorityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ConflictType(str, Enum):
    WORKER_DOUBLE_BOOKING = "worker_double_booking"
    PARTICIPANT_OVERLAP = "participant_overlap"
    LOCATION_CONFLICT = "location_conflict"
    TIME_CONSTRAINT = "time_constraint"
    RESOURCE_CONFLICT = "resource_conflict"

class SuggestionType(str, Enum):
    TIME_OPTIMIZATION = "time_optimization"
    WORKER_ASSIGNMENT = "worker_assignment"
    GAP_FILLING = "gap_filling"
    CONFLICT_RESOLUTION = "conflict_resolution"
    PERFORMANCE_ENHANCEMENT = "performance_enhancement"

class AppointmentCreate(BaseModel):
    participant_id: int
    support_worker_id: int
    start_time: str  # ISO format
    end_time: str    # ISO format
    service_type: str
    location: Optional[str] = None
    location_type: Optional[str] = "home_visit"
    priority: Optional[PriorityLevel] = PriorityLevel.MEDIUM
    notes: Optional[str] = None
    recurring: Optional[bool] = False
    recurrence_pattern: Optional[str] = None
    recurrence_end: Optional[str] = None
    send_notifications: Optional[bool] = True
    auto_optimize: Optional[bool] = False

class AppointmentUpdate(BaseModel):
    participant_id: Optional[int] = None
    support_worker_id: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    service_type: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[PriorityLevel] = None
    notes: Optional[str] = None

class ConflictInfo(BaseModel):
    id: str
    type: ConflictType
    severity: str  # low, medium, high, critical
    description: str
    roster_id: Optional[int] = None
    appointment_ids: List[int]
    suggestions: List[str]
    auto_resolvable: bool
    created_at: datetime

class SchedulingSuggestion(BaseModel):
    id: str
    type: SuggestionType
    title: str
    description: str
    priority: PriorityLevel
    estimated_benefit: str
    implementation_effort: str  # easy, moderate, complex
    data: Dict[str, Any]
    created_at: datetime

class AvailabilitySlot(BaseModel):
    start_time: str
    end_time: str
    worker_id: int
    worker_name: str
    skill_match_score: float
    preference_score: float
    overall_score: float
    reasons: List[str]

class PerformanceMetrics(BaseModel):
    period_start: str
    period_end: str
    total_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    completion_rate: float
    average_session_duration: float
    participant_satisfaction: float
    worker_utilization: float
    revenue_generated: float
    cost_per_hour: float
    efficiency_score: float

class OptimizationResult(BaseModel):
    optimized_schedule: List[Dict[str, Any]]
    improvements: List[Dict[str, Any]]
    implementation_steps: List[str]
    estimated_savings: Dict[str, float]

# ==========================================
# ENHANCED APPOINTMENT ENDPOINTS
# ==========================================

@router.get("", response_model=List[Dict[str, Any]])
def get_appointments(
    db: Session = Depends(get_db),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    participant_id: Optional[int] = Query(None),
    support_worker_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[PriorityLevel] = Query(None),
    service_type: Optional[str] = Query(None),
    include_conflicts: Optional[bool] = Query(False),
    include_suggestions: Optional[bool] = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    """Enhanced appointment retrieval with conflict detection and suggestions"""
    try:
        # Build base query
        query = db.query(Roster).options(
            joinedload(Roster.participants),
        )
        
        # Apply filters
        filters = []
        if start_date:
            filters.append(Roster.support_date >= start_date)
        if end_date:
            filters.append(Roster.support_date <= end_date)
        if support_worker_id:
            filters.append(Roster.worker_id == support_worker_id)
        if status:
            filters.append(Roster.status == RosterStatus(status.lower()))
        if participant_id:
            filters.append(
                Roster.participants.any(RosterParticipant.participant_id == participant_id)
            )
        if service_type:
            filters.append(Roster.eligibility.ilike(f"%{service_type}%"))
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Apply pagination
        total_count = query.count()
        rosters = query.order_by(Roster.support_date.desc(), Roster.start_time.asc())\
                      .offset((page - 1) * limit)\
                      .limit(limit)\
                      .all()
        
        # Transform to appointment format with enhanced data
        appointments = []
        conflict_detector = ConflictDetector(db)
        suggestion_engine = SuggestionEngine(db)
        
        for roster in rosters:
            # Get participant and worker info
            participant = None
            if roster.participants:
                participant_id = roster.participants[0].participant_id
                participant = db.query(Participant).filter(Participant.id == participant_id).first()
            
            support_worker = None
            if roster.worker_id:
                support_worker = db.query(User).filter(User.id == roster.worker_id).first()
            
            # Calculate priority based on participant needs and urgency
            calculated_priority = calculate_appointment_priority(roster, participant)
            
            appointment = {
                "id": roster.id,
                "participant_id": participant.id if participant else 0,
                "participant_name": f"{participant.first_name} {participant.last_name}" if participant else "Unknown",
                "support_worker_id": roster.worker_id,
                "support_worker_name": support_worker.full_name if support_worker else "Unknown",
                "start_time": f"{roster.support_date}T{roster.start_time}",
                "end_time": f"{roster.support_date}T{roster.end_time}",
                "service_type": roster.eligibility or "General Support",
                "location": get_appointment_location(roster, participant),
                "location_type": "home_visit",
                "status": roster.status.value,
                "priority": calculated_priority,
                "notes": roster.notes,
                "recurring": bool(roster.recurrences),
                "created_at": roster.created_at,
                "updated_at": roster.updated_at,
                "duration_hours": calculate_duration_hours(roster.start_time, roster.end_time),
                "estimated_cost": calculate_estimated_cost(roster, support_worker)
            }
            
            # Add conflict information if requested
            if include_conflicts:
                conflicts = conflict_detector.detect_conflicts_for_appointment(roster)
                appointment["conflicts"] = [conflict.dict() for conflict in conflicts]
                appointment["has_conflicts"] = len(conflicts) > 0
            
            # Add suggestions if requested
            if include_suggestions:
                suggestions = suggestion_engine.get_suggestions_for_appointment(roster)
                appointment["suggestions"] = [suggestion.dict() for suggestion in suggestions]
            
            appointments.append(appointment)
        
        # Add pagination metadata
        response = {
            "appointments": appointments,
            "pagination": {
                "total": total_count,
                "page": page,
                "limit": limit,
                "pages": (total_count + limit - 1) // limit
            }
        }
        
        # Add summary statistics
        if appointments:
            response["summary"] = {
                "total_duration": sum(apt["duration_hours"] for apt in appointments),
                "total_cost": sum(apt["estimated_cost"] for apt in appointments),
                "status_breakdown": calculate_status_breakdown(appointments),
                "priority_breakdown": calculate_priority_breakdown(appointments)
            }
        
        logger.info(f"Retrieved {len(appointments)} appointments with enhanced data")
        return response
        
    except Exception as e:
        logger.error(f"Error retrieving appointments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve appointments: {str(e)}"
        )

@router.post("/smart-create", response_model=Dict[str, Any])
def smart_create_appointment(
    appointment_data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Smart appointment creation with conflict detection and optimization"""
    try:
        # Validate appointment data
        validation_errors = validate_appointment_data(db, appointment_data)
        if validation_errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"errors": validation_errors}
            )
        
        # Check for conflicts
        conflict_detector = ConflictDetector(db)
        conflicts = conflict_detector.check_conflicts_for_new_appointment(appointment_data)
        
        if conflicts and not appointment_data.auto_optimize:
            return {
                "success": False,
                "conflicts": [conflict.dict() for conflict in conflicts],
                "suggestions": generate_conflict_resolutions(conflicts),
                "message": "Conflicts detected. Review suggestions or enable auto-optimization."
            }
        
        # Auto-optimize if requested and conflicts exist
        if conflicts and appointment_data.auto_optimize:
            optimizer = ScheduleOptimizer(db)
            optimized_data = optimizer.resolve_conflicts_and_optimize(appointment_data, conflicts)
            appointment_data = optimized_data
        
        # Create the appointment
        appointment = create_appointment_from_data(db, appointment_data)
        
        # Schedule background tasks
        if appointment_data.send_notifications:
            background_tasks.add_task(send_appointment_notifications, appointment.id)
        
        background_tasks.add_task(update_performance_metrics, appointment.id)
        background_tasks.add_task(generate_suggestions_for_participant, appointment_data.participant_id)
        
        return {
            "success": True,
            "appointment": format_appointment_response(appointment, db),
            "optimizations_applied": conflicts and appointment_data.auto_optimize,
            "message": "Appointment created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in smart appointment creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create appointment: {str(e)}"
        )

@router.get("/conflicts", response_model=List[ConflictInfo])
def get_scheduling_conflicts(
    db: Session = Depends(get_db),
    date: Optional[date] = Query(None),
    worker_id: Optional[int] = Query(None),
    severity: Optional[str] = Query(None),
    auto_resolvable_only: Optional[bool] = Query(False)
):
    """Get scheduling conflicts with filtering options"""
    try:
        conflict_detector = ConflictDetector(db)
        
        # Build filter criteria
        filter_criteria = {}
        if date:
            filter_criteria["date"] = date
        if worker_id:
            filter_criteria["worker_id"] = worker_id
        if severity:
            filter_criteria["severity"] = severity
        if auto_resolvable_only:
            filter_criteria["auto_resolvable"] = True
        
        conflicts = conflict_detector.detect_all_conflicts(filter_criteria)
        
        logger.info(f"Found {len(conflicts)} conflicts")
        return conflicts
        
    except Exception as e:
        logger.error(f"Error detecting conflicts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to detect conflicts: {str(e)}"
        )

@router.post("/conflicts/{conflict_id}/resolve")
def resolve_conflict(
    conflict_id: str,
    resolution_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Resolve a scheduling conflict"""
    try:
        conflict_detector = ConflictDetector(db)
        optimizer = ScheduleOptimizer(db)
        
        # Get conflict details
        conflict = conflict_detector.get_conflict_by_id(conflict_id)
        if not conflict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conflict not found"
            )
        
        # Apply resolution
        result = optimizer.resolve_conflict(conflict, resolution_data)
        
        # Update affected appointments
        background_tasks.add_task(update_affected_appointments, conflict.appointment_ids)
        background_tasks.add_task(recalculate_performance_metrics)
        
        return {
            "success": True,
            "message": f"Conflict {conflict_id} resolved successfully",
            "actions_taken": result.actions_taken,
            "affected_appointments": result.affected_appointments
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving conflict {conflict_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve conflict: {str(e)}"
        )

@router.get("/suggestions", response_model=List[SchedulingSuggestion])
def get_scheduling_suggestions(
    db: Session = Depends(get_db),
    participant_id: Optional[int] = Query(None),
    worker_id: Optional[int] = Query(None),
    suggestion_type: Optional[SuggestionType] = Query(None),
    priority: Optional[PriorityLevel] = Query(None),
    limit: int = Query(10, ge=1, le=50)
):
    """Get AI-powered scheduling suggestions"""
    try:
        suggestion_engine = SuggestionEngine(db)
        
        # Generate suggestions based on criteria
        suggestions = suggestion_engine.generate_suggestions(
            participant_id=participant_id,
            worker_id=worker_id,
            suggestion_type=suggestion_type,
            priority=priority,
            limit=limit
        )
        
        logger.info(f"Generated {len(suggestions)} suggestions")
        return suggestions
        
    except Exception as e:
        logger.error(f"Error generating suggestions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate suggestions: {str(e)}"
        )

@router.get("/availability/slots", response_model=List[AvailabilitySlot])
def get_available_slots(
    participant_id: int,
    service_type: str,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    duration_hours: Optional[float] = Query(2.0),
    required_skills: Optional[List[str]] = Query(None),
    preferred_times: Optional[List[str]] = Query(None),
    avoid_workers: Optional[List[int]] = Query(None)
):
    """Find available time slots for appointments"""
    try:
        availability_calc = AvailabilityCalculator(db)
        
        slots = availability_calc.find_available_slots(
            participant_id=participant_id,
            service_type=service_type,
            start_date=start_date,
            end_date=end_date,
            duration_hours=duration_hours,
            required_skills=required_skills or [],
            preferred_times=preferred_times or [],
            avoid_workers=avoid_workers or []
        )
        
        # Sort by overall score
        slots.sort(key=lambda x: x.overall_score, reverse=True)
        
        logger.info(f"Found {len(slots)} available slots")
        return slots
        
    except Exception as e:
        logger.error(f"Error finding available slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find available slots: {str(e)}"
        )

@router.post("/optimize", response_model=OptimizationResult)
def optimize_schedule(
    optimization_date: date,
    criteria: Dict[str, bool],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Optimize schedule for a specific date"""
    try:
        optimizer = ScheduleOptimizer(db)
        
        result = optimizer.optimize_daily_schedule(
            date=optimization_date,
            criteria=criteria
        )
        
        # Apply optimizations if significant improvements
        if any(imp["improvement_percentage"] > 10 for imp in result.improvements):
            background_tasks.add_task(
                apply_schedule_optimizations, 
                optimization_date, 
                result.optimized_schedule
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error optimizing schedule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize schedule: {str(e)}"
        )

@router.get("/analytics/performance", response_model=Union[PerformanceMetrics, List[PerformanceMetrics]])
def get_performance_analytics(
    db: Session = Depends(get_db),
    worker_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    include_predictions: Optional[bool] = Query(False)
):
    """Get performance analytics and metrics"""
    try:
        analyzer = PerformanceAnalyzer(db)
        
        if worker_id:
            # Single worker metrics
            metrics = analyzer.get_worker_performance(
                worker_id=worker_id,
                start_date=start_date,
                end_date=end_date,
                include_predictions=include_predictions
            )
        else:
            # All workers metrics
            metrics = analyzer.get_all_workers_performance(
                start_date=start_date,
                end_date=end_date,
                include_predictions=include_predictions
            )
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting performance analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get performance analytics: {str(e)}"
        )

@router.get("/stats/summary")
def get_enhanced_appointment_stats(db: Session = Depends(get_db)):
    """Enhanced appointment statistics with predictions and insights"""
    try:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        # Get base statistics
        base_stats = get_base_statistics(db, today, week_start, week_end)
        
        # Add performance insights
        analyzer = PerformanceAnalyzer(db)
        insights = analyzer.get_performance_insights(period_days=7)
        
        # Add conflict statistics
        conflict_detector = ConflictDetector(db)
        conflict_stats = conflict_detector.get_conflict_statistics()
        
        # Add efficiency metrics
        efficiency_metrics = calculate_efficiency_metrics(db, week_start, week_end)
        
        return {
            **base_stats,
            "insights": insights,
            "conflicts": conflict_stats,
            "efficiency": efficiency_metrics,
            "trends": calculate_weekly_trends(db),
            "recommendations": generate_system_recommendations(db)
        }
        
    except Exception as e:
        logger.error(f"Error getting enhanced stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get enhanced statistics: {str(e)}"
        )

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def calculate_appointment_priority(roster: Roster, participant: Optional[Participant]) -> str:
    """Calculate dynamic priority based on multiple factors"""
    priority_score = 0
    
    # Participant risk level
    if participant:
        if hasattr(participant, 'risk_level'):
            if participant.risk_level == 'high':
                priority_score += 30
            elif participant.risk_level == 'medium':
                priority_score += 20
            else:
                priority_score += 10
    
    # Service type urgency
    urgent_services = ['Medical Support', 'Crisis Support', 'Emergency Care']
    if roster.eligibility in urgent_services:
        priority_score += 25
    
    # Time sensitivity (appointments today or tomorrow)
    days_until = (roster.support_date - date.today()).days
    if days_until <= 1:
        priority_score += 20
    elif days_until <= 3:
        priority_score += 10
    
    # Determine priority level
    if priority_score >= 50:
        return "critical"
    elif priority_score >= 35:
        return "high"
    elif priority_score >= 20:
        return "medium"
    else:
        return "low"

def get_appointment_location(roster: Roster, participant: Optional[Participant]) -> str:
    """Get appointment location with intelligent defaults"""
    if participant:
        address_parts = [
            participant.street_address,
            participant.city,
            participant.state,
            participant.postcode
        ]
        full_address = ", ".join(filter(None, address_parts))
        return full_address if full_address else "Home Visit"
    return "Location TBD"

def calculate_duration_hours(start_time: time, end_time: time) -> float:
    """Calculate duration in hours"""
    start_dt = datetime.combine(date.today(), start_time)
    end_dt = datetime.combine(date.today(), end_time)
    return (end_dt - start_dt).total_seconds() / 3600

def calculate_estimated_cost(roster: Roster, support_worker: Optional[User]) -> float:
    """Calculate estimated cost based on duration and worker rate"""
    duration = calculate_duration_hours(roster.start_time, roster.end_time)
    
    # Default hourly rate based on service type
    default_rates = {
        'Personal Care': 35.0,
        'Community Access': 32.0,
        'Domestic Assistance': 30.0,
        'Transport': 28.0,
        'Social Participation': 32.0,
        'Skill Development': 38.0
    }
    
    base_rate = default_rates.get(roster.eligibility, 35.0)
    
    # Apply worker-specific rate if available
    if support_worker and hasattr(support_worker, 'hourly_rate'):
        base_rate = support_worker.hourly_rate or base_rate
    
    return duration * base_rate

def validate_appointment_data(db: Session, data: AppointmentCreate) -> List[str]:
    """Comprehensive appointment data validation"""
    errors = []
    
    # Check participant exists
    participant = db.query(Participant).filter(Participant.id == data.participant_id).first()
    if not participant:
        errors.append(f"Participant {data.participant_id} not found")
    
    # Check support worker exists and is active
    worker = db.query(User).filter(User.id == data.support_worker_id).first()
    if not worker:
        errors.append(f"Support worker {data.support_worker_id} not found")
    elif not worker.is_active:
        errors.append(f"Support worker {data.support_worker_id} is not active")
    
    # Validate time format and logic
    try:
        start_dt = datetime.fromisoformat(data.start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(data.end_time.replace('Z', '+00:00'))
        
        if start_dt >= end_dt:
            errors.append("End time must be after start time")
        
        if start_dt.date() < date.today():
            errors.append("Cannot schedule appointments in the past")
        
        # Check reasonable duration (15 minutes to 12 hours)
        duration = (end_dt - start_dt).total_seconds() / 3600
        if duration < 0.25:
            errors.append("Appointment must be at least 15 minutes long")
        elif duration > 12:
            errors.append("Appointment cannot exceed 12 hours")
            
    except ValueError:
        errors.append("Invalid time format")
    
    # Business rule validations
    if data.recurring and not data.recurrence_end:
        errors.append("Recurring appointments must have an end date")
    
    return errors

def create_appointment_from_data(db: Session, data: AppointmentCreate) -> Roster:
    """Create roster entry from appointment data"""
    start_dt = datetime.fromisoformat(data.start_time.replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(data.end_time.replace('Z', '+00:00'))
    
    roster = Roster(
        worker_id=data.support_worker_id,
        support_date=start_dt.date(),
        start_time=start_dt.time(),
        end_time=end_dt.time(),
        eligibility=data.service_type,
        notes=data.notes,
        status=RosterStatus.checked,
        is_group_support=False
    )
    
    db.add(roster)
    db.flush()
    
    # Add participant
    roster_participant = RosterParticipant(
        roster_id=roster.id,
        participant_id=data.participant_id
    )
    db.add(roster_participant)
    
    # Add recurrence if specified
    if data.recurring and data.recurrence_end:
        # Implementation would add recurrence patterns
        pass
    
    db.commit()
    db.refresh(roster)
    
    return roster

def format_appointment_response(roster: Roster, db: Session) -> Dict[str, Any]:
    """Format roster as appointment response"""
    participant = None
    if roster.participants:
        participant_id = roster.participants[0].participant_id
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
    
    support_worker = None
    if roster.worker_id:
        support_worker = db.query(User).filter(User.id == roster.worker_id).first()
    
    return {
        "id": roster.id,
        "participant_id": participant.id if participant else 0,
        "participant_name": f"{participant.first_name} {participant.last_name}" if participant else "Unknown",
        "support_worker_id": roster.worker_id,
        "support_worker_name": support_worker.full_name if support_worker else "Unknown",
        "start_time": f"{roster.support_date}T{roster.start_time}",
        "end_time": f"{roster.support_date}T{roster.end_time}",
        "service_type": roster.eligibility,
        "location": get_appointment_location(roster, participant),
        "status": roster.status.value,
        "priority": calculate_appointment_priority(roster, participant),
        "notes": roster.notes,
        "created_at": roster.created_at,
        "updated_at": roster.updated_at
    }

# Background task functions
async def send_appointment_notifications(appointment_id: int):
    """Send notifications for new/updated appointments"""
    # Implementation would send email/SMS notifications
    logger.info(f"Sending notifications for appointment {appointment_id}")

async def update_performance_metrics(appointment_id: int):
    """Update performance metrics after appointment changes"""
    # Implementation would recalculate worker/system metrics
    logger.info(f"Updating performance metrics for appointment {appointment_id}")

async def generate_suggestions_for_participant(participant_id: int):
    """Generate new suggestions for a participant"""
    # Implementation would analyze participant's schedule and generate suggestions
    logger.info(f"Generating suggestions for participant {participant_id}")

# Additional helper functions would be implemented here...