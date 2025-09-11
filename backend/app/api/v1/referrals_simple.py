from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio

from app.core.database import get_db
from app.schemas.referral import ReferralCreate, ReferralResponse, ReferralUpdate
from app.services.referral_service import ReferralService
from app.services.email_service import EmailService
from app.models.user import User, UserRole, get_providers_for_service, get_admins

router = APIRouter()


def get_provider_emails_for_referral(referral, db: Session) -> List[str]:
    """
    Get provider emails based on referral type from database
    """
    provider_emails = []
    
    try:
        # Get all admin emails (always included)
        admins = get_admins(db)
        admin_emails = [admin.email for admin in admins if admin.email]
        provider_emails.extend(admin_emails)
        
        # Get providers who can handle this service type
        service_type = referral.referred_for.lower()
        providers = get_providers_for_service(db, service_type)
        provider_emails.extend([provider.email for provider in providers if provider.email])
        
        # If no specific providers found, get all active providers as fallback
        if not providers:
            print(f"No specific providers found for {service_type}, getting all active providers")
            all_providers = db.query(User).filter(
                User.role == UserRole.PROVIDER,
                User.is_active == True,
                User.email.isnot(None)
            ).all()
            provider_emails.extend([provider.email for provider in all_providers if provider.email])
        
        # Remove duplicates and return
        unique_emails = list(set(provider_emails))
        print(f"Found {len(unique_emails)} provider emails for {service_type} referral")
        return unique_emails
        
    except Exception as e:
        print(f"Error fetching provider emails from database: {str(e)}")
        # Fallback to default admin email if database query fails
        return ["admin@your-clinic.com"]  # Configure this fallback


@router.post("/referral-simple", response_model=ReferralResponse, status_code=status.HTTP_201_CREATED)
async def submit_referral_simple(
    referral_data: ReferralCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a new referral form with DIRECT email sending (no background queue)
    Use this for testing when Celery/Redis is not available
    """
    try:
        print(f"Received referral data: {referral_data}")
        # Create the referral
        referral = ReferralService.create_referral(db, referral_data)
        
        # Send emails DIRECTLY (not via background queue)
        try:
            # Get provider emails from database
            provider_emails = get_provider_emails_for_referral(referral, db)
            
            # Initialize email service
            email_service = EmailService()
            
            if email_service.is_configured():
                print(f"Sending emails directly for referral #{referral.id}")
                
                # Send all notifications directly
                results = await email_service.send_all_notifications(referral, provider_emails, db)
                
                print(f"Email results for referral #{referral.id}: {results}")
            else:
                print("Email service not configured - emails not sent")
                
        except Exception as email_error:
            # Log email error but don't fail the referral submission
            print(f"Warning: Failed to send emails for referral #{referral.id}: {str(email_error)}")
            import traceback
            traceback.print_exc()
        
        return referral
        
    except Exception as e:
        print(f"Error creating referral: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating referral: {str(e)}"
        )


@router.get("/referrals", response_model=List[ReferralResponse])
async def get_referrals(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all referrals (Admin endpoint - requires authentication)
    """
    # TODO: Add authentication check here
    referrals = ReferralService.get_referrals(db, skip=skip, limit=limit, status=status_filter)
    return referrals


@router.get("/referrals/{referral_id}", response_model=ReferralResponse)
async def get_referral(
    referral_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific referral by ID (Admin endpoint)
    """
    # TODO: Add authentication check here
    referral = ReferralService.get_referral(db, referral_id)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    return referral


@router.put("/referrals/{referral_id}", response_model=ReferralResponse)
async def update_referral(
    referral_id: int,
    referral_update: ReferralUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a referral (Admin endpoint - for status updates, notes)
    """
    # TODO: Add authentication check here
    referral = ReferralService.update_referral(db, referral_id, referral_update)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    return referral


@router.delete("/referrals/{referral_id}")
async def delete_referral(
    referral_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a referral (Admin endpoint)
    """
    # TODO: Add authentication check here
    success = ReferralService.delete_referral(db, referral_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )
    return {"message": "Referral deleted successfully"}