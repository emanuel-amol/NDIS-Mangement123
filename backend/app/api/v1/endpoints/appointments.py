# backend/app/api/v1/endpoints/appointments.py - FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from datetime import date, time, datetime, timedelta
from typing import List, Optional, Dict, Any
import logging
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps_admin_key import require_admin_key
from app.models.roster import Roster, RosterParticipant, RosterStatus
from app.models.participant import Participant
from app.models.user import User

router = APIRouter(dependencies=[Depends(require_admin_key)])
logger = logging.getLogger(__name__)

# ==========================================
# SIMPLIFIED SCHEMA DEFINITIONS
# ==========================================

class AppointmentCreate(BaseModel):
    participant_id: int
    support_worker_id: int
    start_time: str  # ISO format
    end_time: str    # ISO format
    service_type: str
    location: Optional[str] = None
    priority: Optional[str] = "medium"
    notes: Optional[str] = None
    recurring: Optional[bool] = False
    send_notifications: Optional[bool] = True

class AppointmentUpdate(BaseModel):
    participant_id: Optional[int] = None
    support_worker_id: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    service_type: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None

# ==========================================
# APPOINTMENT ENDPOINTS
# ==========================================

@router.get("", response_model=List[Dict[str, Any]])
def get_appointments(
    db: Session = Depends(get_db),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    participant_id: Optional[int] = Query(None),
    support_worker_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    """Get appointments (from roster data)"""
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
            try:
                filters.append(Roster.status == RosterStatus(status.lower()))
            except ValueError:
                pass  # Invalid status, ignore filter
        if participant_id:
            filters.append(
                Roster.participants.any(RosterParticipant.participant_id == participant_id)
            )
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Apply pagination
        total_count = query.count()
        rosters = query.order_by(Roster.support_date.desc(), Roster.start_time.asc())\
                      .offset((page - 1) * limit)\
                      .limit(limit)\
                      .all()
        
        # Transform to appointment format
        appointments = []
        
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
                "support_worker_name": support_worker.first_name + " " + support_worker.last_name if support_worker else "Unknown",
                "start_time": f"{roster.support_date}T{roster.start_time}",
                "end_time": f"{roster.support_date}T{roster.end_time}",
                "service_type": roster.eligibility or "General Support",
                "location": get_appointment_location(roster, participant),
                "location_type": "home_visit",
                "status": roster.status.value,
                "priority": calculated_priority,
                "notes": roster.notes,
                "recurring": False,  # Simplified for now
                "created_at": roster.created_at,
                "updated_at": roster.updated_at,
                "duration_hours": calculate_duration_hours(roster.start_time, roster.end_time),
                "estimated_cost": calculate_estimated_cost(roster, support_worker)
            }
            
            appointments.append(appointment)
        
        logger.info(f"Retrieved {len(appointments)} appointments")
        return appointments
        
    except Exception as e:
        logger.error(f"Error retrieving appointments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve appointments: {str(e)}"
        )

@router.get("/{appointment_id}", response_model=Dict[str, Any])
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Get a specific appointment"""
    try:
        roster = db.query(Roster).options(
            joinedload(Roster.participants),
        ).filter(Roster.id == appointment_id).first()
        
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment {appointment_id} not found"
            )
        
        # Get participant and worker info
        participant = None
        if roster.participants:
            participant_id = roster.participants[0].participant_id
            participant = db.query(Participant).filter(Participant.id == participant_id).first()
        
        support_worker = None
        if roster.worker_id:
            support_worker = db.query(User).filter(User.id == roster.worker_id).first()
        
        appointment = {
            "id": roster.id,
            "participant_id": participant.id if participant else 0,
            "participant_name": f"{participant.first_name} {participant.last_name}" if participant else "Unknown",
            "support_worker_id": roster.worker_id,
            "support_worker_name": support_worker.first_name + " " + support_worker.last_name if support_worker else "Unknown",
            "start_time": f"{roster.support_date}T{roster.start_time}",
            "end_time": f"{roster.support_date}T{roster.end_time}",
            "service_type": roster.eligibility or "General Support",
            "location": get_appointment_location(roster, participant),
            "location_type": "home_visit",
            "status": roster.status.value,
            "priority": calculate_appointment_priority(roster, participant),
            "notes": roster.notes,
            "recurring": False,
            "created_at": roster.created_at,
            "updated_at": roster.updated_at
        }
        
        return appointment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving appointment {appointment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve appointment: {str(e)}"
        )

@router.put("/{appointment_id}", response_model=Dict[str, Any])
def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    db: Session = Depends(get_db)
):
    """Update an appointment"""
    try:
        roster = db.query(Roster).filter(Roster.id == appointment_id).first()
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment {appointment_id} not found"
            )
        
        # Update roster fields
        update_data = appointment_data.model_dump(exclude_unset=True)
        
        if "start_time" in update_data and "end_time" in update_data:
            start_dt = datetime.fromisoformat(update_data["start_time"].replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(update_data["end_time"].replace('Z', '+00:00'))
            roster.support_date = start_dt.date()
            roster.start_time = start_dt.time()
            roster.end_time = end_dt.time()
        
        if "service_type" in update_data:
            roster.eligibility = update_data["service_type"]
        
        if "notes" in update_data:
            roster.notes = update_data["notes"]
            
        if "status" in update_data:
            try:
                roster.status = RosterStatus(update_data["status"].lower())
            except ValueError:
                pass  # Invalid status, ignore
        
        roster.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(roster)
        
        logger.info(f"Updated appointment {appointment_id}")
        return {"message": "Appointment updated successfully", "id": appointment_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating appointment {appointment_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update appointment: {str(e)}"
        )

@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Delete an appointment"""
    try:
        roster = db.query(Roster).filter(Roster.id == appointment_id).first()
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment {appointment_id} not found"
            )
        
        db.delete(roster)
        db.commit()
        
        logger.info(f"Deleted appointment {appointment_id}")
        return {"message": "Appointment deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting appointment {appointment_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete appointment: {str(e)}"
        )

@router.get("/stats/summary")
def get_appointment_stats(db: Session = Depends(get_db)):
    """Get appointment statistics"""
    try:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        # Count total appointments
        total_appointments = db.query(Roster).count()
        
        # Count today's appointments
        today_appointments = db.query(Roster).filter(
            Roster.support_date == today
        ).count()
        
        # Count pending requests
        pending_requests = db.query(Roster).filter(
            Roster.status == RosterStatus.checked
        ).count()
        
        # Count this week's appointments
        this_week_appointments = db.query(Roster).filter(
            and_(
                Roster.support_date >= week_start,
                Roster.support_date <= week_end
            )
        ).count()
        
        # Count scheduled support workers
        support_workers_scheduled = db.query(Roster.worker_id).filter(
            Roster.worker_id.isnot(None)
        ).distinct().count()
        
        # Count scheduled participants
        participants_scheduled = db.query(RosterParticipant.participant_id)\
            .join(Roster)\
            .distinct().count()
        
        # Calculate this week's hours
        week_rosters = db.query(Roster).filter(
            and_(
                Roster.support_date >= week_start,
                Roster.support_date <= week_end
            )
        ).all()
        
        this_week_hours = sum(
            calculate_duration_hours(r.start_time, r.end_time) 
            for r in week_rosters
        )
        
        return {
            "total_appointments": total_appointments,
            "today_appointments": today_appointments,
            "pending_requests": pending_requests,
            "this_week_appointments": this_week_appointments,
            "support_workers_scheduled": support_workers_scheduled,
            "participants_scheduled": participants_scheduled,
            "this_week_hours": round(this_week_hours, 1)
        }
        
    except Exception as e:
        logger.error(f"Error getting appointment stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get appointment statistics: {str(e)}"
        )

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def calculate_appointment_priority(roster: Roster, participant: Optional[Participant]) -> str:
    """Calculate dynamic priority based on multiple factors"""
    priority_score = 0
    
    # Participant risk level
    if participant and hasattr(participant, 'risk_level'):
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
            getattr(participant, 'street_address', ''),
            getattr(participant, 'city', ''),
            getattr(participant, 'state', ''),
            getattr(participant, 'postcode', '')
        ]
        full_address = ", ".join(filter(None, address_parts))
        return full_address if full_address else "Home Visit"
    return "Location TBD"

def calculate_duration_hours(start_time: time, end_time: time) -> float:
    """Calculate duration in hours"""
    if not start_time or not end_time:
        return 0.0
    
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
        base_rate = getattr(support_worker, 'hourly_rate', base_rate) or base_rate
    
    return duration * base_rate