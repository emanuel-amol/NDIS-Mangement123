# backend/app/api/v1/endpoints/roster.py - QUICK FIX VERSION
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text
from datetime import date, time, datetime, timedelta
from typing import List, Optional, Dict, Any
import logging
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps_admin_key import require_admin_key
from app.models.roster import (
    Roster, RosterParticipant, RosterTask, RosterWorkerNote, RosterRecurrence,
    RosterInstance, RosterStatus
)
from app.schemas.roster import (
    RosterCreate, RosterUpdate, RosterOut, RosterStatus as RosterStatusSchema
)
from app.services.recurrence_service import generate_daily, generate_weekly, generate_monthly

router = APIRouter(dependencies=[Depends(require_admin_key)])
logger = logging.getLogger(__name__)

# Simplified dynamic models to avoid import issues
class RosterWithMetrics(BaseModel):
    id: int
    worker_id: Optional[int] = None
    support_date: date
    start_time: time
    end_time: time
    eligibility: Optional[str] = None
    notes: Optional[str] = None
    status: RosterStatusSchema
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
    
    # Related data
    participants: List[Dict[str, Any]] = []
    tasks: List[Dict[str, Any]] = []
    worker_notes: List[Dict[str, Any]] = []
    
    class Config:
        from_attributes = True

@router.get("", response_model=List[RosterWithMetrics])
def list_rosters(
    db: Session = Depends(get_db),
    start: Optional[date] = Query(None, description="Start date filter"),
    end: Optional[date] = Query(None, description="End date filter"),
    worker_id: Optional[int] = Query(None, description="Filter by worker ID"),
    participant_id: Optional[int] = Query(None, description="Filter by participant ID"),
    status: Optional[RosterStatusSchema] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page")
):
    """Get rosters with dynamic filtering"""
    try:
        # Build dynamic query with eager loading
        query = db.query(Roster).options(
            joinedload(Roster.participants),
            joinedload(Roster.tasks),
            joinedload(Roster.worker_notes),
            joinedload(Roster.recurrences),
            joinedload(Roster.instances)
        )
        
        # Apply filters dynamically
        filters = []
        if start:
            filters.append(Roster.support_date >= start)
        if end:
            filters.append(Roster.support_date <= end)
        if worker_id:
            filters.append(Roster.worker_id == worker_id)
        if status:
            filters.append(Roster.status == RosterStatus(status))
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
        
        # Enhance with dynamic metrics
        enhanced_rosters = []
        for roster in rosters:
            enhanced_roster = enhance_roster_with_metrics(db, roster)
            enhanced_rosters.append(enhanced_roster)
        
        logger.info(f"Retrieved {len(enhanced_rosters)} rosters")
        return enhanced_rosters
        
    except Exception as e:
        logger.error(f"Error retrieving rosters: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve rosters: {str(e)}"
        )

@router.post("", response_model=RosterWithMetrics, status_code=status.HTTP_201_CREATED)
async def create_roster(
    payload: RosterCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new roster"""
    try:
        # Create main roster record
        roster = Roster(
            service_org_id=payload.service_org_id,
            service_id=payload.service_id,
            vehicle_id=payload.vehicle_id,
            worker_id=payload.worker_id,
            support_date=payload.support_date,
            start_time=payload.start_time,
            end_time=payload.end_time,
            quantity=payload.quantity,
            ratio_worker_to_participant=payload.ratio_worker_to_participant,
            eligibility=payload.eligibility,
            transport_km=payload.transport_km,
            transport_worker_expenses=payload.transport_worker_expenses,
            transport_non_labour=payload.transport_non_labour,
            notes=payload.notes,
            status=RosterStatus(payload.status) if payload.status else RosterStatus.checked,
            is_group_support=payload.is_group_support or False
        )
        
        db.add(roster)
        db.flush()  # Get ID without committing
        
        # Add participants
        for p in payload.participants:
            roster_participant = RosterParticipant(
                roster_id=roster.id,
                participant_id=p.participant_id
            )
            db.add(roster_participant)
        
        # Add tasks
        for t in (payload.tasks or []):
            roster_task = RosterTask(
                roster_id=roster.id,
                title=t.title,
                is_done=t.is_done or False
            )
            db.add(roster_task)
        
        # Add worker notes
        for n in (payload.worker_notes or []):
            roster_note = RosterWorkerNote(
                roster_id=roster.id,
                note=n.note,
                created_at=datetime.utcnow()
            )
            db.add(roster_note)
        
        # Handle recurrence patterns
        if payload.recurrences:
            for r in payload.recurrences:
                recurrence = RosterRecurrence(
                    roster_id=roster.id,
                    pattern_type=r.pattern_type.value,
                    interval=r.interval,
                    by_weekdays=",".join(map(str, r.by_weekdays)) if r.by_weekdays else None,
                    by_monthday=r.by_monthday,
                    by_setpos=r.by_setpos,
                    by_weekday=r.by_weekday,
                    start_date=r.start_date,
                    end_date=r.end_date
                )
                db.add(recurrence)
                db.flush()
                
                # Generate instances based on pattern
                dates = generate_recurrence_dates(r)
                for occurrence_date in dates:
                    instance = RosterInstance(
                        roster_id=roster.id,
                        occurrence_date=occurrence_date,
                        start_time=roster.start_time,
                        end_time=roster.end_time
                    )
                    db.add(instance)
        
        db.commit()
        db.refresh(roster)
        
        # Enhance with metrics
        enhanced_roster = enhance_roster_with_metrics(db, roster)
        
        logger.info(f"Created roster {roster.id}")
        return enhanced_roster
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating roster: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create roster: {str(e)}"
        )

@router.get("/{roster_id}", response_model=RosterWithMetrics)
def get_roster(roster_id: int, db: Session = Depends(get_db)):
    """Get a specific roster"""
    try:
        roster = db.query(Roster).options(
            joinedload(Roster.participants),
            joinedload(Roster.tasks),
            joinedload(Roster.worker_notes),
            joinedload(Roster.recurrences),
            joinedload(Roster.instances)
        ).filter(Roster.id == roster_id).first()
        
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster {roster_id} not found"
            )
        
        enhanced_roster = enhance_roster_with_metrics(db, roster)
        return enhanced_roster
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving roster {roster_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve roster: {str(e)}"
        )

@router.put("/{roster_id}", response_model=RosterWithMetrics)
def update_roster(
    roster_id: int,
    payload: RosterUpdate,
    db: Session = Depends(get_db)
):
    """Update a roster"""
    try:
        roster = db.query(Roster).filter(Roster.id == roster_id).first()
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster {roster_id} not found"
            )
        
        # Update fields
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(roster, field):
                setattr(roster, field, value)
        
        # Update timestamp
        roster.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(roster)
        
        # Enhance with metrics
        enhanced_roster = enhance_roster_with_metrics(db, roster)
        
        logger.info(f"Updated roster {roster_id}")
        return enhanced_roster
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating roster {roster_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update roster: {str(e)}"
        )

@router.delete("/{roster_id}", status_code=204)
def delete_roster(roster_id: int, db: Session = Depends(get_db)):
    """Delete a roster"""
    try:
        roster = db.query(Roster).filter(Roster.id == roster_id).first()
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster {roster_id} not found"
            )
        
        db.delete(roster)
        db.commit()
        
        logger.info(f"Deleted roster {roster_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting roster {roster_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete roster: {str(e)}"
        )

# Helper functions
def enhance_roster_with_metrics(db: Session, roster: Roster) -> RosterWithMetrics:
    """Enhance a roster with dynamic metrics"""
    duration_hours = calculate_duration_hours(roster.start_time, roster.end_time)
    
    # Calculate completion percentage
    total_tasks = len(roster.tasks) if roster.tasks else 0
    completed_tasks = len([t for t in roster.tasks if t.is_done]) if roster.tasks else 0
    completion_percentage = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0
    
    # Determine real-time status
    real_time_status = get_real_time_status(roster)
    
    # Get participant count
    participant_count = len(roster.participants) if roster.participants else 0
    
    # Convert related objects to dictionaries
    participants_data = []
    if roster.participants:
        for p in roster.participants:
            participants_data.append({
                "participant_id": p.participant_id,
                "name": f"Participant {p.participant_id}",
                "phone": None
            })
    
    tasks_data = []
    if roster.tasks:
        tasks_data = [
            {
                "title": t.title,
                "is_done": t.is_done,
                "id": getattr(t, 'id', None)
            }
            for t in roster.tasks
        ]
    
    worker_notes_data = []
    if roster.worker_notes:
        worker_notes_data = [
            {
                "note": n.note,
                "created_at": n.created_at.isoformat() if n.created_at else None,
                "id": getattr(n, 'id', None)
            }
            for n in roster.worker_notes
        ]
    
    return RosterWithMetrics(
        id=roster.id,
        worker_id=roster.worker_id,
        support_date=roster.support_date,
        start_time=roster.start_time,
        end_time=roster.end_time,
        eligibility=roster.eligibility,
        notes=roster.notes,
        status=RosterStatusSchema(roster.status.value),
        is_group_support=roster.is_group_support or False,
        created_at=roster.created_at,
        updated_at=roster.updated_at,
        duration_hours=duration_hours,
        completion_percentage=completion_percentage,
        real_time_status=real_time_status,
        participant_count=participant_count,
        tasks_completed=completed_tasks,
        tasks_total=total_tasks,
        participants=participants_data,
        tasks=tasks_data,
        worker_notes=worker_notes_data
    )

def calculate_duration_hours(start_time: time, end_time: time) -> float:
    """Calculate duration in hours between two times"""
    start_datetime = datetime.combine(date.today(), start_time)
    end_datetime = datetime.combine(date.today(), end_time)
    duration = end_datetime - start_datetime
    return duration.total_seconds() / 3600

def get_real_time_status(roster: Roster) -> str:
    """Determine real-time status based on current time and roster schedule"""
    now = datetime.now()
    roster_start = datetime.combine(roster.support_date, roster.start_time)
    roster_end = datetime.combine(roster.support_date, roster.end_time)
    
    if now < roster_start:
        return "scheduled"
    elif roster_start <= now <= roster_end:
        return "in_progress"
    elif now > roster_end:
        return "completed" if roster.status == RosterStatus.confirmed else "overdue"
    else:
        return "scheduled"

def generate_recurrence_dates(recurrence) -> List[date]:
    """Generate dates based on recurrence pattern"""
    if recurrence.pattern_type.value == "daily":
        return generate_daily(recurrence.start_date, recurrence.end_date, recurrence.interval)
    elif recurrence.pattern_type.value == "weekly":
        return generate_weekly(
            recurrence.start_date, 
            recurrence.end_date, 
            recurrence.interval, 
            recurrence.by_weekdays or []
        )
    elif recurrence.pattern_type.value == "monthly":
        return generate_monthly(
            recurrence.start_date,
            recurrence.end_date,
            recurrence.interval,
            recurrence.by_monthday,
            recurrence.by_setpos,
            recurrence.by_weekday
        )
    return []