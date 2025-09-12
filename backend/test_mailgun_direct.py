#!/usr/bin/env python3
"""
Test Mailgun API directly
"""
import os
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_mailgun_direct():
    api_key = os.getenv('MAILGUN_API_KEY')
    domain = os.getenv('MAILGUN_DOMAIN')
    sender = os.getenv('MAILGUN_SENDER_EMAIL')
    
    print(f"Testing Mailgun API...")
    print(f"Domain: {domain}")
    print(f"Sender: {sender}")
    
    # Test data
    data = {
        "from": sender,
        "to": "vanshikasmriti024@gmail.com",
        "subject": "NDIS Test Email",
        "text": "This is a test email from the NDIS system to verify Mailgun is working.",
        "html": "<h2>NDIS Test Email</h2><p>This is a test email from the NDIS system to verify Mailgun is working.</p>"
    }
    
    url = f"https://api.mailgun.net/v3/{domain}/messages"
    auth = ("api", api_key)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, data=data, auth=auth)
            
            print(f"Response Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                print("SUCCESS: Email sent via Mailgun!")
                return True
            else:
                print("ERROR: Failed to send email")
                return False
                
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    import asyncio
    success = asyncio.run(test_mailgun_direct())
    if success:
        print("\nMailgun is working! Your email should arrive shortly.")
    else:
        print("\nMailgun test failed.")