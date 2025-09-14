# backend/app/services/referral_service.py - COMPLETE VERSION
from sqlalchemy.orm import Session
from app.models.referral import Referral
from app.schemas.referral import ReferralCreate, ReferralUpdate, ReferralResponse
from typing import List, Optional
import json
from datetime import datetime

class ReferralService:
    @staticmethod
    def create_referral(db: Session, referral_data: ReferralCreate) -> Referral:
        """Create a new referral from form submission"""
        # Store raw submission for traceability
        raw_submission = referral_data.model_dump()
        
        # Create audit metadata
        metadata = {
            "created_by": "web_form",
            "created_timestamp": datetime.now().isoformat(),
            "source": "referral_form",
            "version": "1.0"
        }
        
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
            preferred_contact=referral_data.preferredContact,
            
            # Representative Details (Optional)
            rep_first_name=referral_data.repFirstName,
            rep_last_name=referral_data.repLastName,
            rep_phone_number=referral_data.repPhoneNumber,
            rep_email_address=referral_data.repEmailAddress,
            rep_street_address=referral_data.repStreetAddress,
            rep_city=referral_data.repCity,
            rep_state=referral_data.repState,
            rep_postcode=referral_data.repPostcode,
            
            # NDIS Details
            plan_type=referral_data.planType,
            plan_manager_name=referral_data.planManagerName,
            plan_manager_agency=referral_data.planManagerAgency,
            ndis_number=referral_data.ndisNumber,
            available_funding=referral_data.availableFunding,
            plan_start_date=referral_data.planStartDate,
            plan_review_date=referral_data.planReviewDate,
            client_goals=referral_data.clientGoals,
            
            # Referrer Details
            referrer_first_name=referral_data.referrerFirstName,
            referrer_last_name=referral_data.referrerLastName,
            referrer_agency=referral_data.referrerAgency,
            referrer_role=referral_data.referrerRole,
            referrer_email=referral_data.referrerEmail,
            referrer_phone=referral_data.referrerPhone,
            
            # Reason for Referral
            referred_for=referral_data.referredFor,
            reason_for_referral=referral_data.reasonForReferral,
            
            # Consent
            consent_checkbox=referral_data.consentCheckbox,
            
            # Default status
            status="new",
            
            # Audit & Metadata
            raw_submission=raw_submission,
            form_metadata=metadata
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
            update_data = referral_update.model_dump(exclude_unset=True)
            
            # Map frontend field names to database field names
            field_mapping = {
                'firstName': 'first_name',
                'lastName': 'last_name',
                'dateOfBirth': 'date_of_birth',
                'phoneNumber': 'phone_number',
                'emailAddress': 'email_address',
                'streetAddress': 'street_address',
                'preferredContact': 'preferred_contact',
                'repFirstName': 'rep_first_name',
                'repLastName': 'rep_last_name',
                'repPhoneNumber': 'rep_phone_number',
                'repEmailAddress': 'rep_email_address',
                'repStreetAddress': 'rep_street_address',
                'repCity': 'rep_city',
                'repState': 'rep_state',
                'repPostcode': 'rep_postcode',
                'planType': 'plan_type',
                'planManagerName': 'plan_manager_name',
                'planManagerAgency': 'plan_manager_agency',
                'ndisNumber': 'ndis_number',
                'availableFunding': 'available_funding',
                'planStartDate': 'plan_start_date',
                'planReviewDate': 'plan_review_date',
                'clientGoals': 'client_goals',
                'referrerFirstName': 'referrer_first_name',
                'referrerLastName': 'referrer_last_name',
                'referrerAgency': 'referrer_agency',
                'referrerRole': 'referrer_role',
                'referrerEmail': 'referrer_email',
                'referrerPhone': 'referrer_phone',
                'referredFor': 'referred_for',
                'reasonForReferral': 'reason_for_referral',
                'consentCheckbox': 'consent_checkbox'
            }
            
            for api_field, value in update_data.items():
                db_field = field_mapping.get(api_field, api_field)
                setattr(db_referral, db_field, value)
            
            db_referral.updated_at = datetime.utcnow()
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