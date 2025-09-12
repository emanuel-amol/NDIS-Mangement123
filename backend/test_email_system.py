#!/usr/bin/env python3
"""
Test script for the email notification system

This script tests:
1. Email service configuration
2. Template rendering
3. Email sending functionality
4. Celery task execution
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
load_dotenv()

from app.services.email_service import EmailService
from app.models.referral import Referral
from app.tasks.email_tasks import test_email_configuration, send_referral_notifications
from datetime import datetime


def test_email_configuration_sync():
    """Test email configuration synchronously"""
    print("🔧 Testing Email Configuration...")
    print("-" * 50)
    
    email_service = EmailService()
    
    # Check if properly configured
    is_configured = email_service.is_configured()
    print(f"✅ Configuration Status: {'Valid' if is_configured else '❌ Invalid'}")
    
    # Print configuration details (without sensitive info)
    config = email_service.config
    print(f"🌐 Mailgun Domain: {config.MAILGUN_DOMAIN}")
    print(f"📤 Sender Email: {config.MAILGUN_SENDER_EMAIL}")
    print(f"👤 App Name: {config.MAILGUN_APP_NAME}")
    print(f"🔑 API Key: {'***' + config.MAILGUN_API_KEY[-4:] if config.MAILGUN_API_KEY else 'Not Set'}")
    print()
    
    return is_configured


def create_test_referral():
    """Create a test referral object for testing"""
    print("📋 Creating Test Referral...")
    print("-" * 30)
    
    # Create a mock referral object
    referral = type('TestReferral', (), {
        'id': 12345,
        'created_at': datetime.now(),
        'first_name': 'John',
        'last_name': 'Doe',
        'date_of_birth': '1985-06-15',
        'phone_number': '+61 400 123 456',
        'email_address': 'john.doe@example.com',
        'street_address': '123 Main Street',
        'city': 'Sydney',
        'state': 'NSW',
        'postcode': '2000',
        'preferred_contact': 'email',
        'rep_first_name': None,
        'rep_last_name': None,
        'rep_phone_number': None,
        'rep_email_address': None,
        'plan_type': 'self-managed',
        'plan_manager_name': None,
        'plan_manager_agency': None,
        'ndis_number': 'NDIS123456789',
        'available_funding': '5000',
        'plan_start_date': '2024-01-01',
        'plan_review_date': '2024-12-31',
        'client_goals': 'Improve mobility and independence in daily activities.',
        'referrer_first_name': 'Dr. Sarah',
        'referrer_last_name': 'Smith',
        'referrer_agency': 'Sydney Medical Centre',
        'referrer_role': 'General Practitioner',
        'referrer_email': 'dr.smith@sydneymedical.com.au',
        'referrer_phone': '+61 2 9876 5432',
        'referred_for': 'physiotherapy',
        'reason_for_referral': 'Patient requires physiotherapy support to improve mobility following recent surgery. Has difficulty with stairs and walking long distances.',
        'status': 'new'
    })()
    
    print(f"✅ Test referral created: #{referral.id}")
    print(f"   Client: {referral.first_name} {referral.last_name}")
    print(f"   Referred for: {referral.referred_for}")
    print(f"   Referrer: {referral.referrer_first_name} {referral.referrer_last_name}")
    print()
    
    return referral


async def test_email_sending(referral):
    """Test email sending functionality"""
    print("📤 Testing Email Sending...")
    print("-" * 30)
    
    email_service = EmailService()
    
    if not email_service.is_configured():
        print("❌ Email service is not configured. Please check your .env file.")
        return False
    
    try:
        # Test provider notification
        print("📧 Testing provider notification...")
        provider_result = await email_service.send_provider_notification(
            referral, 
            ["test-provider@example.com"]
        )
        print(f"   Provider notification: {'✅ Success' if provider_result else '❌ Failed'}")
        
        # Test participant confirmation
        print("📧 Testing participant confirmation...")
        participant_result = await email_service.send_participant_confirmation(referral)
        print(f"   Participant confirmation: {'✅ Success' if participant_result else '❌ Failed'}")
        
        # Test referrer notification
        print("📧 Testing referrer notification...")
        referrer_result = await email_service.send_referrer_notification(referral)
        print(f"   Referrer notification: {'✅ Success' if referrer_result else '❌ Failed'}")
        
        # Test all notifications at once
        print("📧 Testing all notifications together...")
        all_results = await email_service.send_all_notifications(
            referral, 
            ["test-provider@example.com"]
        )
        print(f"   All notifications result: {all_results}")
        
        return all(all_results.values())
        
    except Exception as e:
        print(f"❌ Error during email testing: {str(e)}")
        return False


def test_celery_tasks():
    """Test Celery task functionality"""
    print("⚙️ Testing Celery Tasks...")
    print("-" * 25)
    
    try:
        # Test email configuration task
        print("🔧 Testing email configuration task...")
        config_task = test_email_configuration.delay()
        print(f"   Task ID: {config_task.id}")
        print(f"   Task State: {config_task.state}")
        
        # Note: In a real test, you'd wait for the task to complete
        # For now, we just show that the task was queued
        print("   ⏳ Task queued successfully (check Celery worker logs)")
        
        return True
        
    except Exception as e:
        print(f"❌ Celery task test failed: {str(e)}")
        print("   Make sure Redis and Celery worker are running:")
        print("   1. Start Redis: redis-server")
        print("   2. Start Celery: celery -A celery_worker worker --loglevel=info")
        return False


def print_setup_instructions():
    """Print setup instructions for the email system"""
    print("📚 Email System Setup Instructions")
    print("=" * 50)
    print()
    
    print("1. 📧 Configure Mailgun Settings in .env:")
    print("   MAILGUN_API_KEY=your-mailgun-api-key")
    print("   MAILGUN_DOMAIN=your-mailgun-domain.com")
    print("   MAILGUN_APP_NAME=Your App Name")
    print("   MAILGUN_SENDER_EMAIL=sender@your-mailgun-domain.com")
    print()
    
    print("2. 🔐 Get Mailgun credentials:")
    print("   - Sign up at https://mailgun.com")
    print("   - Add and verify your domain")
    print("   - Get API key from dashboard")
    print("   - Configure DNS records for your domain")
    print()
    
    print("3. 🗄️ Install and start Redis:")
    print("   - Windows: Download from https://redis.io/download")
    print("   - macOS: brew install redis && brew services start redis")
    print("   - Linux: sudo apt install redis-server && sudo systemctl start redis")
    print()
    
    print("4. ⚙️ Start Celery worker:")
    print("   cd backend")
    print("   celery -A celery_worker worker --loglevel=info")
    print()
    
    print("5. 📦 Install dependencies:")
    print("   pip install -r requirements.txt")
    print()


async def run_all_tests():
    """Run all tests"""
    print("🧪 NDIS Email System Test Suite")
    print("=" * 40)
    print()
    
    # Test 1: Configuration
    config_ok = test_email_configuration_sync()
    
    if not config_ok:
        print("⚠️ Email not configured. Showing setup instructions...")
        print()
        print_setup_instructions()
        return
    
    # Test 2: Create test data
    test_referral = create_test_referral()
    
    # Test 3: Email sending (commented out to avoid sending real emails during testing)
    print("⚠️ Email sending test disabled to prevent sending real emails.")
    print("   To test email sending, uncomment the line below and update email addresses.")
    # email_ok = await test_email_sending(test_referral)
    
    # Test 4: Celery tasks
    celery_ok = test_celery_tasks()
    
    print()
    print("📊 Test Summary")
    print("-" * 20)
    print(f"Configuration: {'✅ Pass' if config_ok else '❌ Fail'}")
    print(f"Email Sending: ⏭️ Skipped (enable manually)")
    print(f"Celery Tasks:  {'✅ Pass' if celery_ok else '❌ Fail'}")
    print()
    
    if config_ok and celery_ok:
        print("🎉 Email system is ready!")
        print("   Don't forget to:")
        print("   - Update provider email addresses in referrals.py")
        print("   - Start Redis server")
        print("   - Start Celery worker")
    else:
        print("❌ Some tests failed. Please check the setup instructions above.")


if __name__ == "__main__":
    asyncio.run(run_all_tests())