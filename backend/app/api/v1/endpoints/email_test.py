# backend/app/api/v1/endpoints/email_test.py - EMAIL TESTING ENDPOINT
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.email_service import EmailService
from app.models.referral import Referral
from app.models.participant import Participant
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class EmailTestRequest(BaseModel):
    test_email: EmailStr
    test_type: str  # 'configuration', 'referral_confirmation', 'referral_status', 'conversion'
    referral_id: Optional[int] = None
    participant_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None

@router.post("/test-email-configuration")
def test_email_configuration():
    """Test email service configuration"""
    try:
        email_service = EmailService()
        result = email_service.test_email_configuration()
        
        return {
            "message": "Email configuration test completed",
            "result": result,
            "recommendations": {
                "gmail": "Use app-specific passwords, enable 2-factor authentication",
                "outlook": "Ensure SMTP is enabled for your account",
                "custom": "Verify SMTP settings with your email provider"
            } if not result.get("success") else None
        }
    except Exception as e:
        logger.error(f"Error testing email configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-test-email")
def send_test_email(
    request: EmailTestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send test emails for different scenarios"""
    try:
        email_service = EmailService()
        
        # Test basic configuration first
        if request.test_type == "configuration":
            config_result = email_service.test_email_configuration()
            if not config_result.get("success"):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Email configuration issue: {config_result.get('error')}"
                )
            
            # Send a simple test email
            success = email_service._send_email(
                to_email=request.test_email,
                subject="✅ NDIS Management System - Email Test",
                html_content=_get_test_email_template(),
                recipient_name="Test User"
            )
            
            return {
                "message": "Configuration test email sent" if success else "Failed to send test email",
                "success": success,
                "sent_to": request.test_email
            }
        
        # Test referral confirmation email
        elif request.test_type == "referral_confirmation":
            if not request.referral_id:
                raise HTTPException(status_code=400, detail="referral_id required for this test")
            
            referral = db.query(Referral).filter(Referral.id == request.referral_id).first()
            if not referral:
                raise HTTPException(status_code=404, detail="Referral not found")
            
            # Create a test version of the referral with the test email
            test_referral = Referral(**{
                **{k: v for k, v in referral.__dict__.items() if not k.startswith('_')},
                'referrer_email': request.test_email
            })
            
            success = email_service.send_referral_confirmation(test_referral)
            
            return {
                "message": "Referral confirmation test email sent" if success else "Failed to send test email",
                "success": success,
                "sent_to": request.test_email,
                "referral_id": request.referral_id
            }
        
        # Test referral status update email
        elif request.test_type == "referral_status":
            if not request.referral_id or not request.status:
                raise HTTPException(status_code=400, detail="referral_id and status required for this test")
            
            referral = db.query(Referral).filter(Referral.id == request.referral_id).first()
            if not referral:
                raise HTTPException(status_code=404, detail="Referral not found")
            
            # Create a test version of the referral with the test email
            test_referral = Referral(**{
                **{k: v for k, v in referral.__dict__.items() if not k.startswith('_')},
                'referrer_email': request.test_email
            })
            
            success = email_service.send_referral_status_update(
                test_referral, 
                request.status, 
                request.notes
            )
            
            return {
                "message": f"Referral status update test email sent" if success else "Failed to send test email",
                "success": success,
                "sent_to": request.test_email,
                "referral_id": request.referral_id,
                "status": request.status
            }
        
        # Test conversion notification email
        elif request.test_type == "conversion":
            if not request.referral_id or not request.participant_id:
                raise HTTPException(status_code=400, detail="referral_id and participant_id required for this test")
            
            referral = db.query(Referral).filter(Referral.id == request.referral_id).first()
            participant = db.query(Participant).filter(Participant.id == request.participant_id).first()
            
            if not referral:
                raise HTTPException(status_code=404, detail="Referral not found")
            if not participant:
                raise HTTPException(status_code=404, detail="Participant not found")
            
            # Create a test version of the referral with the test email
            test_referral = Referral(**{
                **{k: v for k, v in referral.__dict__.items() if not k.startswith('_')},
                'referrer_email': request.test_email
            })
            
            success = email_service.send_referral_participant_conversion_notification(
                test_referral, 
                participant
            )
            
            return {
                "message": "Conversion notification test email sent" if success else "Failed to send test email",
                "success": success,
                "sent_to": request.test_email,
                "referral_id": request.referral_id,
                "participant_id": request.participant_id
            }
        
        else:
            raise HTTPException(status_code=400, detail="Invalid test_type")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending test email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/email-templates")
def get_available_email_templates():
    """Get list of available email templates for testing"""
    return {
        "templates": {
            "referral_confirmation": {
                "name": "Referral Confirmation",
                "description": "Sent to referrer when a new referral is submitted",
                "required_fields": ["referral_id"]
            },
            "referral_status_update": {
                "name": "Referral Status Update", 
                "description": "Sent when referral status changes",
                "required_fields": ["referral_id", "status"],
                "optional_fields": ["notes"]
            },
            "referral_conversion": {
                "name": "Referral Conversion",
                "description": "Sent when referral is converted to participant",
                "required_fields": ["referral_id", "participant_id"]
            },
            "admin_referral_notification": {
                "name": "Admin Referral Notification",
                "description": "Sent to admin when new referral is received",
                "required_fields": ["referral_id"]
            }
        },
        "available_statuses": [
            "submitted",
            "under_review", 
            "approved",
            "rejected",
            "converted_to_participant",
            "pending_information",
            "on_hold"
        ]
    }

@router.get("/email-configuration-status")
def get_email_configuration_status():
    """Get current email configuration status"""
    try:
        email_service = EmailService()
        
        return {
            "configured": email_service.is_configured,
            "smtp_server": email_service.smtp_server if email_service.is_configured else None,
            "smtp_port": email_service.smtp_port if email_service.is_configured else None,
            "from_email": email_service.from_email if email_service.is_configured else None,
            "organization_name": email_service.organization_name,
            "organization_phone": email_service.organization_phone,
            "organization_email": email_service.organization_email,
            "admin_notification_email": email_service.organization_email,  # This could be different
            "recommendations": [
                "Ensure SMTP credentials are set in environment variables",
                "Test email configuration before production use",
                "Configure organization details for proper email branding",
                "Set up admin notification email for system alerts"
            ] if not email_service.is_configured else [
                "Email service is properly configured",
                "Test different email scenarios to ensure proper delivery",
                "Monitor email delivery logs in production"
            ]
        }
    except Exception as e:
        logger.error(f"Error getting email configuration status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def _get_test_email_template() -> str:
    """Simple test email template"""
    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Test</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">✅ Email Configuration Test</h2>
        <p>Congratulations! Your NDIS Management System email service is working correctly.</p>
        
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 10px 0;">Test Results:</h3>
            <ul style="color: #374151; margin: 0;">
                <li>✅ SMTP connection successful</li>
                <li>✅ Email authentication working</li>
                <li>✅ Email delivery functional</li>
                <li>✅ Template rendering working</li>
            </ul>
        </div>
        
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
            This is an automated test email from your NDIS Management System.
        </p>
    </div>
</body>
</html>
    """