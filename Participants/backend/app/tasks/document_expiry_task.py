# backend/app/tasks/document_expiry_task.py - SIMPLE EXPIRY NOTIFICATION TASK
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db, SessionLocal
from app.models.document import Document
from app.models.participant import Participant
from app.services.email_service import EmailService
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

def check_and_notify_expiring_documents(db: Session = None):
    """Check for expiring documents and send notifications"""
    if not db:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False
    
    try:
        email_service = EmailService()
        if not email_service.is_configured:
            logger.warning("Email service not configured - skipping notifications")
            return {"status": "skipped", "reason": "email_not_configured"}
        
        notifications_sent = 0
        errors = 0
        
        # Check for documents expiring in 30 days
        thirty_days = datetime.now() + timedelta(days=30)
        expiring_docs = db.query(Document).join(Participant).filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date <= thirty_days,
                Document.expiry_date >= datetime.now(),
                Document.status == 'active'
            )
        ).all()
        
        for doc in expiring_docs:
            try:
                participant = doc.participant
                days_until_expiry = (doc.expiry_date - datetime.now()).days
                
                success = email_service.send_expiry_notification(
                    participant, doc, days_until_expiry
                )
                
                if success:
                    notifications_sent += 1
                else:
                    errors += 1
                    
            except Exception as e:
                logger.error(f"Error sending notification for document {doc.id}: {str(e)}")
                errors += 1
        
        return {
            "status": "completed",
            "notifications_sent": notifications_sent,
            "errors": errors,
            "documents_checked": len(expiring_docs)
        }
        
    except Exception as e:
        logger.error(f"Error in expiry notification task: {str(e)}")
        return {"status": "error", "error": str(e)}
    finally:
        if should_close:
            db.close()

# Simple CLI script to run manually or via cron
if __name__ == "__main__":
    result = check_and_notify_expiring_documents()
    print(f"Notification task result: {result}")