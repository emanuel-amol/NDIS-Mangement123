# backend/app/api/deps_admin_key.py - FIXED VERSION
from fastapi import Header, HTTPException, status, Request
from app.core.config import settings
import os
import logging

logger = logging.getLogger(__name__)

def require_admin_key(
    request: Request,
    x_admin_key: str = Header(None, alias="X-Admin-Key")
):
    """
    Dependency to require admin API key authentication.
    Supports multiple header formats for compatibility.
    """
    # Debug logging
    all_headers = dict(request.headers)
    logger.info(f"All request headers: {list(all_headers.keys())}")
    logger.info(f"X-Admin-Key from Header(): {x_admin_key}")
    
    # Get the configured admin key
    admin_key = getattr(settings, 'ADMIN_API_KEY', None) or os.getenv("ADMIN_API_KEY")
    
    if not admin_key:
        logger.error("ADMIN_API_KEY not configured in environment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="ADMIN_API_KEY not configured"
        )
    
    # Check multiple possible header formats
    provided_key = None
    
    # Method 1: FastAPI Header() parameter
    if x_admin_key:
        provided_key = x_admin_key
        logger.info("Found key via FastAPI Header parameter")
    
    # Method 2: Direct header access (case variations)
    elif "x-admin-key" in all_headers:
        provided_key = all_headers["x-admin-key"]
        logger.info("Found key via lowercase x-admin-key")
    
    elif "X-Admin-Key" in all_headers:
        provided_key = all_headers["X-Admin-Key"]
        logger.info("Found key via X-Admin-Key")
        
    elif "x_admin_key" in all_headers:
        provided_key = all_headers["x_admin_key"]
        logger.info("Found key via x_admin_key")
    
    # Method 3: Authorization header as fallback
    elif "authorization" in all_headers:
        auth_header = all_headers["authorization"]
        if auth_header.startswith("Bearer "):
            provided_key = auth_header.replace("Bearer ", "")
            logger.info("Found key via Authorization Bearer")
    
    # Log what we found
    logger.info(f"Configured admin key exists: {bool(admin_key)}")
    logger.info(f"Provided key exists: {bool(provided_key)}")
    logger.info(f"Keys match: {provided_key == admin_key if provided_key and admin_key else False}")
    
    # Validate the key
    if not provided_key:
        logger.warning("No admin key provided in any expected header format")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Admin key required. Please provide X-Admin-Key header."
        )
    
    if provided_key != admin_key:
        logger.warning(f"Invalid admin key provided: {provided_key[:10]}... (showing first 10 chars)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid admin key"
        )
    
    logger.info("Admin authentication successful")
    return provided_key


# Alternative simpler version for testing
def require_admin_key_simple(x_admin_key: str = Header(None)):
    """Simplified admin key check for testing"""
    # Get admin key from environment
    admin_key = os.getenv("ADMIN_API_KEY", "admin-development-key-123")
    
    if not x_admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Admin-Key header"
        )
    
    if x_admin_key != admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid admin key. Expected: {admin_key}"
        )
    
    return x_admin_key


# backend/app/core/config.py - ENSURE PROPER LOADING
import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Load environment variables from multiple possible locations
def load_env_file():
    """Load .env file from multiple possible locations"""
    possible_paths = [
        Path.cwd() / '.env',  # Current working directory
        Path(__file__).parent.parent.parent / '.env',  # Project root
        Path(__file__).parent.parent / '.env',  # Backend directory
    ]
    
    for env_path in possible_paths:
        if env_path.exists():
            from dotenv import load_dotenv
            load_dotenv(env_path)
            print(f"Loaded .env from: {env_path}")
            return str(env_path)
    
    print("Warning: No .env file found")
    return None

# Load environment file
load_env_file()

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    
    # Admin API Key
    ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "admin-development-key-123")
    
    # Email Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "")
    
    # IBM Cloud Object Storage
    IBM_COS_API_KEY: str = os.getenv("IBM_COS_API_KEY", "")
    IBM_COS_SERVICE_INSTANCE_ID: str = os.getenv("IBM_COS_SERVICE_INSTANCE_ID", "")
    IBM_COS_ENDPOINT: str = os.getenv("IBM_COS_ENDPOINT", "")
    IBM_COS_BUCKET_NAME: str = os.getenv("IBM_COS_BUCKET_NAME", "")
    
    class Config:
        case_sensitive = True

settings = Settings()

# Debug function to check configuration
def debug_admin_key():
    """Debug function to check admin key configuration"""
    print("\n=== ADMIN KEY DEBUG ===")
    print(f"ADMIN_API_KEY from os.getenv(): {os.getenv('ADMIN_API_KEY')}")
    print(f"ADMIN_API_KEY from settings: {settings.ADMIN_API_KEY}")
    print(f"Settings object type: {type(settings)}")
    
    # Print all environment variables starting with ADMIN
    admin_vars = {k: v for k, v in os.environ.items() if k.startswith('ADMIN')}
    print(f"All ADMIN_* environment variables: {admin_vars}")
    print("=====================\n")

# Call debug function on import
debug_admin_key()


# backend/test_admin_endpoint.py - TESTING SCRIPT
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_admin_endpoints():
    """Test admin endpoints with proper authentication"""
    
    # Configuration
    base_url = "http://localhost:8000/api/v1"
    admin_key = os.getenv("ADMIN_API_KEY", "admin-development-key-123")
    
    print(f"Testing with admin key: {admin_key}")
    
    # Test endpoints
    endpoints = [
        "/admin/system-status",
        "/dynamic-data/contact_methods",
    ]
    
    for endpoint in endpoints:
        print(f"\n--- Testing {endpoint} ---")
        
        # Test without key
        print("1. Testing without admin key:")
        response = requests.get(f"{base_url}{endpoint}")
        print(f"   Status: {response.status_code}")
        if response.status_code != 200:
            print(f"   Error: {response.text}")
        
        # Test with admin key in X-Admin-Key header
        print("2. Testing with X-Admin-Key header:")
        headers = {"X-Admin-Key": admin_key}
        response = requests.get(f"{base_url}{endpoint}", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Success: {response.json()}")
        else:
            print(f"   Error: {response.text}")
        
        # Test POST endpoint (create dynamic data)
        if endpoint == "/dynamic-data/contact_methods":
            print("3. Testing POST with admin key:")
            post_data = {
                "type": "contact_methods",
                "code": "WHATSAPP",
                "label": "WhatsApp",
                "is_active": True
            }
            response = requests.post(
                f"{base_url}/admin/dynamic-data/contact_methods",
                json=post_data,
                headers=headers
            )
            print(f"   POST Status: {response.status_code}")
            if response.status_code in [200, 201]:
                print(f"   POST Success: {response.json()}")
            else:
                print(f"   POST Error: {response.text}")

if __name__ == "__main__":
    test_admin_endpoints()


# frontend/admin-panel-api-fix.js - FRONTEND FIX
// Fix for the frontend admin panel to properly send admin key

class AdminAPI {
    constructor() {
        this.baseURL = 'http://localhost:8000/api/v1';
        this.adminKey = 'admin-development-key-123'; // Should come from config
    }
    
    // Get common headers with admin key
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Admin-Key': this.adminKey
        };
    }
    
    // Get system status
    async getSystemStatus() {
        try {
            const response = await fetch(`${this.baseURL}/admin/system-status`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error getting system status:', error);
            throw error;
        }
    }
    
    // Create dynamic data entry
    async createDynamicData(type, data) {
        try {
            const response = await fetch(`${this.baseURL}/admin/dynamic-data/${type}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating dynamic data:', error);
            throw error;
        }
    }
    
    // Get dynamic data
    async getDynamicData(type) {
        try {
            const response = await fetch(`${this.baseURL}/dynamic-data/${type}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error getting dynamic data:', error);
            throw error;
        }
    }
}

// Usage example:
const adminAPI = new AdminAPI();

// Example: Create contact method
async function addContactMethod() {
    try {
        const result = await adminAPI.createDynamicData('contact_methods', {
            code: 'WHATSAPP',
            label: 'WhatsApp',
            is_active: true,
            meta: {
                icon: 'whatsapp',
                priority: 3
            }
        });
        console.log('Contact method created:', result);
    } catch (error) {
        console.error('Failed to create contact method:', error);
    }
}

// Example: Get system status
async function checkSystemStatus() {
    try {
        const status = await adminAPI.getSystemStatus();
        console.log('System status:', status);
    } catch (error) {
        console.error('Failed to get system status:', error);
    }
}

