#!/usr/bin/env python3
"""
Test script to verify Xero OAuth2 configuration
Run this before starting the server to check if everything is set up correctly
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).parent / '.env'
if not env_path.exists():
    env_path = Path(__file__).parent.parent / '.env'

load_dotenv(dotenv_path=env_path)

def check_env_var(var_name, required=True):
    """Check if an environment variable is set"""
    value = os.getenv(var_name)
    if value:
        # Mask sensitive values
        if 'SECRET' in var_name or 'KEY' in var_name:
            masked_value = value[:10] + '...' + value[-10:] if len(value) > 20 else '***'
            print(f"✅ {var_name}: {masked_value}")
        else:
            print(f"✅ {var_name}: {value}")
        return True
    else:
        if required:
            print(f"❌ {var_name}: NOT SET (required)")
        else:
            print(f"⚠️  {var_name}: NOT SET (optional)")
        return False

def test_xero_config():
    """Test Xero configuration"""
    print("=" * 60)
    print("Xero OAuth2 Configuration Test")
    print("=" * 60)
    print()

    all_good = True

    # Check required Xero variables
    print("📋 Xero Credentials:")
    all_good &= check_env_var("XERO_CLIENT_ID", required=True)
    all_good &= check_env_var("XERO_CLIENT_SECRET", required=True)
    all_good &= check_env_var("XERO_REDIRECT_URI", required=True)
    print()

    # Check Ngrok URLs
    print("🌐 Ngrok Configuration:")
    all_good &= check_env_var("BACKEND_URL", required=True)
    all_good &= check_env_var("FRONTEND_URL", required=True)
    print()

    # Check CORS
    print("🔒 CORS Configuration:")
    check_env_var("CORS_ORIGINS", required=True)
    print()

    # Check other important variables
    print("⚙️  Other Configuration:")
    check_env_var("APP_ENV", required=False)
    check_env_var("ADMIN_API_KEY", required=True)
    print()

    # Check xero-python package
    print("📦 Python Packages:")
    try:
        import xero_python
        print(f"✅ xero-python: {xero_python.__version__}")
    except ImportError:
        print("❌ xero-python: NOT INSTALLED")
        print("   Install with: pip install xero-python==5.1.0")
        all_good = False
    print()

    # Validate redirect URI format
    print("🔍 Validation:")
    redirect_uri = os.getenv("XERO_REDIRECT_URI", "")
    if redirect_uri.startswith("https://") and "ngrok" in redirect_uri:
        print(f"✅ Redirect URI uses HTTPS with ngrok")
    elif redirect_uri.startswith("http://localhost"):
        print(f"⚠️  Redirect URI uses localhost (won't work with Xero)")
        print(f"   Use your ngrok URL instead")
        all_good = False
    else:
        print(f"❌ Redirect URI format invalid")
        all_good = False

    backend_url = os.getenv("BACKEND_URL", "")
    if backend_url.startswith("https://") and "ngrok" in backend_url:
        print(f"✅ Backend URL uses HTTPS with ngrok")
    else:
        print(f"⚠️  Backend URL should use ngrok HTTPS URL")

    frontend_url = os.getenv("FRONTEND_URL", "")
    if frontend_url.startswith("https://") and "ngrok" in frontend_url:
        print(f"✅ Frontend URL uses HTTPS with ngrok")
    else:
        print(f"⚠️  Frontend URL should use ngrok HTTPS URL")
    print()

    # Summary
    print("=" * 60)
    if all_good:
        print("✅ All checks passed! Ready to test Xero integration.")
        print()
        print("Next steps:")
        print("1. Make sure ngrok tunnels are running:")
        print("   - ngrok http 8000 (backend)")
        print("   - ngrok http 5173 (frontend)")
        print()
        print("2. Start the backend server:")
        print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print()
        print("3. Test the connection:")
        print(f"   Open: {backend_url}/api/v1/invoicing/xero/connect")
        print()
        print("4. In your Xero app settings, make sure redirect URI is:")
        print(f"   {redirect_uri}")
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        print()
        print("Common fixes:")
        print("1. Install xero-python: pip install xero-python==5.1.0")
        print("2. Update .env with your Xero credentials")
        print("3. Make sure ngrok URLs are set correctly")
        print("4. Update Xero app redirect URI to match XERO_REDIRECT_URI")
    print("=" * 60)

    return all_good

if __name__ == "__main__":
    success = test_xero_config()
    sys.exit(0 if success else 1)
