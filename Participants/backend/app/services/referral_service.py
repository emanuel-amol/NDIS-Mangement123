# backend/app/services/referral_service.py - UPDATED WITH EMAIL AND FILE INTEGRATION
from sqlalchemy.orm import Session
from app.models.referral import Referral
from app.models.document import Document
from app.schemas.referral import ReferralCreate
from app.services.email_service import EmailService
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ReferralService:
    
    @staticmethod
    def create_referral(db: Session, referral_data: ReferralCreate) -> Referral:
        """Create a new referral with email notifications and file handling"""
        try:
            # Extract file data if present
            attached_files_data = getattr(referral_data, 'attached_files', [])
            
            # Create referral data without file information
            referral_dict = referral_data.dict()
            referral_dict.pop('attached_files', None)  # Remove files from referral data
            
            # Create referral in database
            db_referral = Referral(**referral_dict)
            db.add(db_referral)
            db.commit()
            db.refresh(db_referral)
            
            # Associate any uploaded files with this referral
            if attached_files_data:
                try:
                    for file_data in attached_files_data:
                        # Update existing file records to associate with this referral
                        if isinstance(file_data, dict) and 'file_id' in file_data:
                            file_record = db.query(Document).filter(
                                Document.file_id == file_data['file_id']
                            ).first()
                            if file_record:
                                file_record.referral_id = db_referral.id
                                db.add(file_record)
                    
                    db.commit()
                    logger.info(f"Associated {len(attached_files_data)} files with referral {db_referral.id}")
                except Exception as e:
                    logger.warning(f"Error associating files with referral {db_referral.id}: {str(e)}")
            
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
        """Get a referral by ID with associated files"""
        return db.query(Referral).filter(Referral.id == referral_id).first()
    
    @staticmethod
    def get_referrals(db: Session, skip: int = 0, limit: int = 100) -> List[Referral]:
        """Get referrals with pagination"""
        return db.query(Referral).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_referral_with_files(db: Session, referral_id: int) -> Optional[Dict[str, Any]]:
        """Get a referral with all associated files"""
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        if not referral:
            return None
        
        # Get associated files
        files = db.query(Document).filter(Document.referral_id == referral_id).all()
        
        # Convert to dictionary with files
        referral_dict = {
            "id": referral.id,
            "first_name": referral.first_name,
            "last_name": referral.last_name,
            "phone_number": referral.phone_number,
            "email_address": referral.email_address,
            "status": referral.status,
            "created_at": referral.created_at.isoformat() if referral.created_at else "",
            "attached_files": [
                {
                    "file_id": f.file_id,
                    "original_name": f.original_name,
                    "file_url": f.file_url,
                    "file_size": f.file_size,
                    "file_type": f.file_type,
                    "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else "",
                    "description": f.description
                }
                for f in files
            ]
        }
        
        return referral_dict
    
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
            
            # Add internal notes if provided
            if notes:
                existing_notes = db_referral.internal_notes or ""
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                new_note = f"[{timestamp}] Status changed from {old_status} to {status}: {notes}"
                db_referral.internal_notes = f"{existing_notes}\n{new_note}" if existing_notes else new_note
            
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
    def add_file_to_referral(db: Session, referral_id: int, file_id: str) -> bool:
        """Associate an uploaded file with a referral"""
        try:
            # Check if referral exists
            referral = db.query(Referral).filter(Referral.id == referral_id).first()
            if not referral:
                logger.error(f"Referral {referral_id} not found")
                return False
            
            # Find the file record
            file_record = db.query(Document).filter(Document.file_id == file_id).first()
            if not file_record:
                logger.error(f"File {file_id} not found")
                return False
            
            # Associate file with referral
            file_record.referral_id = referral_id
            db.commit()
            
            logger.info(f"File {file_id} associated with referral {referral_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error associating file with referral: {str(e)}")
            db.rollback()
            return False
    
    @staticmethod
    def remove_file_from_referral(db: Session, referral_id: int, file_id: str) -> bool:
        """Remove file association from a referral"""
        try:
            # Find the file record
            file_record = db.query(Document).filter(
                Document.file_id == file_id,
                Document.referral_id == referral_id
            ).first()
            
            if not file_record:
                logger.error(f"File {file_id} not found for referral {referral_id}")
                return False
            
            # Remove association (don't delete the file, just unlink it)
            file_record.referral_id = None
            db.commit()
            
            logger.info(f"File {file_id} unlinked from referral {referral_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error removing file from referral: {str(e)}")
            db.rollback()
            return False
    
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
    
    @staticmethod
    def get_referrals_with_file_count(db: Session, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get referrals with file count for dashboard/management views"""
        from sqlalchemy import func
        
        # Query referrals with file count
        query = db.query(
            Referral,
            func.count(Document.id).label('file_count')
        ).outerjoin(
            Document, Referral.id == Document.referral_id
        ).group_by(Referral.id).offset(skip).limit(limit)
        
        results = []
        for referral, file_count in query:
            results.append({
                "id": referral.id,
                "first_name": referral.first_name,
                "last_name": referral.last_name,
                "phone_number": referral.phone_number,
                "email_address": referral.email_address,
                "status": referral.status,
                "created_at": referral.created_at.isoformat() if referral.created_at else "",
                "disability_type": referral.disability_type,
                "urgency_level": referral.urgency_level,
                "referred_for": referral.referred_for,
                "referrer_first_name": referral.referrer_first_name,
                "referrer_last_name": referral.referrer_last_name,
                "plan_type": referral.plan_type,
                "support_category": referral.support_category,
                "file_count": file_count or 0
            })
        
        return results