from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.vaccination import (
    VaccinationCreate,
    VaccinationUpdate,
    VaccinationOut,
)
from app.services.vaccination_service import VaccinationService


router = APIRouter(prefix="/participants/{participant_id}/vaccinations", tags=["vaccinations"])


@router.get("/", response_model=List[VaccinationOut])
def list_vaccinations(participant_id: int, db: Session = Depends(get_db)):
    try:
        records = VaccinationService.list_for_participant(db, participant_id)
        return records
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/", response_model=VaccinationOut, status_code=status.HTTP_201_CREATED)
def create_vaccination(participant_id: int, payload: VaccinationCreate, db: Session = Depends(get_db)):
    try:
        record = VaccinationService.create(db, participant_id, payload)
        return record
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to create vaccination: {e}")


@router.get("/{vaccination_id}", response_model=VaccinationOut)
def get_vaccination(participant_id: int, vaccination_id: int, db: Session = Depends(get_db)):
    record = VaccinationService.get(db, participant_id, vaccination_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vaccination record not found")
    return record


@router.put("/{vaccination_id}", response_model=VaccinationOut)
def update_vaccination(
    participant_id: int,
    vaccination_id: int,
    payload: VaccinationUpdate,
    db: Session = Depends(get_db),
):
    record = VaccinationService.update(db, participant_id, vaccination_id, payload)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vaccination record not found")
    return record


@router.delete("/{vaccination_id}")
def delete_vaccination(participant_id: int, vaccination_id: int, db: Session = Depends(get_db)):
    deleted = VaccinationService.delete(db, participant_id, vaccination_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vaccination record not found")
    return {"message": "Vaccination record deleted"}

