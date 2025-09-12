#!/usr/bin/env python3
"""
Debug email configuration
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("Email Configuration Debug:")
print("=" * 40)
print(f"MAILGUN_API_KEY: '{os.getenv('MAILGUN_API_KEY', 'NOT_SET')}'")
print(f"MAILGUN_DOMAIN: '{os.getenv('MAILGUN_DOMAIN', 'NOT_SET')}'") 
print(f"MAILGUN_APP_NAME: '{os.getenv('MAILGUN_APP_NAME', 'NOT_SET')}'")
print(f"MAILGUN_SENDER_EMAIL: '{os.getenv('MAILGUN_SENDER_EMAIL', 'NOT_SET')}'")
print("=" * 40)

# Check if any are empty strings
api_key = os.getenv('MAILGUN_API_KEY', '')
domain = os.getenv('MAILGUN_DOMAIN', '')
sender = os.getenv('MAILGUN_SENDER_EMAIL', '')

print("Configuration Check:")
print(f"API Key valid: {bool(api_key.strip())}")
print(f"Domain valid: {bool(domain.strip())}")
print(f"Sender valid: {bool(sender.strip())}")
print(f"All configured: {all([api_key.strip(), domain.strip(), sender.strip()])}")