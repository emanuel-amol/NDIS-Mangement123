# backend/app/api/v1/referrals_simple.py - COMPLETE VERSION
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio

from app.core.database import get_db
from app.schemas.referral import ReferralCreate, ReferralResponse, ReferralUpdate
from app.services.referral_service import ReferralService

# Import with error handling for optional dependencies
try:
    from app.services.email_service import EmailService
    EMAIL_SERVICE_AVAILABLE = True
except ImportError:
    EmailService = None
    EMAIL_SERVICE_AVAILABLE = False
    print("Warning: Email service not available")

try:
    from app.models.user import User, UserRole, get_providers_for_service, get_admins
    USER_SERVICE_AVAILABLE = True
except ImportError:
    User = None
    UserRole = None
    get_providers_for_service = lambda db, service_type: []
    get_admins = lambda db: []
    USER_SERVICE_AVAILABLE = False
    print("Warning: User service not available")

router = APIRouter()


def get_provider_emails_for_referral(referral, db: Session) -> List[str]:
    """
    Get provider emails based on referral type from database
    """
    if not USER_SERVICE_AVAILABLE:
        # Fallback email addresses if user system is not available
        return ["admin@your-clinic.com", "provider@your-clinic.com"]
    
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
        if not providers and USER_SERVICE_AVAILABLE:
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
        return unique_emails if unique_emails else ["admin@your-clinic.com"]
        
    except Exception as e:
        print(f"Error fetching provider emails from database: {str(e)}")
        # Fallback to default admin email if database query fails
        return ["admin@your-clinic.com"]


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
        print(f"Received referral data for: {referral_data.firstName} {referral_data.lastName}")
        
        # Create the referral
        referral = ReferralService.create_referral(db, referral_data)
        print(f"Created referral with ID: {referral.id}")
        
        # Send emails DIRECTLY (not via background queue) if email service is available
        if EMAIL_SERVICE_AVAILABLE:
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
        else:
            print("Email service not available - skipping email notifications")
        
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
    Get all referrals - This is the endpoint the frontend needs
    """
    try:
        print(f"Fetching referrals with skip={skip}, limit={limit}, status={status_filter}")
        referrals = ReferralService.get_referrals(db, skip=skip, limit=limit, status=status_filter)
        print(f"Found {len(referrals)} referrals")
        return referrals
    except Exception as e:
        print(f"Error getting referrals: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching referrals: {str(e)}"
        )


@router.get("/referrals/{referral_id}", response_model=ReferralResponse)
async def get_referral(
    referral_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific referral by ID
    """
    try:
        referral = ReferralService.get_referral(db, referral_id)
        if not referral:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referral not found"
            )
        return referral
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting referral {referral_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching referral: {str(e)}"
        )


@router.put("/referrals/{referral_id}", response_model=ReferralResponse)
async def update_referral(
    referral_id: int,
    referral_update: ReferralUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a referral (Admin endpoint - for status updates, notes)
    """
    try:
        referral = ReferralService.update_referral(db, referral_id, referral_update)
        if not referral:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referral not found"
            )
        return referral
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating referral {referral_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating referral: {str(e)}"
        )


@router.delete("/referrals/{referral_id}")
async def delete_referral(
    referral_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a referral (Admin endpoint)
    """
    try:
        success = ReferralService.delete_referral(db, referral_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referral not found"
            )
        return {"message": "Referral deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting referral {referral_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting referral: {str(e)}"
        )