# backend/app/api/v1/providers.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from app.core.database import get_db
from app.models.user import User, UserRole, ServiceType
from app.models.referral import Referral
from app.api.v1.auth import get_current_active_user
from app.schemas.provider import (
    ProviderDashboardResponse, 
    ProviderReferralResponse, 
    ReferralStatusUpdate,
    ProviderScheduleResponse,
    ProviderAvailabilityCreate,
    ProviderAvailabilityResponse
)
from app.services.provider_service import ProviderService

router = APIRouter()

@router.get("/dashboard", response_model=ProviderDashboardResponse)
async def get_provider_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get provider dashboard statistics and overview"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    return ProviderService.get_dashboard_data(db, current_user.id)


@router.get("/referrals", response_model=List[ProviderReferralResponse])
async def get_provider_referrals(
    status_filter: Optional[str] = Query(None, description="Filter by referral status"),
    service_type: Optional[str] = Query(None, description="Filter by service type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get referrals assigned to this provider"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    return ProviderService.get_provider_referrals(
        db, current_user.id, status_filter, service_type, skip, limit
    )


@router.put("/referrals/{referral_id}/status", response_model=dict)
async def update_referral_status(
    referral_id: int,
    status_update: ReferralStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update referral status and add provider notes"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    success = ProviderService.update_referral_status(
        db, referral_id, current_user.id, status_update
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found or access denied"
        )
    
    return {"message": "Referral status updated successfully"}


@router.get("/referrals/{referral_id}", response_model=ProviderReferralResponse)
async def get_referral_details(
    referral_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed referral information"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    referral = ProviderService.get_referral_details(db, referral_id, current_user.id)
    
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found or access denied"
        )
    
    return referral


@router.post("/referrals/{referral_id}/accept")
async def accept_referral(
    referral_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Accept a referral assignment"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    success = ProviderService.accept_referral(db, referral_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found or already accepted"
        )
    
    return {"message": "Referral accepted successfully"}


@router.post("/referrals/{referral_id}/decline")
async def decline_referral(
    referral_id: int,
    reason: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Decline a referral with reason"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    success = ProviderService.decline_referral(db, referral_id, current_user.id, reason)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    
    return {"message": "Referral declined successfully"}


@router.get("/schedule", response_model=List[ProviderScheduleResponse])
async def get_provider_schedule(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get provider's schedule and appointments"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    return ProviderService.get_provider_schedule(
        db, current_user.id, start_date, end_date
    )


@router.post("/availability", response_model=ProviderAvailabilityResponse)
async def set_provider_availability(
    availability: ProviderAvailabilityCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Set provider availability for scheduling"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    return ProviderService.set_availability(db, current_user.id, availability)


@router.get("/availability", response_model=List[ProviderAvailabilityResponse])
async def get_provider_availability(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get provider's current availability settings"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    return ProviderService.get_availability(db, current_user.id)


@router.get("/participants", response_model=List[dict])
async def get_provider_participants(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all participants assigned to this provider"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    return ProviderService.get_provider_participants(db, current_user.id)


@router.get("/performance", response_model=dict)
async def get_provider_performance(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get provider performance metrics and statistics"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    return ProviderService.get_performance_metrics(db, current_user.id)


@router.put("/profile", response_model=dict)
async def update_provider_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update provider profile information"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    success = ProviderService.update_profile(db, current_user.id, profile_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update profile"
        )
    
    return {"message": "Profile updated successfully"}


@router.get("/notifications", response_model=List[dict])
async def get_provider_notifications(
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get provider notifications"""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Provider role required."
        )
    
    return ProviderService.get_notifications(db, current_user.id, unread_only)