# backend/app/services/provider_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date, time

from app.models.user import User, UserRole
from app.models.referral import Referral
from app.schemas.provider import (
    ProviderDashboardResponse, 
    ProviderReferralResponse, 
    ReferralStatusUpdate,
    ProviderScheduleResponse,
    ProviderAvailabilityCreate,
    ProviderAvailabilityResponse,
    ProviderPerformanceResponse,
    ParticipantSummary,
    ProviderNotificationResponse
)

class ProviderService:
    
    @staticmethod
    def get_dashboard_data(db: Session, provider_id: int) -> ProviderDashboardResponse:
        """Get provider dashboard statistics"""
        
        # Basic referral counts
        total_referrals = db.query(Referral).filter(
            Referral.assigned_provider_id == provider_id
        ).count()
        
        new_referrals = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status == "new"
            )
        ).count()
        
        accepted_referrals = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status.in_(["accepted", "in_progress"])
            )
        ).count()
        
        completed_referrals = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status == "completed"
            )
        ).count()
        
        # Get recent activity
        recent_activity = ProviderService._get_recent_activity(db, provider_id)
        
        return ProviderDashboardResponse(
            total_referrals=total_referrals,
            new_referrals=new_referrals,
            accepted_referrals=accepted_referrals,
            completed_referrals=completed_referrals,
            active_participants=accepted_referrals,
            performance_rating=4.8,
            recent_activity=recent_activity
        )
    
    @staticmethod
    def _get_recent_activity(db: Session, provider_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """Get recent activity for provider dashboard"""
        recent_referrals = db.query(Referral).filter(
            Referral.assigned_provider_id == provider_id
        ).order_by(desc(Referral.updated_at)).limit(limit).all()
        
        activity = []
        for referral in recent_referrals:
            activity.append({
                "id": referral.id,
                "type": "referral_update",
                "title": f"Referral #{referral.id} - {referral.first_name} {referral.last_name}",
                "description": f"Status: {referral.status.title()}",
                "timestamp": referral.updated_at or referral.created_at,
                "referral_id": referral.id
            })
        
        return activity
    
    @staticmethod
    def get_provider_referrals(
        db: Session, 
        provider_id: int, 
        status_filter: Optional[str] = None,
        service_type: Optional[str] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[ProviderReferralResponse]:
        """Get referrals assigned to provider with filtering"""
        
        query = db.query(Referral).filter(
            Referral.assigned_provider_id == provider_id
        )
        
        if status_filter:
            query = query.filter(Referral.status == status_filter)
            
        if service_type:
            query = query.filter(Referral.referred_for == service_type)
        
        referrals = query.order_by(desc(Referral.created_at)).offset(skip).limit(limit).all()
        
        return [ProviderService._referral_to_response(referral) for referral in referrals]
    
    @staticmethod
    def _referral_to_response(referral: Referral) -> ProviderReferralResponse:
        """Convert Referral model to ProviderReferralResponse"""
        return ProviderReferralResponse(
            id=referral.id,
            first_name=referral.first_name,
            last_name=referral.last_name,
            date_of_birth=referral.date_of_birth,
            phone_number=referral.phone_number,
            email_address=referral.email_address,
            street_address=referral.street_address,
            city=referral.city,
            state=referral.state,
            postcode=referral.postcode,
            plan_type=referral.plan_type,
            ndis_number=referral.ndis_number,
            plan_start_date=referral.plan_start_date,
            plan_review_date=referral.plan_review_date,
            client_goals=referral.client_goals,
            referred_for=referral.referred_for,
            reason_for_referral=referral.reason_for_referral,
            status=referral.status,
            priority=getattr(referral, 'priority', 'medium'),
            referrer_first_name=referral.referrer_first_name,
            referrer_last_name=referral.referrer_last_name,
            referrer_email=referral.referrer_email,
            referrer_phone=referral.referrer_phone,
            created_at=referral.created_at,
            updated_at=referral.updated_at,
            provider_notes=referral.notes
        )
    
    @staticmethod
    def update_referral_status(
        db: Session, 
        referral_id: int, 
        provider_id: int, 
        status_update: ReferralStatusUpdate
    ) -> bool:
        """Update referral status and add provider notes"""
        referral = db.query(Referral).filter(
            and_(
                Referral.id == referral_id,
                Referral.assigned_provider_id == provider_id
            )
        ).first()
        
        if not referral:
            return False
        
        referral.status = status_update.status.value
        if status_update.notes:
            referral.notes = status_update.notes
        referral.updated_at = datetime.utcnow()
        
        if status_update.status.value == "accepted":
            referral.accepted_at = datetime.utcnow()
        
        db.commit()
        return True
    
    @staticmethod
    def get_referral_details(db: Session, referral_id: int, provider_id: int) -> Optional[ProviderReferralResponse]:
        """Get detailed referral information"""
        referral = db.query(Referral).filter(
            and_(
                Referral.id == referral_id,
                Referral.assigned_provider_id == provider_id
            )
        ).first()
        
        if not referral:
            return None
            
        return ProviderService._referral_to_response(referral)
    
    @staticmethod
    def accept_referral(db: Session, referral_id: int, provider_id: int) -> bool:
        """Accept a referral assignment"""
        referral = db.query(Referral).filter(
            and_(
                Referral.id == referral_id,
                Referral.assigned_provider_id == provider_id
            )
        ).first()
        
        if not referral:
            return False
            
        referral.status = "accepted"
        referral.accepted_at = datetime.utcnow()
        referral.updated_at = datetime.utcnow()
        
        db.commit()
        return True
    
    @staticmethod
    def decline_referral(db: Session, referral_id: int, provider_id: int, reason: str) -> bool:
        """Decline a referral with reason"""
        referral = db.query(Referral).filter(
            and_(
                Referral.id == referral_id,
                Referral.assigned_provider_id == provider_id
            )
        ).first()
        
        if not referral:
            return False
        
        referral.status = "declined"
        referral.notes = f"Declined: {reason}"
        referral.updated_at = datetime.utcnow()
        
        db.commit()
        return True
    
    @staticmethod
    def get_provider_schedule(
        db: Session, 
        provider_id: int, 
        start_date: Optional[date] = None, 
        end_date: Optional[date] = None
    ) -> List[ProviderScheduleResponse]:
        """Get provider's schedule and appointments"""
        # This is a placeholder implementation
        # In a real system, you would query an appointments table
        
        # For now, return empty list since we don't have appointment tables set up
        return []
    
    @staticmethod
    def set_availability(
        db: Session, 
        provider_id: int, 
        availability: ProviderAvailabilityCreate
    ) -> ProviderAvailabilityResponse:
        """Set provider availability for scheduling"""
        # This is a placeholder implementation
        # In a real system, you would create/update availability records
        
        now = datetime.utcnow()
        
        # Mock response for now
        return ProviderAvailabilityResponse(
            id=1,
            day_of_week=availability.day_of_week,
            start_time=availability.start_time,
            end_time=availability.end_time,
            is_available=availability.is_available,
            max_appointments=availability.max_appointments,
            location=availability.location,
            created_at=now,
            updated_at=now
        )
    
    @staticmethod
    def get_availability(db: Session, provider_id: int) -> List[ProviderAvailabilityResponse]:
        """Get provider's current availability settings"""
        # This is a placeholder implementation
        # In a real system, you would query availability records
        
        return []
    
    @staticmethod
    def get_provider_participants(db: Session, provider_id: int) -> List[ParticipantSummary]:
        """Get all participants assigned to this provider"""
        # This is a placeholder implementation
        # In a real system, you would query participant records
        
        return []
    
    @staticmethod
    def get_performance_metrics(db: Session, provider_id: int) -> ProviderPerformanceResponse:
        """Get provider performance metrics and statistics"""
        
        # Get basic counts
        total_referrals = db.query(Referral).filter(
            Referral.assigned_provider_id == provider_id
        ).count()
        
        accepted_referrals = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status.in_(["accepted", "in_progress", "completed"])
            )
        ).count()
        
        completed_referrals = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status == "completed"
            )
        ).count()
        
        declined_referrals = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status == "declined"
            )
        ).count()
        
        # Calculate rates
        acceptance_rate = (accepted_referrals / total_referrals * 100) if total_referrals > 0 else 0
        completion_rate = (completed_referrals / accepted_referrals * 100) if accepted_referrals > 0 else 0
        
        return ProviderPerformanceResponse(
            total_referrals=total_referrals,
            accepted_referrals=accepted_referrals,
            completed_referrals=completed_referrals,
            declined_referrals=declined_referrals,
            acceptance_rate=round(acceptance_rate, 2),
            completion_rate=round(completion_rate, 2),
            average_response_time_hours=None,
            average_completion_time_days=None,
            participant_satisfaction_avg=None,
            recent_performance_trend="stable"
        )
    
    @staticmethod
    def update_profile(db: Session, provider_id: int, profile_data: dict) -> bool:
        """Update provider profile information"""
        provider = db.query(User).filter(
            and_(
                User.id == provider_id,
                User.role == UserRole.PROVIDER
            )
        ).first()
        
        if not provider:
            return False
        
        # Update allowed fields
        for field, value in profile_data.items():
            if hasattr(provider, field) and value is not None:
                setattr(provider, field, value)
        
        provider.updated_at = datetime.utcnow()
        db.commit()
        return True
    
    @staticmethod
    def get_notifications(db: Session, provider_id: int, unread_only: bool = False) -> List[ProviderNotificationResponse]:
        """Get provider notifications"""
        # This is a placeholder implementation
        # In a real system, you would query notification records
        
        return []