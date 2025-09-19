# backend/app/services/referral_service.py
from sqlalchemy.orm import Session
from app.models.referral import Referral
from app.schemas.referral import ReferralCreate
from typing import List

class ReferralService:
    @staticmethod
    def create_referral(db: Session, referral_data: ReferralCreate) -> Referral:
        """Create a new referral in the database"""
        db_referral = Referral(**referral_data.dict())
        db.add(db_referral)
        db.commit()
        db.refresh(db_referral)
        return db_referral
    
    @staticmethod
    def get_referral(db: Session, referral_id: int) -> Referral:
        """Get a referral by ID"""
        return db.query(Referral).filter(Referral.id == referral_id).first()
    
    @staticmethod
    def get_referrals(db: Session, skip: int = 0, limit: int = 100) -> List[Referral]:
        """Get all referrals with pagination"""
        return db.query(Referral).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_referral_status(db: Session, referral_id: int, status: str) -> Referral:
        """Update referral status"""
        db_referral = db.query(Referral).filter(Referral.id == referral_id).first()
        if db_referral:
            db_referral.status = status
            db.commit()
            db.refresh(db_referral)
        return db_referral