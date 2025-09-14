from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_


from app.core.database import get_db

from app.models.participants import Participant as ParticipantModel


router = APIRouter(prefix="/api/v1/participants", tags=["participants"])

class ParticipantOut(BaseModel):
  id: int
  full_name: str
  ndis_number: Optional[str] = None
  address: Optional[str] = None
  email: Optional[str] = None
  phone: Optional[str] = None
  class Config:
    orm_mode = True

@router.get("", response_model=List[ParticipantOut])
def list_participants(db: Session = Depends(get_db),
                      search: Optional[str] = None,
                      limit: int = 50,
                      offset: int = 0):
  q = db.query(ParticipantModel)
  if search:
    pat = f"%{search}%"
    try:
      cond = or_(
        ParticipantModel.full_name.ilike(pat),
        ParticipantModel.ndis_number.ilike(pat),
        ParticipantModel.address.ilike(pat),
      )
    except AttributeError:
      cond = or_(
        ParticipantModel.full_name.like(pat),
        ParticipantModel.ndis_number.like(pat),
        ParticipantModel.address.like(pat),
      )
    q = q.filter(cond)
  return q.order_by(ParticipantModel.id.desc()).offset(offset).limit(limit).all()

@router.get("/{participant_id}", response_model=ParticipantOut)
def get_participant(participant_id: int, db: Session = Depends(get_db)):
  row = db.query(ParticipantModel).get(participant_id)
  if not row:
    raise HTTPException(status_code=404, detail="Participant not found")
  return row
