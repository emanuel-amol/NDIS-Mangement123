# backend/app/api/v1/endpoints/roster.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date, time
from typing import List, Optional

from app.core.database import get_db
from app.api.deps_admin_key import require_admin_key
from app.models.roster import (
    Roster, RosterParticipant, RosterTask, RosterWorkerNote, RosterRecurrence,
    RosterInstance, RosterStatus
)
from app.schemas.roster import RosterCreate, RosterUpdate, RosterOut, RosterStatus as RosterStatusSchema, RecurrenceType
from app.services.recurrence_service import generate_daily, generate_weekly, generate_monthly

router = APIRouter(dependencies=[Depends(require_admin_key)])

@router.get("", response_model=List[RosterOut])
def list_rosters(
    db: Session = Depends(get_db),
    start: Optional[date] = Query(None),
    end: Optional[date] = Query(None),
    worker_id: Optional[int] = None,
    participant_id: Optional[int] = None,
    status: Optional[RosterStatusSchema] = None
):
    q = db.query(Roster)
    if start: q = q.filter(Roster.support_date >= start)
    if end: q = q.filter(Roster.support_date <= end)
    if worker_id: q = q.filter(Roster.worker_id == worker_id)
    if participant_id:
        q = q.join(Roster.participants).filter(RosterParticipant.participant_id == participant_id)
    if status: q = q.filter(Roster.status == RosterStatus(status))
    return q.order_by(Roster.support_date, Roster.start_time).all()

@router.post("", response_model=RosterOut, status_code=status.HTTP_201_CREATED)
def create_roster(payload: RosterCreate, db: Session = Depends(get_db)):
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
        status=RosterStatus(payload.status),
        is_group_support=payload.is_group_support
    )
    db.add(roster); db.flush()

    # participants
    for p in payload.participants:
        db.add(RosterParticipant(roster_id=roster.id, participant_id=p.participant_id))

    # tasks
    for t in payload.tasks or []:
        db.add(RosterTask(roster_id=roster.id, title=t.title, is_done=t.is_done))

    # worker notes
    for n in payload.worker_notes or []:
        db.add(RosterWorkerNote(roster_id=roster.id, note=n.note))

    # recurrences -> persist pattern + generate instances
    for r in payload.recurrences or []:
        rec = RosterRecurrence(
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
        db.add(rec)
        # generate instances
        dates = []
        if r.pattern_type.value == "daily":
            dates = generate_daily(r.start_date, r.end_date, r.interval)
        elif r.pattern_type.value == "weekly":
            dates = generate_weekly(r.start_date, r.end_date, r.interval, r.by_weekdays or [])
        elif r.pattern_type.value == "monthly":
            dates = generate_monthly(r.start_date, r.end_date, r.interval, r.by_monthday, r.by_setpos, r.by_weekday)

        for d in dates:
            db.add(RosterInstance(
                roster_id=roster.id, occurrence_date=d,
                start_time=roster.start_time, end_time=roster.end_time
            ))

    db.commit(); db.refresh(roster)
    return roster

@router.get("/{roster_id}", response_model=RosterOut)
def get_roster(roster_id: int, db: Session = Depends(get_db)):
    obj = db.query(Roster).filter(Roster.id == roster_id).first()
    if not obj: raise HTTPException(404, "Roster not found")
    return obj

@router.put("/{roster_id}", response_model=RosterOut)
def update_roster(roster_id: int, payload: RosterUpdate, db: Session = Depends(get_db)):
    obj = db.query(Roster).filter(Roster.id == roster_id).first()
    if not obj: raise HTTPException(404, "Roster not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/{roster_id}", status_code=204)
def delete_roster(roster_id: int, db: Session = Depends(get_db)):
    obj = db.query(Roster).filter(Roster.id == roster_id).first()
    if not obj: raise HTTPException(404, "Roster not found")
    db.delete(obj); db.commit()
    return
