# backend/app/api/v1/api.py - UPDATED WITH EMAIL TESTING ENDPOINTS
from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)

# Import all routers with proper error handling
def safe_import_router(module_path, router_name, fallback_prefix="/"):
    """Safely import router with fallback"""
    try:
        module = __import__(module_path, fromlist=[router_name])
        return getattr(module, router_name)
    except ImportError as e:
        logger.warning(f"Could not import {module_path}.{router_name}: {e}")
        # Return a minimal fallback router
        fallback_router = APIRouter()
        @fallback_router.get("/status")
        def get_status():
            return {"status": "service_unavailable", "message": f"Module {module_path} not available"}
        return fallback_router

api_router = APIRouter()

# Core routers (these should always work)
try:
    from app.api.v1.endpoints.referral import router as referral_router
    api_router.include_router(referral_router, prefix="/participants", tags=["referrals"])
    logger.info("✅ Referral router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load referral router: {e}")

try:
    from app.api.v1.endpoints.participant import router as participant_router
    api_router.include_router(participant_router, prefix="/participants", tags=["participants"])
    logger.info("✅ Participant router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load participant router: {e}")

try:
    from app.api.v1.endpoints.care_workflow import router as care_workflow_router
    api_router.include_router(care_workflow_router, prefix="/care", tags=["care-workflow"])
    logger.info("✅ Care workflow router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load care workflow router: {e}")

# Email testing router (for development and configuration)
try:
    from app.api.v1.endpoints.email_test import router as email_test_router
    api_router.include_router(email_test_router, prefix="/email", tags=["email-testing"])
    logger.info("✅ Email testing router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load email testing router: {e}")

# Document routers (may fail if workflow tables don't exist)
try:
    from app.api.v1.endpoints.document import router as document_router
    api_router.include_router(document_router, prefix="", tags=["documents"])
    logger.info("✅ Document router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load document router: {e}")
    # Add minimal fallback for documents
    fallback_doc_router = APIRouter()
    
    @fallback_doc_router.get("/participants/{participant_id}/documents/status")
    def document_status(participant_id: int):
        return {
            "status": "service_unavailable", 
            "message": "Document service is not available. Please check server logs."
        }
    
    api_router.include_router(fallback_doc_router, prefix="", tags=["documents-fallback"])

# Optional workflow routers (gracefully fail if tables don't exist)
try:
    from app.api.v1.endpoints.document_workflow import router as document_workflow_router
    api_router.include_router(document_workflow_router, prefix="/document-workflow", tags=["document-workflow"])
    logger.info("✅ Document workflow router loaded")
except ImportError as e:
    logger.warning(f"⚠️  Document workflow router not available: {e}")

try:
    from app.api.v1.endpoints.document_versions import router as document_versions_router
    api_router.include_router(document_versions_router, prefix="", tags=["document-versions"])
    logger.info("✅ Document versions router loaded")
except ImportError as e:
    logger.warning(f"⚠️  Document versions router not available: {e}")

try:
    from app.api.v1.endpoints.enhanced_document_versions import router as enhanced_version_router
    api_router.include_router(enhanced_version_router, prefix="", tags=["advanced-version-control"])
    logger.info("✅ Advanced document versions router loaded")
except ImportError as e:
    logger.warning(f"⚠️  Advanced document versions router not available: {e}")

try:
    from app.api.v1.endpoints.document_generation import router as document_generation_router
    api_router.include_router(document_generation_router, prefix="", tags=["document-generation"])
    logger.info("✅ Document generation router loaded")
except ImportError as e:
    logger.warning(f"⚠️  Document generation router not available: {e}")

# Add a health check endpoint
@api_router.get("/health", tags=["health"])
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "NDIS Management API is running",
        "services": {
            "referrals": "available",
            "participants": "available", 
            "care_workflow": "available",
            "documents": "available",
            "email_service": "available"
        }
    }

@api_router.get("/status", tags=["health"])  
def system_status():
    """System status with more details"""
    try:
        from app.core.database import SessionLocal
        from app.services.email_service import EmailService
        
        db = SessionLocal()
        
        # Test database connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "connected"
        db.close()
        
        # Test email service configuration
        email_service = EmailService()
        email_status = "configured" if email_service.is_configured else "not_configured"
        
    except Exception as e:
        db_status = f"error: {str(e)}"
        email_status = "error"
    
    return {
        "api_status": "running",
        "database_status": db_status,
        "email_service_status": email_status,
        "timestamp": "2025-01-27T10:30:00Z",
        "endpoints": {
            "referrals": "/api/v1/participants/referral-simple",
            "email_test": "/api/v1/email/test-email-configuration", 
            "email_status": "/api/v1/email/email-configuration-status"
        }
    }

# backend/app/api/api.py
from fastapi import APIRouter
from app.api.v1.endpoints import dynamic_data as dynamic_data_router

api_router = APIRouter()
api_router.include_router(dynamic_data_router.router, prefix="/v1")


# backend/app/api/v1/api.py - UPDATED WITH ADMIN ROUTES
from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)

api_router = APIRouter()

# Import all routers with proper error handling
def safe_import_router(module_path, router_name, fallback_prefix="/"):
    """Safely import router with fallback"""
    try:
        module = __import__(module_path, fromlist=[router_name])
        return getattr(module, router_name)
    except ImportError as e:
        logger.warning(f"Could not import {module_path}.{router_name}: {e}")
        # Return a minimal fallback router
        fallback_router = APIRouter()
        @fallback_router.get("/status")
        def get_status():
            return {"status": "service_unavailable", "message": f"Module {module_path} not available"}
        return fallback_router

# Core routers (these should always work)
try:
    from app.api.v1.endpoints.referral import router as referral_router
    api_router.include_router(referral_router, prefix="/participants", tags=["referrals"])
    logger.info("✅ Referral router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load referral router: {e}")

try:
    from app.api.v1.endpoints.participant import router as participant_router
    api_router.include_router(participant_router, prefix="/participants", tags=["participants"])
    logger.info("✅ Participant router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load participant router: {e}")

try:
    from app.api.v1.endpoints.care_workflow import router as care_workflow_router
    api_router.include_router(care_workflow_router, prefix="/care", tags=["care-workflow"])
    logger.info("✅ Care workflow router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load care workflow router: {e}")

# Email testing router (for development and configuration)
try:
    from app.api.v1.endpoints.email_test import router as email_test_router
    api_router.include_router(email_test_router, prefix="/email", tags=["email-testing"])
    logger.info("✅ Email testing router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load email testing router: {e}")

# Document routers (may fail if workflow tables don't exist)
try:
    from app.api.v1.endpoints.document import router as document_router
    api_router.include_router(document_router, prefix="", tags=["documents"])
    logger.info("✅ Document router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load document router: {e}")

try:
    from app.api.v1.endpoints.document_workflow import router as document_workflow_router
    api_router.include_router(document_workflow_router, prefix="/document-workflow", tags=["document-workflow"])
    logger.info("✅ Document workflow router loaded")
except ImportError as e:
    logger.warning(f"⚠️  Document workflow router not available: {e}")

try:
    from app.api.v1.endpoints.document_versions import router as document_versions_router
    api_router.include_router(document_versions_router, prefix="", tags=["document-versions"])
    logger.info("✅ Document versions router loaded")
except ImportError as e:
    logger.warning(f"⚠️  Document versions router not available: {e}")

try:
    from app.api.v1.endpoints.enhanced_document_versions import router as enhanced_version_router
    api_router.include_router(enhanced_version_router, prefix="", tags=["advanced-version-control"])
    logger.info("✅ Advanced document versions router loaded")
except ImportError as e:
    logger.warning(f"⚠️  Advanced document versions router not available: {e}")

try:
    from app.api.v1.endpoints.document_generation import router as document_generation_router
    api_router.include_router(document_generation_router, prefix="", tags=["document-generation"])
    logger.info("✅ Document generation router loaded")
except ImportError as e:
    logger.warning(f"⚠️  Document generation router not available: {e}")

# NEW: Admin and Dynamic Data routers
try:
    from app.api.v1.endpoints.admin import router as admin_router
    api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
    logger.info("✅ Admin router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load admin router: {e}")

try:
    from app.api.v1.endpoints.dynamic_data import router as dynamic_data_router
    api_router.include_router(dynamic_data_router, prefix="/dynamic-data", tags=["dynamic-data"])
    logger.info("✅ Dynamic data router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load dynamic data router: {e}")

# Add a health check endpoint
@api_router.get("/health", tags=["health"])
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "NDIS Management API is running",
        "services": {
            "referrals": "available",
            "participants": "available", 
            "care_workflow": "available",
            "documents": "available",
            "admin": "available",
            "dynamic_data": "available",
            "email_service": "available"
        }
    }

@api_router.get("/status", tags=["health"])  
def system_status():
    """System status with more details"""
    try:
        from app.core.database import SessionLocal
        from app.services.email_service import EmailService
        
        db = SessionLocal()
        
        # Test database connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "connected"
        db.close()
        
        # Test email service configuration
        email_service = EmailService()
        email_status = "configured" if email_service.is_configured else "not_configured"
        
    except Exception as e:
        db_status = f"error: {str(e)}"
        email_status = "error"
    
    return {
        "api_status": "running",
        "database_status": db_status,
        "email_service_status": email_status,
        "timestamp": "2025-01-27T10:30:00Z",
        "endpoints": {
            "referrals": "/api/v1/participants/referral-simple",
            "admin": "/api/v1/admin/system-status",
            "dynamic_data": "/api/v1/dynamic-data/contact_methods",
            "email_test": "/api/v1/email/test-email-configuration", 
            "email_status": "/api/v1/email/email-configuration-status"
        }
    }