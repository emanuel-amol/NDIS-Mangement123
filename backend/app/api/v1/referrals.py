from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.schemas.referral import ReferralCreate, ReferralResponse, ReferralUpdate
from app.services.referral_service import ReferralService

router = APIRouter()

@router.post("/referral", response_model=ReferralResponse, status_code=status.HTTP_201_CREATED)
async def submit_referral(
    referral_data: ReferralCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a new referral form (Public endpoint - no authentication required)
    This endpoint is used by the public referral form.
    """
    try:
        # Create the referral
        referral = ReferralService.create_referral(db, referral_data)
        
        # TODO: Send notification email to admin
        # TODO: Send confirmation email to client (if email provided)
        
        return referral
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating referral: {str(e)}"
        )

@router.get("/referrals", response_model=List[ReferralResponse])
async def get_referrals(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all referrals (Admin endpoint - requires authentication)
    """
    # TODO: Add authentication check here
    referrals = ReferralService.get_referrals(db, skip=skip, limit=limit, status=status_filter)
    return referrals

@router.get("/referrals/{referral_id}", response_model=ReferralResponse)
async def get_referral(
    referral_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific referral by ID (Admin endpoint)
    """
    # TODO: Add authentication check here
    referral = ReferralService.get_referral(db, referral_id)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    return referral

@router.put("/referrals/{referral_id}", response_model=ReferralResponse)
async def update_referral(
    referral_id: int,
    referral_update: ReferralUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a referral (Admin endpoint - for status updates, notes)
    """
    # TODO: Add authentication check here
    referral = ReferralService.update_referral(db, referral_id, referral_update)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    return referral

@router.delete("/referrals/{referral_id}")
async def delete_referral(
    referral_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a referral (Admin endpoint)
    """
    # TODO: Add authentication check here
    success = ReferralService.delete_referral(db, referral_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    return {"message": "Referral deleted successfully"}