from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.email_log import EmailLog, get_email_stats_for_referral
from app.models.user import User, UserRole
from app.api.v1.auth import get_current_active_user

router = APIRouter()


@router.get("/referral/{referral_id}/emails")
async def get_referral_email_status(
    referral_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get email status for a specific referral
    """
    # Check permissions (admin or related to referral)
    if current_user.role not in [UserRole.ADMIN, UserRole.PROVIDER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view email status"
        )
    
    # Get email statistics
    stats = get_email_stats_for_referral(db, referral_id)
    
    # Get detailed email logs
    email_logs = db.query(EmailLog).filter(
        EmailLog.referral_id == referral_id
    ).order_by(EmailLog.created_at.desc()).all()
    
    logs_data = []
    for log in email_logs:
        logs_data.append({
            "id": log.id,
            "email_type": log.email_type,
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "status": log.status,
            "sent_at": log.sent_at,
            "error_message": log.error_message,
            "retry_count": log.retry_count,
            "created_at": log.created_at
        })
    
    return {
        "referral_id": referral_id,
        "statistics": stats,
        "email_logs": logs_data
    }


@router.get("/emails/failed")
async def get_failed_emails(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get all failed emails (admin only)
    """
    # Check if user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view failed emails"
        )
    
    failed_emails = db.query(EmailLog).filter(
        EmailLog.status == "failed"
    ).order_by(EmailLog.created_at.desc()).limit(50).all()
    
    result = []
    for log in failed_emails:
        result.append({
            "id": log.id,
            "referral_id": log.referral_id,
            "email_type": log.email_type,
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "error_message": log.error_message,
            "retry_count": log.retry_count,
            "created_at": log.created_at
        })
    
    return result


@router.get("/emails/statistics")
async def get_email_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get overall email statistics (admin only)
    """
    # Check if user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view email statistics"
        )
    
    # Get overall statistics
    total_emails = db.query(EmailLog).count()
    sent_emails = db.query(EmailLog).filter(EmailLog.status == "sent").count()
    failed_emails = db.query(EmailLog).filter(EmailLog.status == "failed").count()
    pending_emails = db.query(EmailLog).filter(EmailLog.status == "pending").count()
    
    # Get statistics by email type
    provider_notifications = db.query(EmailLog).filter(
        EmailLog.email_type == "provider_notification"
    ).count()
    participant_confirmations = db.query(EmailLog).filter(
        EmailLog.email_type == "participant_confirmation"
    ).count()
    referrer_notifications = db.query(EmailLog).filter(
        EmailLog.email_type == "referrer_notification"
    ).count()
    
    return {
        "overall": {
            "total_emails": total_emails,
            "sent": sent_emails,
            "failed": failed_emails,
            "pending": pending_emails,
            "success_rate": round((sent_emails / total_emails * 100) if total_emails > 0 else 0, 2)
        },
        "by_type": {
            "provider_notifications": provider_notifications,
            "participant_confirmations": participant_confirmations,
            "referrer_notifications": referrer_notifications
        }
    }