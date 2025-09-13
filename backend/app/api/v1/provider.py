# backend/app/api/v1/provider.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.referral import Referral
from app.schemas.provider import ReferralOut

# ✅ Define the router here
router = APIRouter()

@router.get("/referrals", response_model=List[ReferralOut])
def get_recent_referrals(db: Session = Depends(get_db)):
    referrals = (
        db.query(Referral)
        .order_by(Referral.created_at.desc())
        .limit(10)
        .all()
    )

    # ✅ Convert ORM → Pydantic
    def map_to_out(referral: Referral) -> ReferralOut:
        return ReferralOut(
            id=str(referral.id),
            firstName=referral.first_name,
            lastName=referral.last_name,
            dateOfBirth=referral.date_of_birth,
            phoneNumber=referral.phone_number,
            emailAddress=referral.email_address,
            streetAddress=referral.street_address,
            created_at=referral.created_at,
            updated_at=referral.updated_at,
        )

    return [map_to_out(r) for r in referrals]
