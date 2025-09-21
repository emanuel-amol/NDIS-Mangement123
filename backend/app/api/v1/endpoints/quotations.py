from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.quotation import QuotationResponse
from app.services import quotation_service

router = APIRouter(prefix="/quotations", tags=["quotations"])


@router.post("/participants/{participant_id}/generate-from-care-plan", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def generate_from_care_plan(participant_id: int, db: Session = Depends(get_db)):
    try:
        q = quotation_service.generate_from_care_plan(db, participant_id=participant_id)
        return q
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/participants/{participant_id}", response_model=list[QuotationResponse])
def list_participant_quotations(participant_id: int, db: Session = Depends(get_db)):
    return quotation_service.list_by_participant(db, participant_id=participant_id)


@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    q = quotation_service.get_by_id(db, quotation_id)
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return q


@router.post("/{quotation_id}/finalise", response_model=QuotationResponse)
def finalise_quotation(quotation_id: int, db: Session = Depends(get_db)):
    try:
        return quotation_service.finalise(db, quotation_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
