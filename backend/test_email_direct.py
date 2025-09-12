#!/usr/bin/env python3
"""
Direct email test - bypassing Celery to test email functionality
"""
import asyncio
import sys
import os
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Import required modules
from app.services.email_service import EmailService
from app.models.referral import Referral
from app.core.database import get_db
from datetime import date

async def test_email_directly():
    """Test sending emails directly without Celery"""
    
    print("Testing email service directly...")
    
    # Initialize email service
    email_service = EmailService()
    
    # Check if configured
    if not email_service.is_configured():
        print("ERROR: Email service is not configured!")
        return False
    
    print("SUCCESS: Email service is configured")
    
    # Create a fake referral object for testing
    from datetime import datetime
    fake_referral = type('Referral', (), {
        'id': 1,
        'first_name': 'TEDT',
        'last_name': 'TEDT', 
        'email_address': 'vanshikasmriti024@gmail.com',
        'phone_number': '411222333',
        'date_of_birth': date(1930, 4, 3),
        'street_address': '229 Franklin street',
        'city': 'Melbourne',
        'state': 'VIC',
        'postcode': '3000',
        'preferred_contact': 'email',
        'plan_type': 'self-managed',
        'referred_for': 'physiotherapy',
        'created_at': datetime.now(),
        'rep_first_name': '',
        'rep_last_name': '',
        'rep_phone_number': '',
        'rep_email_address': '',
        'rep_street_address': '',
        'rep_city': '',
        'rep_state': '',
        'rep_postcode': '',
        'plan_manager_name': None
    })()
    
    try:
        # Test participant confirmation email
        print("\nTesting participant confirmation email...")
        result = await email_service.send_participant_confirmation(fake_referral)
        
        if result:
            print("SUCCESS: Participant confirmation email sent successfully!")
        else:
            print("ERROR: Failed to send participant confirmation email")
            return False
            
    except Exception as e:
        print(f"ERROR sending participant confirmation: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        # Test provider notification
        print("\nTesting provider notification email...")
        provider_emails = ['vanshikasmriti024@gmail.com']  # Test with your email
        result = await email_service.send_provider_notification(fake_referral, provider_emails)
        
        if result:
            print("SUCCESS: Provider notification email sent successfully!")
        else:
            print("ERROR: Failed to send provider notification email")
            return False
            
    except Exception as e:
        print(f"ERROR sending provider notification: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\nAll email tests passed!")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_email_directly())
    if success:
        print("\nEmail system is working! The issue was with Celery, not the email service.")
    else:
        print("\nEmail system has issues that need to be fixed.")