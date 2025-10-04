# backend/app/services/referral_service.py - COMPLETE WITH ALL FIELDS
from sqlalchemy.orm import Session
from app.models.referral import Referral, ReferralStatus
from app.models.document import Document
from app.schemas.referral import ReferralCreate
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

class ReferralService:
    @staticmethod
    def create_referral(db: Session, referral_data: ReferralCreate) -> Referral:
        """Create a new referral"""
        referral = Referral(
            # Client Details
            first_name=referral_data.first_name,
            last_name=referral_data.last_name,
            date_of_birth=referral_data.date_of_birth,
            phone_number=referral_data.phone_number,
            email_address=referral_data.email_address,
            street_address=referral_data.street_address,
            city=referral_data.city,
            state=referral_data.state,
            postcode=referral_data.postcode,
            preferred_contact=referral_data.preferred_contact,
            disability_type=referral_data.disability_type,
            
            # Representative Details
            rep_first_name=referral_data.rep_first_name,
            rep_last_name=referral_data.rep_last_name,
            rep_phone_number=referral_data.rep_phone_number,
            rep_email_address=referral_data.rep_email_address,
            rep_street_address=referral_data.rep_street_address,
            rep_city=referral_data.rep_city,
            rep_state=referral_data.rep_state,
            rep_postcode=referral_data.rep_postcode,
            rep_relationship=referral_data.rep_relationship,
            
            # NDIS Details
            plan_type=referral_data.plan_type,
            plan_manager_name=referral_data.plan_manager_name,
            plan_manager_agency=referral_data.plan_manager_agency,
            ndis_number=referral_data.ndis_number,
            available_funding=referral_data.available_funding,
            plan_start_date=referral_data.plan_start_date,
            plan_review_date=referral_data.plan_review_date,
            client_goals=referral_data.client_goals,
            support_category=referral_data.support_category,
            
            # Referrer Details
            referrer_first_name=referral_data.referrer_first_name,
            referrer_last_name=referral_data.referrer_last_name,
            referrer_agency=referral_data.referrer_agency,
            referrer_role=referral_data.referrer_role,
            referrer_email=referral_data.referrer_email,
            referrer_phone=referral_data.referrer_phone,
            
            # Reason for Referral
            referred_for=referral_data.referred_for,
            referred_for_other=referral_data.referred_for_other,
            reason_for_referral=referral_data.reason_for_referral,
            urgency_level=referral_data.urgency_level,
            current_supports=referral_data.current_supports,
            support_goals=referral_data.support_goals,
            accessibility_needs=referral_data.accessibility_needs,
            cultural_considerations=referral_data.cultural_considerations,
            
            # Consent
            consent_checkbox=referral_data.consent_checkbox,
            
            # Status
            status=ReferralStatus.submitted,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(referral)
        db.commit()
        db.refresh(referral)
        
        return referral

    @staticmethod
    def get_referrals(db: Session, skip: int = 0, limit: int = 100) -> List[Referral]:
        """Get all referrals with pagination"""
        return db.query(Referral).offset(skip).limit(limit).all()

    @staticmethod
    def get_referrals_with_file_count(db: Session, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all referrals with file count - INCLUDES ALL FIELDS"""
        referrals = db.query(Referral).offset(skip).limit(limit).all()
        
        result = []
        for ref in referrals:
            # Count attached files
            file_count = db.query(Document).filter(Document.referral_id == ref.id).count()
            
            result.append({
                "id": ref.id,
                "first_name": ref.first_name,
                "last_name": ref.last_name,
                "date_of_birth": ref.date_of_birth.isoformat() if ref.date_of_birth else None,
                "phone_number": ref.phone_number,
                "email_address": ref.email_address,
                "street_address": ref.street_address,
                "city": ref.city,
                "state": ref.state,
                "postcode": ref.postcode,
                "preferred_contact": ref.preferred_contact,
                "disability_type": ref.disability_type,
                
                # Representative info
                "rep_first_name": ref.rep_first_name,
                "rep_last_name": ref.rep_last_name,
                "rep_phone_number": ref.rep_phone_number,
                "rep_email_address": ref.rep_email_address,
                "rep_street_address": ref.rep_street_address,
                "rep_city": ref.rep_city,
                "rep_state": ref.rep_state,
                "rep_postcode": ref.rep_postcode,
                "rep_relationship": ref.rep_relationship,
                
                # NDIS info
                "ndis_number": ref.ndis_number,
                "plan_type": ref.plan_type,
                "plan_manager_name": ref.plan_manager_name,
                "plan_manager_agency": ref.plan_manager_agency,
                "available_funding": ref.available_funding,
                "plan_start_date": ref.plan_start_date.isoformat() if ref.plan_start_date else None,
                "plan_review_date": ref.plan_review_date.isoformat() if ref.plan_review_date else None,
                "client_goals": ref.client_goals,
                "support_category": ref.support_category,
                
                # Referrer info
                "referrer_first_name": ref.referrer_first_name,
                "referrer_last_name": ref.referrer_last_name,
                "referrer_agency": ref.referrer_agency,
                "referrer_role": ref.referrer_role,
                "referrer_email": ref.referrer_email,
                "referrer_phone": ref.referrer_phone,
                
                # Referral details
                "referred_for": ref.referred_for,
                "referred_for_other": ref.referred_for_other,
                "reason_for_referral": ref.reason_for_referral,
                "urgency_level": ref.urgency_level,
                "current_supports": ref.current_supports,
                "support_goals": ref.support_goals,
                "accessibility_needs": ref.accessibility_needs,
                "cultural_considerations": ref.cultural_considerations,
                
                # Consent
                "consent_checkbox": ref.consent_checkbox,
                
                # Status
                "status": ref.status,
                "created_at": ref.created_at.isoformat() if ref.created_at else None,
                "updated_at": ref.updated_at.isoformat() if ref.updated_at else None,
                
                # Internal tracking
                "internal_notes": ref.internal_notes,
                "follow_up_required": ref.follow_up_required,
                "assigned_to": ref.assigned_to,
                
                # File count
                "file_count": file_count
            })
        
        return result

    @staticmethod
    def get_referral(db: Session, referral_id: int) -> Optional[Referral]:
        """Get a specific referral by ID"""
        return db.query(Referral).filter(Referral.id == referral_id).first()

    @staticmethod
    def get_referral_with_files(db: Session, referral_id: int) -> Optional[Dict[str, Any]]:
        """Get a referral with all its attached files - COMPLETE DATA"""
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        
        if not referral:
            return None
        
        # Get attached files
        files = db.query(Document).filter(Document.referral_id == referral_id).all()
        
        return {
            "id": referral.id,
            "first_name": referral.first_name,
            "last_name": referral.last_name,
            "date_of_birth": referral.date_of_birth.isoformat() if referral.date_of_birth else None,
            "phone_number": referral.phone_number,
            "email_address": referral.email_address,
            "street_address": referral.street_address,
            "city": referral.city,
            "state": referral.state,
            "postcode": referral.postcode,
            "preferred_contact": referral.preferred_contact,
            "disability_type": referral.disability_type,
            
            # Representative Details
            "rep_first_name": referral.rep_first_name,
            "rep_last_name": referral.rep_last_name,
            "rep_phone_number": referral.rep_phone_number,
            "rep_email_address": referral.rep_email_address,
            "rep_street_address": referral.rep_street_address,
            "rep_city": referral.rep_city,
            "rep_state": referral.rep_state,
            "rep_postcode": referral.rep_postcode,
            "rep_relationship": referral.rep_relationship,
            
            # NDIS Details
            "ndis_number": referral.ndis_number,
            "plan_type": referral.plan_type,
            "plan_manager_name": referral.plan_manager_name,
            "plan_manager_agency": referral.plan_manager_agency,
            "available_funding": referral.available_funding,
            "plan_start_date": referral.plan_start_date.isoformat() if referral.plan_start_date else None,
            "plan_review_date": referral.plan_review_date.isoformat() if referral.plan_review_date else None,
            "client_goals": referral.client_goals,
            "support_category": referral.support_category,
            
            # Referrer Details
            "referrer_first_name": referral.referrer_first_name,
            "referrer_last_name": referral.referrer_last_name,
            "referrer_agency": referral.referrer_agency,
            "referrer_role": referral.referrer_role,
            "referrer_email": referral.referrer_email,
            "referrer_phone": referral.referrer_phone,
            
            # Reason for Referral
            "referred_for": referral.referred_for,
            "referred_for_other": referral.referred_for_other,
            "reason_for_referral": referral.reason_for_referral,
            "urgency_level": referral.urgency_level,
            "current_supports": referral.current_supports,
            "support_goals": referral.support_goals,
            "accessibility_needs": referral.accessibility_needs,
            "cultural_considerations": referral.cultural_considerations,
            
            # Consent
            "consent_checkbox": referral.consent_checkbox,
            
            # Status and tracking
            "status": referral.status,
            "created_at": referral.created_at.isoformat() if referral.created_at else None,
            "updated_at": referral.updated_at.isoformat() if referral.updated_at else None,
            "internal_notes": referral.internal_notes,
            "follow_up_required": referral.follow_up_required,
            "assigned_to": referral.assigned_to,
            
            # Attached files
            "attached_files": [
                {
                    "file_id": file.file_id,
                    "original_name": file.original_filename,
                    "file_url": file.file_url,
                    "file_size": file.file_size,
                    "file_type": file.mime_type,
                    "uploaded_at": file.uploaded_at.isoformat() if file.uploaded_at else None,
                    "description": file.description
                }
                for file in files
            ]
        }

    @staticmethod
    def update_referral_status(db: Session, referral_id: int, status: str, notes: Optional[str] = None) -> Optional[Referral]:
        """Update referral status"""
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        
        if not referral:
            return None
        
        referral.status = status
        if notes:
            referral.internal_notes = notes
        referral.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(referral)
        
        return referral

    @staticmethod
    def add_file_to_referral(db: Session, referral_id: int, file_id: str) -> bool:
        """Associate a file with a referral"""
        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        if not referral:
            return False
        
        document = db.query(Document).filter(Document.file_id == file_id).first()
        if not document:
            return False
        
        document.referral_id = referral_id
        db.commit()
        
        return True

    @staticmethod
    def remove_file_from_referral(db: Session, referral_id: int, file_id: str) -> bool:
        """Remove file association from a referral"""
        document = db.query(Document).filter(
            Document.file_id == file_id,
            Document.referral_id == referral_id
        ).first()
        
        if not document:
            return False
        
        document.referral_id = None
        db.commit()
        
        return True