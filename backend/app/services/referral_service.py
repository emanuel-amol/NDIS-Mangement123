# backend/app/services/referral_service.py - UPDATED WITH EMAIL INTEGRATION
from sqlalchemy.orm import Session
from app.models.referral import Referral
from app.schemas.referral import ReferralCreate
from app.services.email_service import EmailService
from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ReferralService:
    
    @staticmethod
    def create_referral(db: Session, referral_data: ReferralCreate) -> Referral:
        """Create a new referral with email notifications"""
        try:
            # Create referral in database
            db_referral = Referral(**referral_data.dict())
            db.add(db_referral)
            db.commit()
            db.refresh(db_referral)
            
            # Send email notifications
            email_service = EmailService()
            
            # Send confirmation to referrer
            try:
                confirmation_sent = email_service.send_referral_confirmation(db_referral)
                if confirmation_sent:
                    logger.info(f"Confirmation email sent for referral {db_referral.id}")
                else:
                    logger.warning(f"Failed to send confirmation email for referral {db_referral.id}")
            except Exception as e:
                logger.error(f"Error sending confirmation email for referral {db_referral.id}: {str(e)}")
            
            # Send notification to admin
            try:
                admin_notified = email_service.send_referral_notification_to_admin(db_referral)
                if admin_notified:
                    logger.info(f"Admin notification sent for referral {db_referral.id}")
                else:
                    logger.warning(f"Failed to send admin notification for referral {db_referral.id}")
            except Exception as e:
                logger.error(f"Error sending admin notification for referral {db_referral.id}: {str(e)}")
            
            return db_referral
            
        except Exception as e:
            logger.error(f"Error creating referral: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def get_referral(db: Session, referral_id: int) -> Optional[Referral]:
        """Get a referral by ID"""
        return db.query(Referral).filter(Referral.id == referral_id).first()
    
    @staticmethod
    def get_referrals(db: Session, skip: int = 0, limit: int = 100) -> List[Referral]:
        """Get referrals with pagination"""
        return db.query(Referral).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_referral_status(
        db: Session, 
        referral_id: int, 
        status: str,
        notes: Optional[str] = None
    ) -> Optional[Referral]:
        """Update referral status with email notification"""
        try:
            db_referral = db.query(Referral).filter(Referral.id == referral_id).first()
            if not db_referral:
                return None
            
            old_status = db_referral.status
            db_referral.status = status
            db_referral.updated_at = datetime.now()
            
            db.commit()
            db.refresh(db_referral)
            
            # Send status update email if status changed
            if old_status != status:
                email_service = EmailService()
                try:
                    status_sent = email_service.send_referral_status_update(
                        db_referral, status, notes
                    )
                    if status_sent:
                        logger.info(f"Status update email sent for referral {referral_id}")
                    else:
                        logger.warning(f"Failed to send status update email for referral {referral_id}")
                except Exception as e:
                    logger.error(f"Error sending status update email for referral {referral_id}: {str(e)}")
            
            return db_referral
            
        except Exception as e:
            logger.error(f"Error updating referral status: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def notify_referral_conversion(
        db: Session,
        referral: Referral,
        participant
    ) -> bool:
        """Send notification when referral is converted to participant"""
        try:
            email_service = EmailService()
            conversion_sent = email_service.send_referral_participant_conversion_notification(
                referral, participant
            )
            
            if conversion_sent:
                logger.info(f"Conversion notification sent for referral {referral.id}")
                return True
            else:
                logger.warning(f"Failed to send conversion notification for referral {referral.id}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending conversion notification for referral {referral.id}: {str(e)}")
            return False