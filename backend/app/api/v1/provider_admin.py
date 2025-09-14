# backend/app/api/v1/provider_admin.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from app.core.database import get_db
from app.models.user import User, UserRole, ServiceType
from app.models.referral import Referral
from app.api.v1.auth import get_current_active_user
from app.schemas.provider import ProviderReferralResponse
from app.services.provider_admin_service import ProviderAdminService

router = APIRouter()

def require_admin_or_coordinator(current_user: User):
    """Ensure user has admin or coordinator privileges"""
    if current_user.role not in [UserRole.ADMIN, UserRole.PROVIDER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or coordinator access required"
        )

@router.get("/providers", response_model=List[Dict[str, Any]])
async def get_all_providers(
    active_only: bool = Query(True),
    service_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all providers with their statistics (Admin only)"""
    require_admin_or_coordinator(current_user)
    
    return ProviderAdminService.get_all_providers(db, active_only, service_type)

@router.get("/providers/{provider_id}/dashboard", response_model=Dict[str, Any])
async def get_provider_dashboard_admin(
    provider_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get provider dashboard data for admin oversight"""
    require_admin_or_coordinator(current_user)
    
    dashboard_data = ProviderAdminService.get_provider_dashboard_admin(db, provider_id)
    
    if not dashboard_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    return dashboard_data

@router.get("/referrals/unassigned", response_model=List[ProviderReferralResponse])
async def get_unassigned_referrals(
    service_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all unassigned referrals for assignment"""
    require_admin_or_coordinator(current_user)
    
    return ProviderAdminService.get_unassigned_referrals(
        db, service_type, priority, skip, limit
    )

@router.post("/referrals/{referral_id}/assign")
async def assign_referral_to_provider(
    referral_id: int,
    provider_id: int,
    priority: Optional[str] = "medium",
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Assign a referral to a specific provider"""
    require_admin_or_coordinator(current_user)
    
    success = ProviderAdminService.assign_referral_to_provider(
        db, referral_id, provider_id, priority, notes, current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to assign referral. Provider may not handle this service type."
        )
    
    return {"message": "Referral assigned successfully"}

@router.post("/referrals/{referral_id}/reassign")
async def reassign_referral(
    referral_id: int,
    new_provider_id: int,
    reason: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Reassign a referral from one provider to another"""
    require_admin_or_coordinator(current_user)
    
    success = ProviderAdminService.reassign_referral(
        db, referral_id, new_provider_id, reason, current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reassign referral"
        )
    
    return {"message": "Referral reassigned successfully"}

@router.get("/referrals/overdue", response_model=List[Dict[str, Any]])
async def get_overdue_referrals(
    days_overdue: int = Query(7, ge=1),
    provider_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get referrals that are overdue for response or completion"""
    require_admin_or_coordinator(current_user)
    
    return ProviderAdminService.get_overdue_referrals(db, days_overdue, provider_id)

@router.get("/providers/{provider_id}/performance", response_model=Dict[str, Any])
async def get_provider_performance_admin(
    provider_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed provider performance metrics for admin review"""
    require_admin_or_coordinator(current_user)
    
    performance = ProviderAdminService.get_provider_performance_detailed(
        db, provider_id, start_date, end_date
    )
    
    if not performance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    return performance

@router.get("/analytics/workload", response_model=Dict[str, Any])
async def get_provider_workload_analytics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get workload distribution analytics across all providers"""
    require_admin_or_coordinator(current_user)
    
    return ProviderAdminService.get_workload_analytics(db)

@router.get("/analytics/performance-summary", response_model=Dict[str, Any])
async def get_performance_summary(
    period_days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get overall performance summary for all providers"""
    require_admin_or_coordinator(current_user)
    
    return ProviderAdminService.get_performance_summary(db, period_days)

@router.post("/providers/{provider_id}/activate")
async def activate_provider(
    provider_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Activate a provider account"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    success = ProviderAdminService.update_provider_status(db, provider_id, True)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    return {"message": "Provider activated successfully"}

@router.post("/providers/{provider_id}/deactivate")
async def deactivate_provider(
    provider_id: int,
    reason: str,
    reassign_referrals: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Deactivate a provider account"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    result = ProviderAdminService.deactivate_provider(
        db, provider_id, reason, reassign_referrals, current_user.id
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return result

@router.get("/providers/{provider_id}/referrals", response_model=List[ProviderReferralResponse])
async def get_provider_referrals_admin(
    provider_id: int,
    status_filter: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all referrals for a specific provider (admin view)"""
    require_admin_or_coordinator(current_user)
    
    return ProviderAdminService.get_provider_referrals_admin(
        db, provider_id, status_filter, start_date, end_date, skip, limit
    )

@router.post("/referrals/bulk-assign")
async def bulk_assign_referrals(
    referral_ids: List[int],
    provider_id: int,
    priority: Optional[str] = "medium",
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Bulk assign multiple referrals to a provider"""
    require_admin_or_coordinator(current_user)
    
    result = ProviderAdminService.bulk_assign_referrals(
        db, referral_ids, provider_id, priority, notes, current_user.id
    )
    
    return result

@router.get("/providers/{provider_id}/capacity", response_model=Dict[str, Any])
async def get_provider_capacity(
    provider_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get provider's current capacity and availability"""
    require_admin_or_coordinator(current_user)
    
    capacity = ProviderAdminService.get_provider_capacity(db, provider_id)
    
    if not capacity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    return capacity

@router.get("/referrals/assignment-suggestions")
async def get_assignment_suggestions(
    referral_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get suggested providers for a referral based on service type, location, and capacity"""
    require_admin_or_coordinator(current_user)
    
    suggestions = ProviderAdminService.get_assignment_suggestions(db, referral_id)
    
    if not suggestions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No suitable providers found for this referral"
        )
    
    return suggestions

@router.get("/alerts/provider-issues", response_model=List[Dict[str, Any]])
async def get_provider_alerts(
    severity: Optional[str] = Query(None),  # low, medium, high, critical
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get alerts about provider issues (overdue responses, high cancellation rates, etc.)"""
    require_admin_or_coordinator(current_user)
    
    return ProviderAdminService.get_provider_alerts(db, severity)

@router.post("/providers/{provider_id}/send-notification")
async def send_notification_to_provider(
    provider_id: int,
    notification_type: str,
    title: str,
    message: str,
    priority: Optional[str] = "medium",
    action_required: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a notification to a specific provider"""
    require_admin_or_coordinator(current_user)
    
    success = ProviderAdminService.send_notification_to_provider(
        db, provider_id, notification_type, title, message, 
        priority, action_required, current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    return {"message": "Notification sent successfully"}

@router.get("/reports/provider-summary", response_model=Dict[str, Any])
async def generate_provider_summary_report(
    start_date: date,
    end_date: date,
    provider_ids: Optional[List[int]] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate comprehensive provider performance report"""
    require_admin_or_coordinator(current_user)
    
    if not provider_ids:
        # Get all active providers if none specified
        providers = db.query(User).filter(
            User.role == UserRole.PROVIDER,
            User.is_active == True
        ).all()
        provider_ids = [p.id for p in providers]
    
    report = ProviderAdminService.generate_provider_summary_report(
        db, start_date, end_date, provider_ids
    )
    
    return report

@router.get("/providers/{provider_id}/timeline", response_model=List[Dict[str, Any]])
async def get_provider_activity_timeline(
    provider_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get provider activity timeline for admin review"""
    require_admin_or_coordinator(current_user)
    
    timeline = ProviderAdminService.get_provider_timeline(
        db, provider_id, start_date, end_date, limit
    )
    
    return timeline

@router.post("/providers/{provider_id}/performance-review")
async def create_performance_review(
    provider_id: int,
    review_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a performance review for a provider"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    success = ProviderAdminService.create_performance_review(
        db, provider_id, review_data, current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create performance review"
        )
    
    return {"message": "Performance review created successfully"}

@router.get("/dashboard/summary", response_model=Dict[str, Any])
async def get_admin_dashboard_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get summary data for admin dashboard"""
    require_admin_or_coordinator(current_user)
    
    return ProviderAdminService.get_admin_dashboard_summary(db)