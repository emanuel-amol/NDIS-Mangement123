# backend/app/api/v1/endpoints/referral.py - UPDATED WITH FILE SUPPORT AND FULL DATA RETURN
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.referral import ReferralCreate, ReferralResponse
from app.services.referral_service import ReferralService
from typing import List, Dict, Any

router = APIRouter()

def convert_camel_to_snake(data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert camelCase keys to snake_case"""
    conversion_map = {
        'firstName': 'first_name',
        'lastName': 'last_name', 
        'dateOfBirth': 'date_of_birth',
        'phoneNumber': 'phone_number',
        'emailAddress': 'email_address',
        'streetAddress': 'street_address',
        'preferredContact': 'preferred_contact',
        'disabilityType': 'disability_type',
        'repFirstName': 'rep_first_name',
        'repLastName': 'rep_last_name',
        'repPhoneNumber': 'rep_phone_number',
        'repEmailAddress': 'rep_email_address',
        'repStreetAddress': 'rep_street_address',
        'repCity': 'rep_city',
        'repState': 'rep_state',
        'repPostcode': 'rep_postcode',
        'repRelationship': 'rep_relationship',
        'planType': 'plan_type',
        'planManagerName': 'plan_manager_name',
        'planManagerAgency': 'plan_manager_agency',
        'ndisNumber': 'ndis_number',
        'availableFunding': 'available_funding',
        'planStartDate': 'plan_start_date',
        'planReviewDate': 'plan_review_date',
        'clientGoals': 'client_goals',
        'supportCategory': 'support_category',
        'referrerFirstName': 'referrer_first_name',
        'referrerLastName': 'referrer_last_name',
        'referrerAgency': 'referrer_agency',
        'referrerRole': 'referrer_role',
        'referrerEmail': 'referrer_email',
        'referrerPhone': 'referrer_phone',
        'referredFor': 'referred_for',
        'referredForOther': 'referred_for_other',
        'reasonForReferral': 'reason_for_referral',
        'urgencyLevel': 'urgency_level',
        'currentSupports': 'current_supports',
        'supportGoals': 'support_goals',
        'accessibilityNeeds': 'accessibility_needs',
        'culturalConsiderations': 'cultural_considerations',
        'consentCheckbox': 'consent_checkbox',
        'attachedFiles': 'attached_files',
    }
    
    converted = {}
    for key, value in data.items():
        new_key = conversion_map.get(key, key)
        converted[new_key] = value
    return converted

@router.post("/referral-simple", response_model=ReferralResponse, status_code=status.HTTP_201_CREATED)
def create_referral(
    referral_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Create a new NDIS participant referral with file upload support
    """
    try:
        print(f"Received data: {referral_data}")
        
        # Convert camelCase to snake_case
        converted_data = convert_camel_to_snake(referral_data)
        print(f"Converted data: {converted_data}")
        
        # Handle attached files separately if present
        attached_files = converted_data.pop('attached_files', [])
        
        # Validate with Pydantic
        referral = ReferralCreate(**converted_data)
        
        # Add attached files back to the referral data for processing
        if attached_files:
            referral.attached_files = attached_files
        
        # Create referral
        db_referral = ReferralService.create_referral(db, referral)
        
        return ReferralResponse(
            id=db_referral.id,
            first_name=db_referral.first_name,
            last_name=db_referral.last_name,
            phone_number=db_referral.phone_number,
            email_address=db_referral.email_address,
            status=db_referral.status,
            created_at=db_referral.created_at.isoformat() if db_referral.created_at else ""
        )
    except Exception as e:
        print(f"Error creating referral: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create referral: {str(e)}"
        )

@router.get("/referrals", response_model=List[Dict[str, Any]])
def get_referrals(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all referrals with pagination and file count - returns full data
    """
    referrals = ReferralService.get_referrals_with_file_count(db, skip=skip, limit=limit)
    # Return the full data from the service - it already includes all fields
    return referrals

@router.get("/referrals/{referral_id}", response_model=Dict[str, Any])
def get_referral(
    referral_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific referral by ID with full details and attached files
    """
    # First get the basic referral
    referral = ReferralService.get_referral(db, referral_id)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    
    # Get full details with files
    referral_with_files = ReferralService.get_referral_with_files(db, referral_id)
    
    # Merge all referral attributes with file information
    referral_dict = {
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
        
        # Representative
        "rep_first_name": referral.rep_first_name,
        "rep_last_name": referral.rep_last_name,
        "rep_phone_number": referral.rep_phone_number,
        "rep_email_address": referral.rep_email_address,
        "rep_relationship": referral.rep_relationship,
        
        # NDIS
        "ndis_number": referral.ndis_number,
        "plan_type": referral.plan_type,
        "plan_manager_name": referral.plan_manager_name,
        "plan_manager_agency": referral.plan_manager_agency,
        "available_funding": referral.available_funding,
        "plan_start_date": referral.plan_start_date.isoformat() if referral.plan_start_date else None,
        "plan_review_date": referral.plan_review_date.isoformat() if referral.plan_review_date else None,
        "client_goals": referral.client_goals,
        "support_category": referral.support_category,
        
        # Referrer
        "referrer_first_name": referral.referrer_first_name,
        "referrer_last_name": referral.referrer_last_name,
        "referrer_agency": referral.referrer_agency,
        "referrer_role": referral.referrer_role,
        "referrer_email": referral.referrer_email,
        "referrer_phone": referral.referrer_phone,
        
        # Referral details
        "referred_for": referral.referred_for,
        "referred_for_other": referral.referred_for_other,
        "reason_for_referral": referral.reason_for_referral,
        "urgency_level": referral.urgency_level,
        "current_supports": referral.current_supports,
        "support_goals": referral.support_goals,
        "accessibility_needs": referral.accessibility_needs,
        "cultural_considerations": referral.cultural_considerations,
        
        # Status
        "status": referral.status,
        "created_at": referral.created_at.isoformat() if referral.created_at else "",
        "updated_at": referral.updated_at.isoformat() if referral.updated_at else None,
        "internal_notes": referral.internal_notes,
        "consent_checkbox": referral.consent_checkbox,
        
        # Files
        "attached_files": referral_with_files.get("attached_files", []) if referral_with_files else [],
        "file_count": len(referral_with_files.get("attached_files", [])) if referral_with_files else 0
    }
    
    return referral_dict

@router.patch("/referrals/{referral_id}/status")
def update_referral_status(
    referral_id: int,
    status_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Update referral status (for internal use by service providers)
    """
    status = status_data.get("status")
    notes = status_data.get("notes")
    
    if not status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status is required"
        )
    
    referral = ReferralService.update_referral_status(db, referral_id, status, notes)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    
    return {
        "message": "Status updated successfully", 
        "referral_id": referral_id, 
        "status": status,
        "notes": notes
    }

@router.post("/referrals/{referral_id}/files/{file_id}")
def add_file_to_referral(
    referral_id: int,
    file_id: str,
    db: Session = Depends(get_db)
):
    """
    Associate an uploaded file with a referral
    """
    success = ReferralService.add_file_to_referral(db, referral_id, file_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to associate file with referral"
        )
    
    return {"message": "File associated with referral successfully"}

@router.delete("/referrals/{referral_id}/files/{file_id}")
def remove_file_from_referral(
    referral_id: int,
    file_id: str,
    db: Session = Depends(get_db)
):
    """
    Remove file association from a referral
    """
    success = ReferralService.remove_file_from_referral(db, referral_id, file_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to remove file from referral"
        )
    
    return {"message": "File removed from referral successfully"}

@router.get("/referrals/{referral_id}/files")
def get_referral_files(
    referral_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all files associated with a referral
    """
    referral = ReferralService.get_referral(db, referral_id)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    
    referral_with_files = ReferralService.get_referral_with_files(db, referral_id)
    return {
        "referral_id": referral_id,
        "files": referral_with_files.get("attached_files", []) if referral_with_files else []
    }