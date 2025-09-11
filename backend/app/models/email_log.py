from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class EmailType(enum.Enum):
    """Types of emails sent by the system"""
    PROVIDER_NOTIFICATION = "provider_notification"
    PARTICIPANT_CONFIRMATION = "participant_confirmation" 
    REFERRER_NOTIFICATION = "referrer_notification"


class EmailStatus(enum.Enum):
    """Email sending status"""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    RETRY = "retry"


class EmailLog(Base):
    """Log of all emails sent by the system"""
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Email Details
    email_type = Column(String(50), nullable=False)  # EmailType enum value
    recipient_email = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    
    # Status and Tracking
    status = Column(String(20), nullable=False, default="pending")  # EmailStatus enum value
    sent_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    
    # Reference to related records
    referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Recipient user if known
    
    # Celery Task Info
    task_id = Column(String(255), nullable=True)  # Celery task ID
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    referral = relationship("Referral", back_populates="email_logs")
    user = relationship("User", back_populates="email_logs")
    
    def __repr__(self):
        return f"<EmailLog(id={self.id}, type='{self.email_type}', recipient='{self.recipient_email}', status='{self.status}')>"
    
    def mark_as_sent(self):
        """Mark email as successfully sent"""
        self.status = EmailStatus.SENT.value
        self.sent_at = func.now()
    
    def mark_as_failed(self, error_message: str):
        """Mark email as failed with error message"""
        self.status = EmailStatus.FAILED.value
        self.error_message = error_message
        self.retry_count += 1
    
    def mark_for_retry(self):
        """Mark email for retry"""
        self.status = EmailStatus.RETRY.value
        self.retry_count += 1


def log_email_attempt(db, email_type: str, recipient: str, subject: str, 
                     referral_id: int = None, user_id: int = None, 
                     task_id: str = None) -> EmailLog:
    """
    Create a new email log entry
    
    Args:
        db: Database session
        email_type: Type of email being sent
        recipient: Recipient email address
        subject: Email subject line
        referral_id: Related referral ID (optional)
        user_id: Recipient user ID (optional)
        task_id: Celery task ID (optional)
    
    Returns:
        EmailLog: Created email log entry
    """
    email_log = EmailLog(
        email_type=email_type,
        recipient_email=recipient,
        subject=subject,
        referral_id=referral_id,
        user_id=user_id,
        task_id=task_id,
        status=EmailStatus.PENDING.value
    )
    
    db.add(email_log)
    db.commit()
    db.refresh(email_log)
    
    return email_log


def update_email_status(db, email_log_id: int, status: str, 
                       error_message: str = None) -> bool:
    """
    Update email log status
    
    Args:
        db: Database session
        email_log_id: Email log ID to update
        status: New status (sent/failed/retry)
        error_message: Error message if failed
    
    Returns:
        bool: True if updated successfully
    """
    email_log = db.query(EmailLog).filter(EmailLog.id == email_log_id).first()
    if not email_log:
        return False
    
    if status == EmailStatus.SENT.value:
        email_log.mark_as_sent()
    elif status == EmailStatus.FAILED.value:
        email_log.mark_as_failed(error_message or "Unknown error")
    elif status == EmailStatus.RETRY.value:
        email_log.mark_for_retry()
    else:
        email_log.status = status
    
    db.commit()
    return True


def get_email_stats_for_referral(db, referral_id: int) -> dict:
    """
    Get email statistics for a specific referral
    
    Args:
        db: Database session
        referral_id: Referral ID
    
    Returns:
        dict: Email statistics
    """
    logs = db.query(EmailLog).filter(EmailLog.referral_id == referral_id).all()
    
    stats = {
        "total_emails": len(logs),
        "sent": len([log for log in logs if log.status == EmailStatus.SENT.value]),
        "failed": len([log for log in logs if log.status == EmailStatus.FAILED.value]),
        "pending": len([log for log in logs if log.status == EmailStatus.PENDING.value]),
        "retry": len([log for log in logs if log.status == EmailStatus.RETRY.value])
    }
    
    return stats