# backend/app/api/v1/endpoints/referral.py - UPDATED WITH FILE SUPPORT
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
        'attachedFiles': 'attached_files',  # NEW: Handle attached files
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
        
        # Validate with Pydantic (create a modified schema that accepts attached_files)
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

@router.get("/referrals", response_model=List[ReferralResponse])
def get_referrals(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all referrals with pagination and file count
    """
    referrals = ReferralService.get_referrals_with_file_count(db, skip=skip, limit=limit)
    return [
        ReferralResponse(
            id=ref["id"],
            first_name=ref["first_name"],
            last_name=ref["last_name"],
            phone_number=ref["phone_number"],
            email_address=ref["email_address"],
            status=ref["status"],
            created_at=ref["created_at"]
        )
        for ref in referrals
    ]

@router.get("/referrals/{referral_id}", response_model=Dict[str, Any])
def get_referral(
    referral_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific referral by ID with attached files
    """
    referral = ReferralService.get_referral_with_files(db, referral_id)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    
    return referral

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