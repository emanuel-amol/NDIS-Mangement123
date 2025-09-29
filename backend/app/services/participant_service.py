# backend/app/services/participant_service.py - FIXED VERSION WITH NDIS NUMBER HANDLING
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.participant import Participant
from app.models.referral import Referral
from app.schemas.participant import ParticipantCreate, ParticipantUpdate
from app.services.email_service import EmailService
from app.services.referral_service import ReferralService
from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ParticipantService:
    
    @staticmethod
    def _clean_string_field(value: str) -> Optional[str]:
        """Helper method to clean string fields - convert empty strings to None"""
        if not value or not value.strip():
            return None
        return value.strip()
    
    @staticmethod
    def create_participant_from_referral(db: Session, referral_id: int) -> Optional[Participant]:
        """Convert a referral to a participant with email notifications - FIXED VERSION"""
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        if not referral:
            raise ValueError("Referral not found")
        
        # Check if participant already exists for this referral
        existing_participant = db.query(Participant).filter(Participant.referral_id == referral_id).first()
        if existing_participant:
            raise ValueError("Participant already exists for this referral")
        
        try:
            # Create participant from referral data - FIXED WITH PROPER NULL HANDLING
            participant_data = {
                "referral_id": referral.id,
                "first_name": referral.first_name,
                "last_name": referral.last_name,
                "date_of_birth": referral.date_of_birth,
                "phone_number": referral.phone_number,
                "email_address": ParticipantService._clean_string_field(referral.email_address),
                "street_address": referral.street_address,
                "city": referral.city,
                "state": referral.state,
                "postcode": referral.postcode,
                "preferred_contact": referral.preferred_contact,
                "disability_type": referral.disability_type,
                
                # Representative Details - Clean all fields
                "rep_first_name": ParticipantService._clean_string_field(referral.rep_first_name),
                "rep_last_name": ParticipantService._clean_string_field(referral.rep_last_name),
                "rep_phone_number": ParticipantService._clean_string_field(referral.rep_phone_number),
                "rep_email_address": ParticipantService._clean_string_field(referral.rep_email_address),
                "rep_street_address": ParticipantService._clean_string_field(referral.rep_street_address),
                "rep_city": ParticipantService._clean_string_field(referral.rep_city),
                "rep_state": ParticipantService._clean_string_field(referral.rep_state),
                "rep_postcode": ParticipantService._clean_string_field(referral.rep_postcode),
                "rep_relationship": ParticipantService._clean_string_field(referral.rep_relationship),
                
                # CRITICAL FIX: Handle NDIS number properly to avoid unique constraint violation
                "ndis_number": ParticipantService._clean_string_field(referral.ndis_number),
                
                "plan_type": referral.plan_type,
                "plan_manager_name": ParticipantService._clean_string_field(referral.plan_manager_name),
                "plan_manager_agency": ParticipantService._clean_string_field(referral.plan_manager_agency),
                "available_funding": ParticipantService._clean_string_field(referral.available_funding),
                "plan_start_date": referral.plan_start_date,
                "plan_review_date": referral.plan_review_date,
                "support_category": referral.support_category,
                "client_goals": referral.client_goals,
                "support_goals": ParticipantService._clean_string_field(referral.support_goals),
                "current_supports": ParticipantService._clean_string_field(referral.current_supports),
                "accessibility_needs": ParticipantService._clean_string_field(referral.accessibility_needs),
                "cultural_considerations": ParticipantService._clean_string_field(referral.cultural_considerations),
                "status": "prospective"
            }
            
            logger.info(f"Creating participant with NDIS number: '{participant_data.get('ndis_number')}' (None if empty)")
            
            db_participant = Participant(**participant_data)
            db.add(db_participant)
            db.commit()
            db.refresh(db_participant)
            
            # Update referral status to converted
            # Update referral status to converted
            referral.status = "converted"
            referral.converted_to_participant_id = db_participant.id
            referral.converted_at = datetime.now()
            db.commit()
            
            # Send conversion notification email
            try:
                ReferralService.notify_referral_conversion(db, referral, db_participant)
            except Exception as e:
                logger.error(f"Error sending conversion notification: {str(e)}")
                # Don't fail the conversion if email fails
            
            logger.info(f"Successfully converted referral {referral_id} to participant {db_participant.id}")
            return db_participant
            
        except Exception as e:
            logger.error(f"Error converting referral {referral_id} to participant: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def create_participant(db: Session, participant_data: ParticipantCreate) -> Participant:
        """Create a new participant directly - FIXED VERSION"""
        # Convert participant data to dict and clean fields
        data_dict = participant_data.dict()
        
        # Clean string fields that might be empty
        clean_fields = [
            'email_address', 'rep_first_name', 'rep_last_name', 'rep_phone_number',
            'rep_email_address', 'rep_street_address', 'rep_city', 'rep_state',
            'rep_postcode', 'rep_relationship', 'ndis_number', 'plan_manager_name',
            'plan_manager_agency', 'available_funding', 'support_goals',
            'current_supports', 'accessibility_needs', 'cultural_considerations',
            'risk_notes'
        ]
        
        for field in clean_fields:
            if field in data_dict:
                data_dict[field] = ParticipantService._clean_string_field(data_dict[field])
        
        logger.info(f"Creating participant directly with NDIS number: '{data_dict.get('ndis_number')}' (None if empty)")
        
        db_participant = Participant(**data_dict)
        db.add(db_participant)
        db.commit()
        db.refresh(db_participant)
        return db_participant
    
    @staticmethod
    def get_participant(db: Session, participant_id: int) -> Optional[Participant]:
        """Get a participant by ID"""
        return db.query(Participant).filter(Participant.id == participant_id).first()
    
    @staticmethod
    def get_participants(
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[str] = None,
        support_category: Optional[str] = None
    ) -> List[Participant]:
        """Get participants with filtering"""
        query = db.query(Participant)
        
        # Apply search filter
        if search:
            search_filter = or_(
                Participant.first_name.ilike(f"%{search}%"),
                Participant.last_name.ilike(f"%{search}%"),
                Participant.ndis_number.ilike(f"%{search}%"),
                Participant.email_address.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        # Apply status filter
        if status and status != "all":
            query = query.filter(Participant.status == status)
        
        # Apply support category filter
        if support_category and support_category != "all":
            query = query.filter(Participant.support_category == support_category)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def update_participant(
        db: Session, 
        participant_id: int, 
        participant_data: ParticipantUpdate
    ) -> Optional[Participant]:
        """Update a participant - FIXED VERSION"""
        db_participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not db_participant:
            return None
        
        # Update only provided fields and clean string fields
        update_data = participant_data.dict(exclude_unset=True)
        
        # Clean string fields before updating
        clean_fields = [
            'email_address', 'rep_first_name', 'rep_last_name', 'rep_phone_number',
            'rep_email_address', 'rep_street_address', 'rep_city', 'rep_state',
            'rep_postcode', 'rep_relationship', 'ndis_number', 'plan_manager_name',
            'plan_manager_agency', 'available_funding', 'support_goals',
            'current_supports', 'accessibility_needs', 'cultural_considerations',
            'risk_notes'
        ]
        
        for field in clean_fields:
            if field in update_data:
                update_data[field] = ParticipantService._clean_string_field(update_data[field])
        
        # Apply updates
        for field, value in update_data.items():
            setattr(db_participant, field, value)
        
        db.commit()
        db.refresh(db_participant)
        return db_participant
    
    @staticmethod
    def update_participant_status(
        db: Session, 
        participant_id: int, 
        status: str,
        notify_via_email: bool = False
    ) -> Optional[Participant]:
        """Update participant status with optional email notification"""
        db_participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not db_participant:
            return None
        
        old_status = db_participant.status
        db_participant.status = status
        
        # Auto-update onboarding flags based on status
        if status == "onboarded":
            db_participant.onboarding_completed = True
        elif status == "active":
            db_participant.onboarding_completed = True
            db_participant.care_plan_completed = True
        
        db.commit()
        db.refresh(db_participant)
        
        # Send email notification if requested and status changed
        if notify_via_email and old_status != status:
            try:
                # You could extend the EmailService to include participant status updates
                # For now, we'll log this as a placeholder
                logger.info(f"Participant {participant_id} status changed from {old_status} to {status}")
                # TODO: Add participant status update email functionality to EmailService
            except Exception as e:
                logger.error(f"Error sending participant status update email: {str(e)}")
        
        return db_participant
    
    @staticmethod
    def delete_participant(db: Session, participant_id: int) -> bool:
        """Delete a participant"""
        db_participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not db_participant:
            return False
        
        db.delete(db_participant)
        db.commit()
        return True
    
    @staticmethod
    def get_participant_stats(db: Session) -> dict:
        """Get participant statistics"""
        total = db.query(Participant).count()
        active = db.query(Participant).filter(Participant.status == "active").count()
        prospective = db.query(Participant).filter(Participant.status == "prospective").count()
        onboarded = db.query(Participant).filter(Participant.status == "onboarded").count()
        
        # Get new participants this week
        from datetime import datetime, timedelta
        week_ago = datetime.now() - timedelta(days=7)
        new_this_week = db.query(Participant).filter(Participant.created_at >= week_ago).count()
        
        return {
            "total": total,
            "active": active,
            "prospective": prospective,
            "onboarded": onboarded,
            "new_this_week": new_this_week
        }
    
    @staticmethod
    def clean_existing_participants(db: Session) -> dict:
        """Clean existing participants with empty NDIS numbers - UTILITY METHOD"""
        try:
            # Count participants with empty NDIS numbers
            empty_ndis_count = db.query(Participant).filter(
                or_(
                    Participant.ndis_number == '',
                    Participant.ndis_number.is_(None)
                )
            ).count()
            
            # Update empty strings to NULL
            updated_count = db.query(Participant).filter(
                Participant.ndis_number == ''
            ).update(
                {Participant.ndis_number: None},
                synchronize_session=False
            )
            
            db.commit()
            
            logger.info(f"Cleaned {updated_count} participants with empty NDIS numbers")
            
            return {
                "total_empty_ndis": empty_ndis_count,
                "updated_to_null": updated_count,
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"Error cleaning participants: {str(e)}")
            db.rollback()
            return {
                "error": str(e),
                "status": "failed"
            }