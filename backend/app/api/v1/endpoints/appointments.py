# backend/app/api/v1/endpoints/appointments.py - NEW APPOINTMENTS ENDPOINT
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text
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

# Appointment response schema
class AppointmentOut(BaseModel):
    id: int
    participant_id: int
    participant_name: str
    support_worker_id: Optional[int] = None
    support_worker_name: Optional[str] = None
    start_time: str  # ISO format: 2025-01-20T09:00:00
    end_time: str    # ISO format: 2025-01-20T11:00:00
    service_type: str
    location: str
    status: str
    priority: Optional[str] = "medium"
    notes: Optional[str] = None
    recurring: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

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

class AppointmentUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    service_type: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None

@router.get("", response_model=List[AppointmentOut])
def get_appointments(
    db: Session = Depends(get_db),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    participant_id: Optional[int] = Query(None, description="Filter by participant ID"),
    support_worker_id: Optional[int] = Query(None, description="Filter by support worker ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page")
):
    """Get appointments (using roster data)"""
    try:
        # Build query with eager loading
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
            # Map appointment status to roster status
            roster_status = status.lower()
            if roster_status in ['pending']:
                roster_status = 'checked'
            elif roster_status in ['confirmed']:
                roster_status = 'confirmed'
            elif roster_status in ['cancelled']:
                roster_status = 'cancelled'
            filters.append(Roster.status == RosterStatus(roster_status))
        if participant_id:
            filters.append(
                Roster.participants.any(RosterParticipant.participant_id == participant_id)
            )
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Apply pagination
        rosters = query.order_by(Roster.support_date.desc(), Roster.start_time.asc())\
                      .offset((page - 1) * limit)\
                      .limit(limit)\
                      .all()
        
        # Transform rosters to appointments
        appointments = []
        for roster in rosters:
            # Get participant info
            participant = None
            if roster.participants:
                participant_id = roster.participants[0].participant_id
                participant = db.query(Participant).filter(Participant.id == participant_id).first()
            
            # Get support worker info
            support_worker = None
            if roster.worker_id:
                support_worker = db.query(User).filter(User.id == roster.worker_id).first()
            
            appointment = AppointmentOut(
                id=roster.id,
                participant_id=participant.id if participant else 0,
                participant_name=f"{participant.first_name} {participant.last_name}" if participant else "Unknown",
                support_worker_id=roster.worker_id,
                support_worker_name=support_worker.full_name if support_worker else "Unknown",
                start_time=f"{roster.support_date}T{roster.start_time}",
                end_time=f"{roster.support_date}T{roster.end_time}",
                service_type=roster.eligibility or "General Support",
                location="Home Visit",  # Default location
                status=roster.status.value,
                notes=roster.notes,
                recurring=bool(roster.recurrences),
                created_at=roster.created_at,
                updated_at=roster.updated_at
            )
            appointments.append(appointment)
        
        logger.info(f"Retrieved {len(appointments)} appointments")
        return appointments
        
    except Exception as e:
        logger.error(f"Error retrieving appointments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve appointments: {str(e)}"
        )

@router.get("/{appointment_id}", response_model=AppointmentOut)
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
        
        # Get participant info
        participant = None
        if roster.participants:
            participant_id = roster.participants[0].participant_id
            participant = db.query(Participant).filter(Participant.id == participant_id).first()
        
        # Get support worker info
        support_worker = None
        if roster.worker_id:
            support_worker = db.query(User).filter(User.id == roster.worker_id).first()
        
        appointment = AppointmentOut(
            id=roster.id,
            participant_id=participant.id if participant else 0,
            participant_name=f"{participant.first_name} {participant.last_name}" if participant else "Unknown",
            support_worker_id=roster.worker_id,
            support_worker_name=support_worker.full_name if support_worker else "Unknown",
            start_time=f"{roster.support_date}T{roster.start_time}",
            end_time=f"{roster.support_date}T{roster.end_time}",
            service_type=roster.eligibility or "General Support",
            location="Home Visit",
            status=roster.status.value,
            notes=roster.notes,
            recurring=bool(roster.recurrences),
            created_at=roster.created_at,
            updated_at=roster.updated_at
        )
        
        return appointment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving appointment {appointment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve appointment: {str(e)}"
        )

@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_data: AppointmentCreate, 
    db: Session = Depends(get_db)
):
    """Create a new appointment (creates roster entry)"""
    try:
        # Parse datetime
        start_dt = datetime.fromisoformat(appointment_data.start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(appointment_data.end_time.replace('Z', '+00:00'))
        
        # Create roster entry
        roster = Roster(
            worker_id=appointment_data.support_worker_id,
            support_date=start_dt.date(),
            start_time=start_dt.time(),
            end_time=end_dt.time(),
            eligibility=appointment_data.service_type,
            notes=appointment_data.notes,
            status=RosterStatus.checked,  # New appointments start as 'checked' (pending)
            is_group_support=False
        )
        
        db.add(roster)
        db.flush()  # Get ID
        
        # Add participant
        roster_participant = RosterParticipant(
            roster_id=roster.id,
            participant_id=appointment_data.participant_id
        )
        db.add(roster_participant)
        
        db.commit()
        db.refresh(roster)
        
        # Get participant and support worker for response
        participant = db.query(Participant).filter(Participant.id == appointment_data.participant_id).first()
        support_worker = db.query(User).filter(User.id == appointment_data.support_worker_id).first()
        
        appointment = AppointmentOut(
            id=roster.id,
            participant_id=appointment_data.participant_id,
            participant_name=f"{participant.first_name} {participant.last_name}" if participant else "Unknown",
            support_worker_id=appointment_data.support_worker_id,
            support_worker_name=support_worker.full_name if support_worker else "Unknown",
            start_time=appointment_data.start_time,
            end_time=appointment_data.end_time,
            service_type=appointment_data.service_type,
            location=appointment_data.location or "Home Visit",
            status="checked",
            notes=appointment_data.notes,
            recurring=appointment_data.recurring or False,
            created_at=roster.created_at,
            updated_at=roster.updated_at
        )
        
        logger.info(f"Created appointment {roster.id}")
        return appointment
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating appointment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create appointment: {str(e)}"
        )

@router.put("/{appointment_id}", response_model=AppointmentOut)
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
        
        # Update fields
        update_data = appointment_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'start_time' and value:
                start_dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                roster.support_date = start_dt.date()
                roster.start_time = start_dt.time()
            elif field == 'end_time' and value:
                end_dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                roster.end_time = end_dt.time()
            elif field == 'service_type':
                roster.eligibility = value
            elif field == 'status':
                # Map appointment status to roster status
                if value.lower() == 'pending':
                    roster.status = RosterStatus.checked
                elif value.lower() == 'confirmed':
                    roster.status = RosterStatus.confirmed
                elif value.lower() == 'cancelled':
                    roster.status = RosterStatus.cancelled
            elif hasattr(roster, field):
                setattr(roster, field, value)
        
        roster.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(roster)
        
        # Return updated appointment
        return get_appointment(appointment_id, db)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating appointment {appointment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update appointment: {str(e)}"
        )

@router.delete("/{appointment_id}", status_code=204)
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
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting appointment {appointment_id}: {str(e)}")
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
        
        # Count pending requests (checked status)
        pending_requests = db.query(Roster).filter(
            Roster.status == RosterStatus.checked
        ).count()
        
        # Count unique support workers with schedules
        support_workers_scheduled = db.query(func.count(func.distinct(Roster.worker_id))).scalar() or 0
        
        # Count unique participants with schedules
        participants_scheduled = db.query(func.count(func.distinct(RosterParticipant.participant_id)))\
            .join(Roster)\
            .scalar() or 0
        
        # Calculate this week's hours
        week_rosters = db.query(Roster).filter(
            and_(
                Roster.support_date >= week_start,
                Roster.support_date <= week_end
            )
        ).all()
        
        this_week_hours = 0
        for roster in week_rosters:
            start_dt = datetime.combine(roster.support_date, roster.start_time)
            end_dt = datetime.combine(roster.support_date, roster.end_time)
            duration = (end_dt - start_dt).total_seconds() / 3600
            this_week_hours += duration
        
        return {
            "total_appointments": total_appointments,
            "today_appointments": today_appointments,
            "pending_requests": pending_requests,
            "support_workers_scheduled": support_workers_scheduled,
            "participants_scheduled": participants_scheduled,
            "this_week_hours": round(this_week_hours, 1)
        }
        
    except Exception as e:
        logger.error(f"Error getting appointment stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get appointment stats: {str(e)}"
        )