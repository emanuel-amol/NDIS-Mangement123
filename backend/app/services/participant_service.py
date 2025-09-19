# backend/app/services/participant_service.py
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.participant import Participant
from app.models.referral import Referral
from app.schemas.participant import ParticipantCreate, ParticipantUpdate
from typing import List, Optional
from datetime import datetime

class ParticipantService:
    
    @staticmethod
    def create_participant_from_referral(db: Session, referral_id: int) -> Optional[Participant]:
        """Convert a referral to a participant"""
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        if not referral:
            raise ValueError("Referral not found")
        
        # Check if participant already exists for this referral
        existing_participant = db.query(Participant).filter(Participant.referral_id == referral_id).first()
        if existing_participant:
            raise ValueError("Participant already exists for this referral")
        
        # Create participant from referral data
        participant_data = {
            "referral_id": referral.id,
            "first_name": referral.first_name,
            "last_name": referral.last_name,
            "date_of_birth": referral.date_of_birth,
            "phone_number": referral.phone_number,
            "email_address": referral.email_address,
            "street_address": referral.street_address,
            "city": referral.city,
            "state": referral.state,
            "postcode": referral.postcode,
            "preferred_contact": referral.preferred_contact,
            "disability_type": referral.disability_type,
            "rep_first_name": referral.rep_first_name,
            "rep_last_name": referral.rep_last_name,
            "rep_phone_number": referral.rep_phone_number,
            "rep_email_address": referral.rep_email_address,
            "rep_street_address": referral.rep_street_address,
            "rep_city": referral.rep_city,
            "rep_state": referral.rep_state,
            "rep_postcode": referral.rep_postcode,
            "rep_relationship": referral.rep_relationship,
            "ndis_number": referral.ndis_number,
            "plan_type": referral.plan_type,
            "plan_manager_name": referral.plan_manager_name,
            "plan_manager_agency": referral.plan_manager_agency,
            "available_funding": referral.available_funding,
            "plan_start_date": referral.plan_start_date,
            "plan_review_date": referral.plan_review_date,
            "support_category": referral.support_category,
            "client_goals": referral.client_goals,
            "support_goals": referral.support_goals,
            "current_supports": referral.current_supports,
            "accessibility_needs": referral.accessibility_needs,
            "cultural_considerations": referral.cultural_considerations,
            "status": "prospective"
        }
        
        db_participant = Participant(**participant_data)
        db.add(db_participant)
        db.commit()
        db.refresh(db_participant)
        
        # Update referral status
        referral.status = "converted_to_participant"
        db.commit()
        
        return db_participant
    
    @staticmethod
    def create_participant(db: Session, participant_data: ParticipantCreate) -> Participant:
        """Create a new participant directly"""
        db_participant = Participant(**participant_data.dict())
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
        """Update a participant"""
        db_participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not db_participant:
            return None
        
        # Update only provided fields
        update_data = participant_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_participant, field, value)
        
        db.commit()
        db.refresh(db_participant)
        return db_participant
    
    @staticmethod
    def update_participant_status(
        db: Session, 
        participant_id: int, 
        status: str
    ) -> Optional[Participant]:
        """Update participant status"""
        db_participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not db_participant:
            return None
        
        db_participant.status = status
        
        # Auto-update onboarding flags based on status
        if status == "onboarded":
            db_participant.onboarding_completed = True
        elif status == "active":
            db_participant.onboarding_completed = True
            db_participant.care_plan_completed = True
        
        db.commit()
        db.refresh(db_participant)
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