from sqlalchemy.orm import Session
from app.models.referral import Referral
from app.schemas.referral import ReferralCreate, ReferralUpdate
from typing import List, Optional

class ReferralService:
    @staticmethod
    def create_referral(db: Session, referral_data: ReferralCreate) -> Referral:
        """Create a new referral from form submission"""
        db_referral = Referral(
            # Client Details
            first_name=referral_data.firstName,
            last_name=referral_data.lastName,
            date_of_birth=referral_data.dateOfBirth,
            phone_number=referral_data.phoneNumber,
            email_address=referral_data.emailAddress,
            street_address=referral_data.streetAddress,
            city=referral_data.city,
            state=referral_data.state,
            postcode=referral_data.postcode,
            
            # Representative Details (Optional)
            rep_first_name=referral_data.repFirstName,
            rep_last_name=referral_data.repLastName,
            rep_phone_number=referral_data.repPhoneNumber,
            rep_email_address=referral_data.repEmailAddress,
            rep_relationship=referral_data.repRelationship,
            
            # Default status
            status="new"
        )
        
        db.add(db_referral)
        db.commit()
        db.refresh(db_referral)
        return db_referral
    
    @staticmethod
    def get_referral(db: Session, referral_id: int) -> Optional[Referral]:
        """Get a referral by ID"""
        return db.query(Referral).filter(Referral.id == referral_id).first()
    
    @staticmethod
    def get_referrals(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None) -> List[Referral]:
        """Get all referrals with optional filtering"""
        query = db.query(Referral)
        
        if status:
            query = query.filter(Referral.status == status)
            
        return query.order_by(Referral.created_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_referral(db: Session, referral_id: int, referral_update: ReferralUpdate) -> Optional[Referral]:
        """Update a referral (for admin use)"""
        db_referral = db.query(Referral).filter(Referral.id == referral_id).first()
        
        if db_referral:
            update_data = referral_update.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_referral, field, value)
            
            db.commit()
            db.refresh(db_referral)
            
        return db_referral
    
    @staticmethod
    def delete_referral(db: Session, referral_id: int) -> bool:
        """Delete a referral"""
        db_referral = db.query(Referral).filter(Referral.id == referral_id).first()
        
        if db_referral:
            db.delete(db_referral)
            db.commit()
            return True
            
        return False