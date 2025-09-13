# backend/app/api/v1/referrals.py
from __future__ import annotations

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app.core.database import get_db
from app.schemas.referral import ReferralCreate, ReferralResponse, ReferralUpdate
from app.services.referral_service import ReferralService
from app.services.email_service import EmailService
from app.models.user import User, UserRole, get_providers_for_service, get_admins
from app.models.referral import Referral

router = APIRouter()
log = logging.getLogger(__name__)


def get_provider_emails_for_referral(referral, db: Session) -> List[str]:
    """
    Get provider emails based on referral type from database
    
    Args:
        referral: The referral object
        db: Database session
        
    Returns:
        List of provider email addresses from database
    """
    provider_emails = []
    
    try:
        # Get all admin emails (always included)
        admins = get_admins(db)
        admin_emails = [admin.email for admin in admins if admin.email]
        provider_emails.extend(admin_emails)
        print(f"Found {len(admin_emails)} admin emails: {admin_emails}")
        
        # Get providers who can handle this service type
        service_type = referral.referred_for.lower() if hasattr(referral, 'referred_for') and referral.referred_for else 'general'
        print(f"Looking for providers for service type: '{service_type}'")
        
        providers = get_providers_for_service(db, service_type)
        provider_specific_emails = [provider.email for provider in providers if provider.email]
        provider_emails.extend(provider_specific_emails)
        print(f"Found {len(providers)} specific providers for {service_type}")
        print(f"Provider emails from database: {provider_specific_emails}")
        
        # If no specific providers found, get all active providers as fallback
        if not providers:
            print(f"No specific providers found for {service_type}, getting all active providers")
            all_providers = db.query(User).filter(
                User.role == UserRole.PROVIDER,
                User.is_active == True,
                User.email.isnot(None)
            ).all()
            provider_emails.extend([provider.email for provider in all_providers if provider.email])
            print(f"Fallback: Found {len(all_providers)} total active providers")
        
        # Remove duplicates and return
        unique_emails = list(set(provider_emails))
        print(f"Final result: {len(unique_emails)} unique provider emails: {unique_emails}")
        return unique_emails
        
    except Exception as e:
        print(f"Error fetching provider emails from database: {str(e)}")
        # Fallback to your email if database query fails
        return ["vanshikasmriti024@gmail.com"]  # Fallback email


def orm_to_response(referral: Referral) -> ReferralResponse:
    """Convert ORM Referral to response schema"""
    return ReferralResponse(
        id=referral.id,
        first_name=referral.first_name,
        last_name=referral.last_name,
        date_of_birth=referral.date_of_birth,
        phone_number=referral.phone_number,
        email_address=referral.email_address,
        street_address=referral.street_address,
        city=referral.city,
        state=referral.state,
        postcode=referral.postcode,
        preferred_contact=referral.preferred_contact,
        rep_first_name=referral.rep_first_name,
        rep_last_name=referral.rep_last_name,
        rep_phone_number=referral.rep_phone_number,
        rep_email_address=referral.rep_email_address,
        rep_street_address=referral.rep_street_address,
        rep_city=referral.rep_city,
        rep_state=referral.rep_state,
        rep_postcode=referral.rep_postcode,
        plan_type=referral.plan_type,
        plan_manager_name=referral.plan_manager_name,
        plan_manager_agency=referral.plan_manager_agency,
        ndis_number=referral.ndis_number,
        available_funding=referral.available_funding,
        plan_start_date=referral.plan_start_date,
        plan_review_date=referral.plan_review_date,
        client_goals=referral.client_goals,
        referrer_first_name=referral.referrer_first_name,
        referrer_last_name=referral.referrer_last_name,
        referrer_agency=referral.referrer_agency,
        referrer_role=referral.referrer_role,
        referrer_email=referral.referrer_email,
        referrer_phone=referral.referrer_phone,
        referred_for=referral.referred_for,
        reason_for_referral=referral.reason_for_referral,
        consent_checkbox=referral.consent_checkbox,
        status=referral.status,
        created_at=referral.created_at,
        updated_at=referral.updated_at,
        notes=referral.notes
    )


@router.post("/referral", response_model=ReferralResponse, status_code=status.HTTP_201_CREATED)
async def submit_referral(
    referral_data: ReferralCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a new referral form (Public endpoint - no authentication required)
    This endpoint is used by the public referral form.
    """
    try:
        print(f"Received referral data: {referral_data}")
        # Create the referral
        referral = ReferralService.create_referral(db, referral_data)
        
        # Send email notifications directly (no Celery)
        try:
            # Get provider emails from database/login system
            provider_emails = get_provider_emails_for_referral(referral, db)
            
            # Initialize email service
            email_service = EmailService()
            
            if email_service.is_configured():
                # Send participant confirmation email
                participant_result = await email_service.send_participant_confirmation(referral)
                print(f"Participant confirmation email {'sent' if participant_result else 'failed'} for referral #{referral.id}")
                
                # Send provider notification emails
                provider_result = await email_service.send_provider_notification(referral, provider_emails)
                print(f"Provider notification email {'sent' if provider_result else 'failed'} for referral #{referral.id} to {len(provider_emails)} providers")
            else:
                print(f"Warning: Email service not configured, skipping notifications for referral #{referral.id}")
            
        except Exception as email_error:
            # Log email error but don't fail the referral submission
            print(f"Warning: Failed to send email notifications for referral #{referral.id}: {str(email_error)}")
            import traceback
            traceback.print_exc()
        
        return orm_to_response(referral)
    except Exception as e:
        print(f"Error creating referral: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating referral: {str(e)}"
        )

@router.get(
    "/referrals",
    response_model=list[ReferralResponse],
    name="get_referrals",
    operation_id="get_referrals",
)
def get_referrals(db: Session = Depends(get_db)) -> list[ReferralResponse]:
    rows = db.query(Referral).order_by(Referral.created_at.desc()).all()
    return [orm_to_response(r) for r in rows]

@router.get(
    "/referrals/{referral_id}",
    response_model=ReferralResponse,
    name="get_referral",
    operation_id="get_referral",
)
def get_referral(referral_id: str, db: Session = Depends(get_db)) -> ReferralResponse:
    r = db.get(Referral, referral_id)
    if not r:
        raise HTTPException(status_code=404, detail="Referral not found")
    return orm_to_response(r)

@router.put(
    "/referrals/{referral_id}",
    response_model=ReferralResponse,
    name="update_referral",
    operation_id="update_referral",
)
def update_referral(referral_id: str, body: ReferralUpdate, db: Session = Depends(get_db)) -> ReferralResponse:
    try:
        r = db.get(Referral, referral_id)
        if not r:
            raise HTTPException(status_code=404, detail="Referral not found")

        # Update only provided fields
        for api_key, value in body.model_dump(exclude_unset=True).items():
            if api_key == "firstName":                  r.first_name = value
            elif api_key == "lastName":                 r.last_name = value
            elif api_key == "dateOfBirth":              r.date_of_birth = value
            elif api_key == "phoneNumber":              r.phone_number = value
            elif api_key == "emailAddress":             r.email_address = value
            elif api_key == "streetAddress":            r.street_address = value
            elif api_key == "city":                     r.city = value
            elif api_key == "state":                    r.state = value
            elif api_key == "postcode":                 r.postcode = value
            elif api_key == "disabilityType":           r.disability_type = value
            elif api_key == "serviceTypes":             r.service_types = value
            elif api_key == "ndisNumber":               r.ndis_number = value
            elif api_key == "urgencyLevel":             r.urgency_level = value
            elif api_key == "preferredContactMethod":   r.preferred_contact_method = value
            elif api_key == "currentSupports":          r.current_supports = value
            elif api_key == "supportGoals":             r.support_goals = value
            elif api_key == "accessibilityNeeds":       r.accessibility_needs = value
            elif api_key == "culturalConsiderations":   r.cultural_considerations = value
            elif api_key == "repFirstName":             r.rep_first_name = value
            elif api_key == "repLastName":              r.rep_last_name = value
            elif api_key == "repPhoneNumber":           r.rep_phone_number = value
            elif api_key == "repEmailAddress":          r.rep_email_address = value
            elif api_key == "repRelationship":          r.rep_relationship = value

        r.updated_at = datetime.utcnow()
        db.add(r)
        db.commit()
        db.refresh(r)
        return orm_to_response(r)
    except Exception as e:
        db.rollback()
        log.exception("Update referral failed")
        raise HTTPException(status_code=500, detail=f"Referral update failed: {e!s}")

@router.delete(
    "/referrals/{referral_id}",
    name="delete_referral",
    operation_id="delete_referral",
)
def delete_referral(referral_id: str, db: Session = Depends(get_db)) -> dict:
    try:
        r = db.get(Referral, referral_id)
        if not r:
            raise HTTPException(status_code=404, detail="Referral not found")
        db.delete(r)
        db.commit()
        return {"ok": True, "deleted": referral_id}
    except Exception as e:
        db.rollback()
        log.exception("Delete referral failed")
        raise HTTPException(status_code=500, detail=f"Referral delete failed: {e!s}")