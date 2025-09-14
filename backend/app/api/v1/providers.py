from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.referral import Referral
from app.schemas.referral import ReferralOut, ReferralStatusUpdate as ReferralUpdateStatus

router = APIRouter(prefix="/providers", tags=["providers"])

@router.get("/referrals", response_model=list[ReferralOut])
def list_referrals(db: Session = Depends(get_db)):
    rows = db.query(Referral).order_by(Referral.id.desc()).all()
    return rows

@router.put("/referrals/{referral_id}/status", response_model=ReferralOut)
def update_referral_status(referral_id: int, payload: ReferralUpdateStatus, db: Session = Depends(get_db)):
    row = db.query(Referral).get(referral_id)
    if not row:
        raise HTTPException(status_code=404, detail="Referral not found")
    row.status = payload.status  # e.g., "VALIDATED"
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
