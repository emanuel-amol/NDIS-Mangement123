# backend/app/tasks/document_scheduler.py - BACKGROUND TASK FOR AUTOMATED NOTIFICATIONS
from celery import Celery
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.services.document_notification_service import DocumentNotificationService
from app.core.database import DATABASE_URL
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery (if using Celery for background tasks)
# You can also use APScheduler or simple cron jobs
celery_app = Celery(
    'document_scheduler',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
)

# Database setup for background tasks
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@celery_app.task
def process_document_notifications():
    """Celery task to process document expiry notifications"""
    logger.info("Starting document notification processing task")
    
    db = SessionLocal()
    try:
        notification_service = DocumentNotificationService()
        results = notification_service.process_expiry_notifications(db)
        
        logger.info(f"Document notification task completed: {results}")
        return results
        
    except Exception as e:
        logger.error(f"Error in document notification task: {str(e)}")
        return {'error': str(e)}
    finally:
        db.close()

@celery_app.task
def cleanup_old_notifications():
    """Clean up old notification records (optional maintenance task)"""
    logger.info("Starting notification cleanup task")
    
    db = SessionLocal()
    try:
        from app.models.document import DocumentNotification
        from datetime import timedelta
        
        # Delete notifications older than 90 days
        cutoff_date = datetime.now() - timedelta(days=90)
        deleted_count = db.query(DocumentNotification).filter(
            DocumentNotification.created_at < cutoff_date
        ).delete()
        
        db.commit()
        
        logger.info(f"Cleaned up {deleted_count} old notification records")
        return {'deleted_count': deleted_count}
        
    except Exception as e:
        logger.error(f"Error in notification cleanup task: {str(e)}")
        db.rollback()
        return {'error': str(e)}
    finally:
        db.close()

# Configure Celery beat schedule (periodic tasks)
celery_app.conf.beat_schedule = {
    'process-document-notifications': {
        'task': 'app.tasks.document_scheduler.process_document_notifications',
        'schedule': 3600.0,  # Run every hour
    },
    'cleanup-old-notifications': {
        'task': 'app.tasks.document_scheduler.cleanup_old_notifications',
        'schedule': 86400.0,  # Run daily
    },
}

celery_app.conf.timezone = 'Australia/Melbourne'

# Alternative: Simple scheduler without Celery (using APScheduler)
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import atexit

def create_simple_scheduler():
    """Create a simple scheduler for document notifications (alternative to Celery)"""
    scheduler = BackgroundScheduler()
    
    def run_notification_task():
        """Run the notification processing task"""
        logger.info("Running scheduled document notification task")
        db = SessionLocal()
        try:
            notification_service = DocumentNotificationService()
            results = notification_service.process_expiry_notifications(db)
            logger.info(f"Notification task completed: {results}")
        except Exception as e:
            logger.error(f"Error in scheduled notification task: {str(e)}")
        finally:
            db.close()
    
    # Schedule to run every hour
    scheduler.add_job(
        func=run_notification_task,
        trigger=IntervalTrigger(hours=1),
        id='document_notifications',
        name='Process document expiry notifications',
        replace_existing=True
    )
    
    scheduler.start()
    
    # Ensure scheduler shuts down when the application exits
    atexit.register(lambda: scheduler.shutdown())
    
    logger.info("Document notification scheduler started")
    return scheduler

# For immediate testing - standalone script
if __name__ == "__main__":
    """Run notification processing immediately (for testing)"""
    print("Running document notification processing...")
    
    db = SessionLocal()
    try:
        notification_service = DocumentNotificationService()
        results = notification_service.process_expiry_notifications(db)
        
        print(f"Results: {results}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        db.close()