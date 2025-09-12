import asyncio
from typing import List, Optional, Dict, Any
from celery import current_task
from sqlalchemy.orm import Session
from app.core.celery_app import celery_app
from app.core.database import get_db
from app.services.email_service import EmailService
from app.models.referral import Referral


def get_database_session():
    """Get database session for tasks"""
    try:
        db = next(get_db())
        return db
    except Exception as e:
        print(f"Error getting database session: {e}")
        return None


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def send_referral_notifications(self, referral_id: int, provider_emails: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Celery task to send all email notifications for a new referral
    
    Args:
        referral_id: ID of the referral to send notifications for
        provider_emails: Optional list of provider email addresses
    
    Returns:
        Dict containing results of each notification type
    """
    db = None
    try:
        # Update task state
        if current_task:
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 0, 'total': 3, 'status': 'Fetching referral data...'}
            )
        
        # Get referral from database
        db = get_database_session()
        if not db:
            raise ValueError("Could not establish database connection")
            
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        
        if not referral:
            raise ValueError(f"Referral with ID {referral_id} not found")
        
        # Initialize email service
        email_service = EmailService()
        
        if not email_service.is_configured():
            raise ValueError("Email service is not properly configured")
        
        # Update task state
        if current_task:
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 1, 'total': 3, 'status': 'Sending notifications...'}
            )
        
        # Run async email sending in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            results = loop.run_until_complete(
                email_service.send_all_notifications(referral, provider_emails, db)
            )
        finally:
            loop.close()
        
        # Update task state
        if current_task:
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 3, 'total': 3, 'status': 'Notifications sent successfully'}
            )
        
        return {
            'referral_id': referral_id,
            'success': True,
            'results': results,
            'message': f'Email notifications processed for referral #{referral_id}'
        }
        
    except Exception as e:
        # Log the error
        print(f"Error in send_referral_notifications task: {str(e)}")
        
        # Update task state for error
        if current_task:
            current_task.update_state(
                state='FAILURE',
                meta={'error': str(e), 'referral_id': referral_id}
            )
            
        # Re-raise for Celery retry mechanism
        raise
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def send_provider_notification(self, referral_id: int, provider_emails: List[str]) -> Dict[str, Any]:
    """
    Celery task to send provider notification email
    
    Args:
        referral_id: ID of the referral
        provider_emails: List of provider email addresses
    
    Returns:
        Dict containing task results
    """
    db = None
    try:
        # Get referral from database
        db = get_database_session()
        if not db:
            raise ValueError("Could not establish database connection")
            
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        
        if not referral:
            raise ValueError(f"Referral with ID {referral_id} not found")
        
        # Initialize email service
        email_service = EmailService()
        
        # Run async email sending
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            success = loop.run_until_complete(
                email_service.send_provider_notification(referral, provider_emails)
            )
        finally:
            loop.close()
        
        return {
            'referral_id': referral_id,
            'success': success,
            'message': f'Provider notification {"sent" if success else "failed"} for referral #{referral_id}'
        }
        
    except Exception as e:
        print(f"Error in send_provider_notification task: {str(e)}")
        raise
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def send_participant_confirmation(self, referral_id: int) -> Dict[str, Any]:
    """
    Celery task to send participant confirmation email
    
    Args:
        referral_id: ID of the referral
    
    Returns:
        Dict containing task results
    """
    db = None
    try:
        # Get referral from database
        db = get_database_session()
        if not db:
            raise ValueError("Could not establish database connection")
            
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        
        if not referral:
            raise ValueError(f"Referral with ID {referral_id} not found")
        
        # Initialize email service
        email_service = EmailService()
        
        # Run async email sending
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            success = loop.run_until_complete(
                email_service.send_participant_confirmation(referral)
            )
        finally:
            loop.close()
        
        return {
            'referral_id': referral_id,
            'success': success,
            'message': f'Participant confirmation {"sent" if success else "failed"} for referral #{referral_id}'
        }
        
    except Exception as e:
        print(f"Error in send_participant_confirmation task: {str(e)}")
        raise
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 2, 'countdown': 30})
def test_email_configuration(self) -> Dict[str, Any]:
    """
    Celery task to test email configuration
    
    Returns:
        Dict containing test results
    """
    try:
        email_service = EmailService()
        
        is_configured = email_service.is_configured()
        
        return {
            'success': True,
            'is_configured': is_configured,
            'message': 'Email configuration test completed',
            'config_status': 'Valid' if is_configured else 'Invalid - missing required settings'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': 'Email configuration test failed'
        }