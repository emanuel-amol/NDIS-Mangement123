# backend/app/services/provider_admin_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func, case
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta

from app.models.user import User, UserRole, ServiceType
from app.models.referral import Referral
from app.schemas.provider import ProviderReferralResponse, ReferralStatus
from app.services.provider_service import ProviderService

class ProviderAdminService:
    
    @staticmethod
    def get_all_providers(
        db: Session, 
        active_only: bool = True,
        service_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all providers with their statistics"""
        
        query = db.query(User).filter(User.role == UserRole.PROVIDER)
        
        if active_only:
            query = query.filter(User.is_active == True)
            
        if service_type:
            query = query.filter(User.service_type == service_type)
        
        providers = query.all()
        
        result = []
        for provider in providers:
            # Get provider statistics
            total_referrals = db.query(Referral).filter(
                Referral.assigned_provider_id == provider.id
            ).count()
            
            active_referrals = db.query(Referral).filter(
                and_(
                    Referral.assigned_provider_id == provider.id,
                    Referral.status.in_(["accepted", "in_progress"])
                )
            ).count()
            
            completed_referrals = db.query(Referral).filter(
                and_(
                    Referral.assigned_provider_id == provider.id,
                    Referral.status == "completed"
                )
            ).count()
            
            # Calculate completion rate
            completion_rate = (completed_referrals / total_referrals * 100) if total_referrals > 0 else 0
            
            # Get latest activity
            latest_activity = db.query(Referral).filter(
                Referral.assigned_provider_id == provider.id
            ).order_by(desc(Referral.updated_at)).first()
            
            result.append({
                "id": provider.id,
                "first_name": provider.first_name,
                "last_name": provider.last_name,
                "email": provider.email,
                "phone_number": provider.phone_number,
                "service_type": provider.service_type.value if provider.service_type else None,
                "provider_agency": provider.provider_agency,
                "provider_license": provider.provider_license,
                "is_active": provider.is_active,
                "created_at": provider.created_at,
                "last_login": provider.last_login,
                "stats": {
                    "total_referrals": total_referrals,
                    "active_referrals": active_referrals,
                    "completed_referrals": completed_referrals,
                    "completion_rate": round(completion_rate, 2)
                },
                "latest_activity": latest_activity.updated_at if latest_activity else None
            })
        
        return result
    
    @staticmethod
    def get_provider_dashboard_admin(db: Session, provider_id: int) -> Optional[Dict[str, Any]]:
        """Get provider dashboard data for admin oversight"""
        provider = db.query(User).filter(
            and_(User.id == provider_id, User.role == UserRole.PROVIDER)
        ).first()
        
        if not provider:
            return None
        
        # Get standard dashboard data
        dashboard_data = ProviderService.get_dashboard_data(db, provider_id)
        
        # Add admin-specific data
        admin_data = {
            "provider_info": {
                "id": provider.id,
                "name": f"{provider.first_name} {provider.last_name}",
                "email": provider.email,
                "service_type": provider.service_type.value if provider.service_type else None,
                "agency": provider.provider_agency,
                "license": provider.provider_license,
                "is_active": provider.is_active,
                "last_login": provider.last_login
            },
            "dashboard": dashboard_data.dict(),
            "alerts": ProviderAdminService._get_provider_alerts_specific(db, provider_id)
        }
        
        return admin_data
    
    @staticmethod
    def _get_provider_alerts_specific(db: Session, provider_id: int) -> List[Dict[str, Any]]:
        """Get specific alerts for a provider"""
        alerts = []
        
        # Check for overdue referrals
        overdue_count = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status == "new",
                Referral.created_at < datetime.utcnow() - timedelta(days=3)
            )
        ).count()
        
        if overdue_count > 0:
            alerts.append({
                "type": "overdue_referrals",
                "severity": "high" if overdue_count > 5 else "medium",
                "message": f"{overdue_count} referrals overdue for response",
                "count": overdue_count
            })
        
        # Check for long-running referrals
        long_running = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status == "in_progress",
                Referral.accepted_at < datetime.utcnow() - timedelta(days=30)
            )
        ).count()
        
        if long_running > 0:
            alerts.append({
                "type": "long_running",
                "severity": "medium",
                "message": f"{long_running} referrals in progress for over 30 days",
                "count": long_running
            })
        
        return alerts
    
    @staticmethod
    def get_unassigned_referrals(
        db: Session,
        service_type: Optional[str] = None,
        priority: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[ProviderReferralResponse]:
        """Get all unassigned referrals for assignment"""
        
        query = db.query(Referral).filter(
            or_(
                Referral.assigned_provider_id.is_(None),
                Referral.status == "declined"
            )
        )
        
        if service_type:
            query = query.filter(Referral.referred_for == service_type)
            
        if priority:
            query = query.filter(Referral.priority == priority)
        
        referrals = query.order_by(desc(Referral.created_at)).offset(skip).limit(limit).all()
        
        return [ProviderService._referral_to_response(referral) for referral in referrals]
    
    @staticmethod
    def assign_referral_to_provider(
        db: Session,
        referral_id: int,
        provider_id: int,
        priority: Optional[str] = "medium",
        notes: Optional[str] = None,
        assigned_by_user_id: int = None
    ) -> bool:
        """Assign a referral to a specific provider"""
        
        # Get referral
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        if not referral:
            return False
        
        # Get provider
        provider = db.query(User).filter(
            and_(
                User.id == provider_id,
                User.role == UserRole.PROVIDER,
                User.is_active == True
            )
        ).first()
        
        if not provider:
            return False
        
        # Check if provider can handle this service type
        if provider.service_type != ServiceType.ALL:
            if provider.service_type.value != referral.referred_for.lower():
                return False
        
        # Assign referral
        referral.assigned_provider_id = provider_id
        referral.status = "assigned"
        referral.priority = priority
        if notes:
            referral.notes = f"Assigned by admin: {notes}"
        referral.updated_at = datetime.utcnow()
        
        # TODO: Create notification for provider
        # TODO: Log assignment activity
        
        db.commit()
        return True
    
    @staticmethod
    def reassign_referral(
        db: Session,
        referral_id: int,
        new_provider_id: int,
        reason: str,
        reassigned_by_user_id: int
    ) -> bool:
        """Reassign a referral from one provider to another"""
        
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        if not referral:
            return False
        
        old_provider_id = referral.assigned_provider_id
        
        # Assign to new provider
        success = ProviderAdminService.assign_referral_to_provider(
            db, referral_id, new_provider_id, "medium", f"Reassigned: {reason}", reassigned_by_user_id
        )
        
        if success:
            # TODO: Notify both old and new providers
            # TODO: Log reassignment activity
            pass
        
        return success
    
    @staticmethod
    def get_overdue_referrals(
        db: Session,
        days_overdue: int = 7,
        provider_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get referrals that are overdue for response or completion"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_overdue)
        
        query = db.query(Referral).filter(
            or_(
                # New referrals not responded to
                and_(
                    Referral.status == "new",
                    Referral.created_at < cutoff_date
                ),
                # Long-running in-progress referrals
                and_(
                    Referral.status == "in_progress",
                    Referral.accepted_at < datetime.utcnow() - timedelta(days=30)
                )
            )
        )
        
        if provider_id:
            query = query.filter(Referral.assigned_provider_id == provider_id)
        
        overdue_referrals = query.all()
        
        result = []
        for referral in overdue_referrals:
            provider = None
            if referral.assigned_provider_id:
                provider = db.query(User).filter(User.id == referral.assigned_provider_id).first()
            
            days_since = (datetime.utcnow() - (referral.accepted_at or referral.created_at)).days
            
            result.append({
                "referral_id": referral.id,
                "participant_name": f"{referral.first_name} {referral.last_name}",
                "service_type": referral.referred_for,
                "status": referral.status,
                "created_at": referral.created_at,
                "days_overdue": days_since,
                "provider": {
                    "id": provider.id if provider else None,
                    "name": f"{provider.first_name} {provider.last_name}" if provider else "Unassigned",
                    "email": provider.email if provider else None
                }
            })
        
        return result
    
    @staticmethod
    def get_provider_performance_detailed(
        db: Session,
        provider_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Optional[Dict[str, Any]]:
        """Get detailed provider performance metrics for admin review"""
        
        provider = db.query(User).filter(
            and_(User.id == provider_id, User.role == UserRole.PROVIDER)
        ).first()
        
        if not provider:
            return None
        
        # Set default date range if not provided
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=90)
        
        # Get performance metrics
        performance = ProviderService.get_performance_metrics(db, provider_id)
        
        # Add detailed breakdown
        referrals_in_period = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                func.date(Referral.created_at) >= start_date,
                func.date(Referral.created_at) <= end_date
            )
        ).all()
        
        # Calculate detailed metrics
        response_times = []
        completion_times = []
        
        for referral in referrals_in_period:
            if referral.accepted_at:
                response_time = (referral.accepted_at - referral.created_at).total_seconds() / 3600
                response_times.append(response_time)
            
            if referral.status == "completed" and referral.accepted_at:
                completion_time = (referral.updated_at - referral.accepted_at).days
                completion_times.append(completion_time)
        
        detailed_performance = {
            "provider_info": {
                "id": provider.id,
                "name": f"{provider.first_name} {provider.last_name}",
                "service_type": provider.service_type.value if provider.service_type else None
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": (end_date - start_date).days
            },
            "performance": performance,
            "detailed_metrics": {
                "average_response_time_hours": sum(response_times) / len(response_times) if response_times else 0,
                "median_response_time_hours": sorted(response_times)[len(response_times)//2] if response_times else 0,
                "average_completion_time_days": sum(completion_times) / len(completion_times) if completion_times else 0,
                "referrals_in_period": len(referrals_in_period)
            }
        }
        
        return detailed_performance
    
    @staticmethod
    def get_workload_analytics(db: Session) -> Dict[str, Any]:
        """Get workload distribution analytics across all providers"""
        
        providers = db.query(User).filter(
            and_(User.role == UserRole.PROVIDER, User.is_active == True)
        ).all()
        
        workload_data = []
        total_active_referrals = 0
        
        for provider in providers:
            active_referrals = db.query(Referral).filter(
                and_(
                    Referral.assigned_provider_id == provider.id,
                    Referral.status.in_(["accepted", "in_progress"])
                )
            ).count()
            
            total_referrals = db.query(Referral).filter(
                Referral.assigned_provider_id == provider.id
            ).count()
            
            workload_data.append({
                "provider_id": provider.id,
                "provider_name": f"{provider.first_name} {provider.last_name}",
                "service_type": provider.service_type.value if provider.service_type else None,
                "active_referrals": active_referrals,
                "total_referrals": total_referrals,
                "capacity_utilization": min(active_referrals / 10 * 100, 100)  # Assuming max 10 active referrals
            })
            
            total_active_referrals += active_referrals
        
        # Calculate distribution
        unassigned_referrals = db.query(Referral).filter(
            Referral.assigned_provider_id.is_(None),
            Referral.status == "new"
        ).count()
        
        return {
            "total_active_providers": len(providers),
            "total_active_referrals": total_active_referrals,
            "unassigned_referrals": unassigned_referrals,
            "average_workload": total_active_referrals / len(providers) if providers else 0,
            "workload_by_provider": workload_data,
            "workload_balance_score": ProviderAdminService._calculate_balance_score(workload_data)
        }
    
    @staticmethod
    def _calculate_balance_score(workload_data: List[Dict[str, Any]]) -> float:
        """Calculate workload balance score (0-100, higher is more balanced)"""
        if not workload_data:
            return 100.0
        
        active_counts = [p["active_referrals"] for p in workload_data]
        if not active_counts:
            return 100.0
        
        mean_workload = sum(active_counts) / len(active_counts)
        variance = sum((x - mean_workload) ** 2 for x in active_counts) / len(active_counts)
        
        # Convert variance to a balance score (lower variance = higher score)
        balance_score = max(0, 100 - (variance * 10))
        return min(balance_score, 100.0)
    
    @staticmethod
    def get_performance_summary(db: Session, period_days: int = 30) -> Dict[str, Any]:
        """Get overall performance summary for all providers"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=period_days)
        
        # Get all active providers
        providers = db.query(User).filter(
            and_(User.role == UserRole.PROVIDER, User.is_active == True)
        ).all()
        
        # Overall metrics
        total_referrals_period = db.query(Referral).filter(
            Referral.created_at >= cutoff_date
        ).count()
        
        completed_referrals_period = db.query(Referral).filter(
            and_(
                Referral.updated_at >= cutoff_date,
                Referral.status == "completed"
            )
        ).count()
        
        # Provider performance rankings
        provider_performance = []
        for provider in providers:
            provider_referrals = db.query(Referral).filter(
                and_(
                    Referral.assigned_provider_id == provider.id,
                    Referral.created_at >= cutoff_date
                )
            ).count()
            
            provider_completed = db.query(Referral).filter(
                and_(
                    Referral.assigned_provider_id == provider.id,
                    Referral.updated_at >= cutoff_date,
                    Referral.status == "completed"
                )
            ).count()
            
            completion_rate = (provider_completed / provider_referrals * 100) if provider_referrals > 0 else 0
            
            provider_performance.append({
                "provider_id": provider.id,
                "provider_name": f"{provider.first_name} {provider.last_name}",
                "service_type": provider.service_type.value if provider.service_type else None,
                "referrals_handled": provider_referrals,
                "referrals_completed": provider_completed,
                "completion_rate": completion_rate
            })
        
        # Sort by completion rate
        provider_performance.sort(key=lambda x: x["completion_rate"], reverse=True)
        
        return {
            "period_days": period_days,
            "summary": {
                "total_providers": len(providers),
                "total_referrals": total_referrals_period,
                "completed_referrals": completed_referrals_period,
                "overall_completion_rate": (completed_referrals_period / total_referrals_period * 100) if total_referrals_period > 0 else 0
            },
            "top_performers": provider_performance[:5],
            "all_providers": provider_performance
        }
    
    @staticmethod
    def update_provider_status(db: Session, provider_id: int, is_active: bool) -> bool:
        """Update provider active status"""
        provider = db.query(User).filter(
            and_(User.id == provider_id, User.role == UserRole.PROVIDER)
        ).first()
        
        if not provider:
            return False
        
        provider.is_active = is_active
        provider.updated_at = datetime.utcnow()
        db.commit()
        return True
    
    @staticmethod
    def deactivate_provider(
        db: Session,
        provider_id: int,
        reason: str,
        reassign_referrals: bool = True,
        deactivated_by_user_id: int = None
    ) -> Dict[str, Any]:
        """Deactivate a provider and optionally reassign their referrals"""
        
        provider = db.query(User).filter(
            and_(User.id == provider_id, User.role == UserRole.PROVIDER)
        ).first()
        
        if not provider:
            return {"success": False, "message": "Provider not found"}
        
        # Get active referrals
        active_referrals = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status.in_(["assigned", "accepted", "in_progress"])
            )
        ).all()
        
        reassigned_count = 0
        unassigned_count = 0
        
        if reassign_referrals and active_referrals:
            # Find suitable providers for reassignment
            for referral in active_referrals:
                suitable_providers = db.query(User).filter(
                    and_(
                        User.role == UserRole.PROVIDER,
                        User.is_active == True,
                        User.id != provider_id,
                        or_(
                            User.service_type == ServiceType.ALL,
                            User.service_type == ServiceType(referral.referred_for.lower())
                        )
                    )
                ).all()
                
                if suitable_providers:
                    # Simple round-robin assignment for now
                    new_provider = suitable_providers[0]  # Could implement load balancing
                    referral.assigned_provider_id = new_provider.id
                    referral.status = "assigned"
                    referral.notes = f"Reassigned due to provider deactivation: {reason}"
                    referral.updated_at = datetime.utcnow()
                    reassigned_count += 1
                else:
                    # No suitable provider found, unassign
                    referral.assigned_provider_id = None
                    referral.status = "new"
                    referral.notes = f"Unassigned due to provider deactivation: {reason}"
                    referral.updated_at = datetime.utcnow()
                    unassigned_count += 1
        
        # Deactivate provider
        provider.is_active = False
        provider.updated_at = datetime.utcnow()
        
        # TODO: Log deactivation activity
        # TODO: Send notifications to reassigned providers
        
        db.commit()
        
        return {
            "success": True,
            "message": "Provider deactivated successfully",
            "active_referrals_found": len(active_referrals),
            "reassigned": reassigned_count,
            "unassigned": unassigned_count
        }
    
    @staticmethod
    def get_provider_referrals_admin(
        db: Session,
        provider_id: int,
        status_filter: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[ProviderReferralResponse]:
        """Get all referrals for a specific provider (admin view)"""
        
        query = db.query(Referral).filter(Referral.assigned_provider_id == provider_id)
        
        if status_filter:
            query = query.filter(Referral.status == status_filter)
        
        if start_date:
            query = query.filter(func.date(Referral.created_at) >= start_date)
        
        if end_date:
            query = query.filter(func.date(Referral.created_at) <= end_date)
        
        referrals = query.order_by(desc(Referral.created_at)).offset(skip).limit(limit).all()
        
        return [ProviderService._referral_to_response(referral) for referral in referrals]
    
    @staticmethod
    def bulk_assign_referrals(
        db: Session,
        referral_ids: List[int],
        provider_id: int,
        priority: Optional[str] = "medium",
        notes: Optional[str] = None,
        assigned_by_user_id: int = None
    ) -> Dict[str, Any]:
        """Bulk assign multiple referrals to a provider"""
        
        success_count = 0
        failed_assignments = []
        
        for referral_id in referral_ids:
            success = ProviderAdminService.assign_referral_to_provider(
                db, referral_id, provider_id, priority, notes, assigned_by_user_id
            )
            
            if success:
                success_count += 1
            else:
                failed_assignments.append(referral_id)
        
        return {
            "total_requested": len(referral_ids),
            "successfully_assigned": success_count,
            "failed_assignments": failed_assignments,
            "success_rate": (success_count / len(referral_ids) * 100) if referral_ids else 0
        }
    
    @staticmethod
    def get_provider_capacity(db: Session, provider_id: int) -> Optional[Dict[str, Any]]:
        """Get provider's current capacity and availability"""
        
        provider = db.query(User).filter(
            and_(User.id == provider_id, User.role == UserRole.PROVIDER)
        ).first()
        
        if not provider:
            return None
        
        # Current workload
        active_referrals = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status.in_(["accepted", "in_progress"])
            )
        ).count()
        
        new_referrals = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status == "assigned"
            )
        ).count()
        
        # Assuming max capacity of 15 active referrals (configurable)
        max_capacity = 15
        utilization_rate = (active_referrals / max_capacity) * 100
        
        # Recent performance
        last_30_days = datetime.utcnow() - timedelta(days=30)
        recent_completed = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                Referral.status == "completed",
                Referral.updated_at >= last_30_days
            )
        ).count()
        
        return {
            "provider_id": provider_id,
            "provider_name": f"{provider.first_name} {provider.last_name}",
            "service_type": provider.service_type.value if provider.service_type else None,
            "capacity": {
                "max_capacity": max_capacity,
                "active_referrals": active_referrals,
                "pending_referrals": new_referrals,
                "available_slots": max(0, max_capacity - active_referrals),
                "utilization_rate": min(utilization_rate, 100)
            },
            "performance": {
                "completed_last_30_days": recent_completed,
                "is_accepting_referrals": utilization_rate < 90,
                "recommended_priority": "high" if utilization_rate < 50 else "medium" if utilization_rate < 80 else "low"
            }
        }
    
    @staticmethod
    def get_assignment_suggestions(db: Session, referral_id: int) -> Optional[List[Dict[str, Any]]]:
        """Get suggested providers for a referral based on service type, location, and capacity"""
        
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        if not referral:
            return None
        
        # Find providers who can handle this service type
        suitable_providers = db.query(User).filter(
            and_(
                User.role == UserRole.PROVIDER,
                User.is_active == True,
                or_(
                    User.service_type == ServiceType.ALL,
                    User.service_type == ServiceType(referral.referred_for.lower())
                )
            )
        ).all()
        
        suggestions = []
        for provider in suitable_providers:
            capacity_info = ProviderAdminService.get_provider_capacity(db, provider.id)
            
            if capacity_info:
                # Calculate suggestion score (0-100)
                score = 50  # Base score
                
                # Boost score for lower utilization
                utilization = capacity_info["capacity"]["utilization_rate"]
                score += (100 - utilization) * 0.3
                
                # Boost score for recent performance
                recent_completed = capacity_info["performance"]["completed_last_30_days"]
                score += min(recent_completed * 2, 20)
                
                # Boost score for exact service type match
                if provider.service_type.value == referral.referred_for.lower():
                    score += 15
                
                suggestions.append({
                    "provider_id": provider.id,
                    "provider_name": f"{provider.first_name} {provider.last_name}",
                    "service_type": provider.service_type.value,
                    "agency": provider.provider_agency,
                    "suggestion_score": min(score, 100),
                    "capacity_info": capacity_info["capacity"],
                    "recommendation_reason": ProviderAdminService._get_recommendation_reason(
                        utilization, recent_completed, provider.service_type.value == referral.referred_for.lower()
                    )
                })
        
        # Sort by suggestion score
        suggestions.sort(key=lambda x: x["suggestion_score"], reverse=True)
        
        return suggestions[:5]  # Return top 5 suggestions
    
    @staticmethod
    def _get_recommendation_reason(utilization: float, recent_completed: int, exact_match: bool) -> str:
        """Generate recommendation reason text"""
        reasons = []
        
        if utilization < 50:
            reasons.append("Low current workload")
        elif utilization < 80:
            reasons.append("Moderate workload")
        
        if recent_completed > 5:
            reasons.append("High recent productivity")
        elif recent_completed > 2:
            reasons.append("Good recent performance")
        
        if exact_match:
            reasons.append("Exact service type match")
        
        return "; ".join(reasons) if reasons else "Available provider"
    
    @staticmethod
    def get_provider_alerts(db: Session, severity: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get alerts about provider issues"""
        
        alerts = []
        
        # Get all active providers
        providers = db.query(User).filter(
            and_(User.role == UserRole.PROVIDER, User.is_active == True)
        ).all()
        
        for provider in providers:
            provider_alerts = ProviderAdminService._get_provider_alerts_specific(db, provider.id)
            
            for alert in provider_alerts:
                alert["provider_id"] = provider.id
                alert["provider_name"] = f"{provider.first_name} {provider.last_name}"
                
                if not severity or alert["severity"] == severity:
                    alerts.append(alert)
        
        # Sort by severity and count
        severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        alerts.sort(key=lambda x: (severity_order.get(x["severity"], 0), x.get("count", 0)), reverse=True)
        
        return alerts
    
    @staticmethod
    def send_notification_to_provider(
        db: Session,
        provider_id: int,
        notification_type: str,
        title: str,
        message: str,
        priority: str = "medium",
        action_required: bool = False,
        sent_by_user_id: int = None
    ) -> bool:
        """Send a notification to a specific provider"""
        
        provider = db.query(User).filter(
            and_(User.id == provider_id, User.role == UserRole.PROVIDER)
        ).first()
        
        if not provider:
            return False
        
        # TODO: Implement ProviderNotification model creation
        # For now, this is a placeholder that would create a notification record
        
        # In a real implementation, you would:
        # 1. Create a ProviderNotification record
        # 2. Send email/SMS if configured
        # 3. Create in-app notification
        
        return True
    
    @staticmethod
    def generate_provider_summary_report(
        db: Session,
        start_date: date,
        end_date: date,
        provider_ids: List[int]
    ) -> Dict[str, Any]:
        """Generate comprehensive provider performance report"""
        
        report_data = {
            "report_info": {
                "generated_at": datetime.utcnow().isoformat(),
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": (end_date - start_date).days
                },
                "providers_included": len(provider_ids)
            },
            "summary": {
                "total_referrals": 0,
                "completed_referrals": 0,
                "average_completion_rate": 0
            },
            "provider_details": []
        }
        
        total_referrals = 0
        total_completed = 0
        
        for provider_id in provider_ids:
            provider = db.query(User).filter(User.id == provider_id).first()
            if not provider:
                continue
            
            # Get referrals in period
            referrals = db.query(Referral).filter(
                and_(
                    Referral.assigned_provider_id == provider_id,
                    func.date(Referral.created_at) >= start_date,
                    func.date(Referral.created_at) <= end_date
                )
            ).all()
            
            completed = [r for r in referrals if r.status == "completed"]
            
            provider_data = {
                "provider_id": provider_id,
                "provider_name": f"{provider.first_name} {provider.last_name}",
                "service_type": provider.service_type.value if provider.service_type else None,
                "referrals_handled": len(referrals),
                "referrals_completed": len(completed),
                "completion_rate": (len(completed) / len(referrals) * 100) if referrals else 0,
                "performance_metrics": ProviderAdminService.get_provider_performance_detailed(
                    db, provider_id, start_date, end_date
                )
            }
            
            report_data["provider_details"].append(provider_data)
            total_referrals += len(referrals)
            total_completed += len(completed)
        
        # Update summary
        report_data["summary"]["total_referrals"] = total_referrals
        report_data["summary"]["completed_referrals"] = total_completed
        report_data["summary"]["average_completion_rate"] = (
            (total_completed / total_referrals * 100) if total_referrals > 0 else 0
        )
        
        return report_data
    
    @staticmethod
    def get_provider_timeline(
        db: Session,
        provider_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get provider activity timeline for admin review"""
        
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get referral activities
        referrals = db.query(Referral).filter(
            and_(
                Referral.assigned_provider_id == provider_id,
                func.date(Referral.created_at) >= start_date,
                func.date(Referral.created_at) <= end_date
            )
        ).order_by(desc(Referral.updated_at)).limit(limit).all()
        
        timeline = []
        for referral in referrals:
            timeline.append({
                "timestamp": referral.updated_at or referral.created_at,
                "type": "referral_activity",
                "title": f"Referral #{referral.id} - {referral.status.title()}",
                "description": f"{referral.first_name} {referral.last_name} - {referral.referred_for}",
                "status": referral.status,
                "referral_id": referral.id
            })
        
        # TODO: Add other activity types (appointments, notes, etc.)
        
        # Sort by timestamp
        timeline.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return timeline
    
    @staticmethod
    def create_performance_review(
        db: Session,
        provider_id: int,
        review_data: Dict[str, Any],
        reviewed_by_user_id: int
    ) -> bool:
        """Create a performance review for a provider"""
        
        provider = db.query(User).filter(
            and_(User.id == provider_id, User.role == UserRole.PROVIDER)
        ).first()
        
        if not provider:
            return False
        
        # TODO: Implement PerformanceReview model and creation logic
        # This would typically create a performance review record with:
        # - review_data (ratings, comments, goals, etc.)
        # - reviewed_by_user_id
        # - review_date
        # - performance metrics snapshot
        
        return True
    
    @staticmethod
    def get_admin_dashboard_summary(db: Session) -> Dict[str, Any]:
        """Get summary data for admin dashboard"""
        
        # Provider counts
        total_providers = db.query(User).filter(User.role == UserRole.PROVIDER).count()
        active_providers = db.query(User).filter(
            and_(User.role == UserRole.PROVIDER, User.is_active == True)
        ).count()
        
        # Referral counts
        total_referrals = db.query(Referral).count()
        unassigned_referrals = db.query(Referral).filter(
            Referral.assigned_provider_id.is_(None)
        ).count()
        overdue_referrals = db.query(Referral).filter(
            and_(
                Referral.status == "new",
                Referral.created_at < datetime.utcnow() - timedelta(days=3)
            )
        ).count()
        
        # Recent activity
        recent_referrals = db.query(Referral).order_by(
            desc(Referral.created_at)
        ).limit(5).all()
        
        return {
            "providers": {
                "total": total_providers,
                "active": active_providers,
                "inactive": total_providers - active_providers
            },
            "referrals": {
                "total": total_referrals,
                "unassigned": unassigned_referrals,
                "overdue": overdue_referrals
            },
            "recent_activity": [
                {
                    "type": "referral",
                    "id": r.id,
                    "participant_name": f"{r.first_name} {r.last_name}",
                    "service_type": r.referred_for,
                    "status": r.status,
                    "created_at": r.created_at
                } for r in recent_referrals
            ],
            "alerts": ProviderAdminService.get_provider_alerts(db, "high")[:3]  # Top 3 high priority alerts
        }