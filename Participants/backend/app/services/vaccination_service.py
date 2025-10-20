from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.vaccination import VaccinationRecord
from app.models.participant import Participant
from app.schemas.vaccination import VaccinationCreate, VaccinationUpdate


class VaccinationService:
    @staticmethod
    def _assert_participant(db: Session, participant_id: int) -> Participant:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise ValueError("Participant not found")
        return participant

    @staticmethod
    def list_for_participant(db: Session, participant_id: int) -> List[VaccinationRecord]:
        VaccinationService._assert_participant(db, participant_id)
        return (
            db.query(VaccinationRecord)
            .filter(VaccinationRecord.participant_id == participant_id)
            .order_by(VaccinationRecord.date_administered.desc(), VaccinationRecord.id.desc())
            .all()
        )

    @staticmethod
    def get(db: Session, participant_id: int, vaccination_id: int) -> Optional[VaccinationRecord]:
        return (
            db.query(VaccinationRecord)
            .filter(
                and_(
                    VaccinationRecord.id == vaccination_id,
                    VaccinationRecord.participant_id == participant_id,
                )
            )
            .first()
        )

    @staticmethod
    def create(db: Session, participant_id: int, payload: VaccinationCreate) -> VaccinationRecord:
        VaccinationService._assert_participant(db, participant_id)
        record = VaccinationRecord(
            participant_id=participant_id,
            vaccine_name=payload.vaccine_name,
            brand=payload.brand,
            dose_number=payload.dose_number,
            date_administered=payload.date_administered,
            lot_number=payload.lot_number,
            provider=payload.provider,
            notes=payload.notes,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def update(
        db: Session, participant_id: int, vaccination_id: int, payload: VaccinationUpdate
    ) -> Optional[VaccinationRecord]:
        record = VaccinationService.get(db, participant_id, vaccination_id)
        if not record:
            return None
        data = payload.dict(exclude_unset=True)
        for field, value in data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def delete(db: Session, participant_id: int, vaccination_id: int) -> bool:
        record = VaccinationService.get(db, participant_id, vaccination_id)
        if not record:
            return False
        db.delete(record)
        db.commit()
        return True

