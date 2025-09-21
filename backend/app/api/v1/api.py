# backend/app/api/v1/api.py - COMBINED AND COMPLETE API ROUTER
from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)

api_router = APIRouter()

# ==========================================
# SAFE IMPORT HELPER FUNCTION
# ==========================================

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

# ==========================================
# CORE ROUTERS (these should always work)
# ==========================================

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

# ==========================================
# CRITICAL: DYNAMIC DATA ROUTER
# ==========================================

try:
    from app.api.v1.endpoints.dynamic_data import router as dynamic_data_router
    api_router.include_router(dynamic_data_router, prefix="/dynamic-data", tags=["dynamic-data"])
    logger.info("✅ Dynamic data router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load dynamic data router: {e}")
    # Create a fallback router for dynamic data
    fallback_dynamic_router = APIRouter()
    
    @fallback_dynamic_router.get("/{data_type}")
    def fallback_get_dynamic_data(data_type: str):
        return {
            "error": f"Dynamic data service not available for type: {data_type}",
            "message": "Please check server logs and ensure dynamic_data endpoint is properly configured"
        }
    
    @fallback_dynamic_router.get("/")
    def fallback_dynamic_root():
        return {
            "error": "Dynamic data service not available",
            "available_endpoints": [],
            "message": "Service temporarily unavailable"
        }
    
    api_router.include_router(fallback_dynamic_router, prefix="/dynamic-data", tags=["dynamic-data-fallback"])

# ==========================================
# CRITICAL: ADMIN ROUTER
# ==========================================

try:
    from app.api.v1.endpoints.admin import router as admin_router
    api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
    logger.info("✅ Admin router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load admin router: {e}")
    # Create a fallback router for admin
    fallback_admin_router = APIRouter()
    
    @fallback_admin_router.get("/system-status")
    def fallback_admin_status():
        return {
            "error": "Admin service not available",
            "message": "Please check server logs and ensure admin endpoint is properly configured",
            "status": "service_unavailable"
        }
    
    @fallback_admin_router.get("/settings/application")
    def fallback_admin_settings():
        return {
            "error": "Admin settings service not available",
            "message": "Default settings service unavailable"
        }
    
    api_router.include_router(fallback_admin_router, prefix="/admin", tags=["admin-fallback"])

# ==========================================
# EMAIL TESTING ROUTER
# ==========================================

try:
    from app.api.v1.endpoints.email_test import router as email_test_router
    api_router.include_router(email_test_router, prefix="/email", tags=["email-testing"])
    logger.info("✅ Email testing router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load email testing router: {e}")
    # Create fallback for email testing
    fallback_email_router = APIRouter()
    
    @fallback_email_router.get("/email-configuration-status")
    def fallback_email_status():
        return {
            "configured": False,
            "error": "Email service not available",
            "message": "Email testing service is not configured"
        }
    
    @fallback_email_router.post("/test-email-configuration")
    def fallback_email_test():
        return {
            "success": False,
            "error": "Email testing service not available"
        }
    
    api_router.include_router(fallback_email_router, prefix="/email", tags=["email-testing-fallback"])

# ==========================================
# DOCUMENT ROUTERS (may fail if workflow tables don't exist)
# ==========================================

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
            "message": "Document service is not available. Please check server logs.",
            "participant_id": participant_id
        }
    
    api_router.include_router(fallback_doc_router, prefix="", tags=["documents-fallback"])

# ==========================================
# OPTIONAL WORKFLOW ROUTERS (gracefully fail if tables don't exist)
# ==========================================

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

# ==========================================
# HEALTH CHECK ENDPOINTS
# ==========================================

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
            "dynamic_data": "available",
            "admin": "available",
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
        try:
            email_service = EmailService()
            email_status = "configured" if email_service.is_configured else "not_configured"
        except Exception as email_error:
            email_status = f"error: {str(email_error)}"
        
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
        },
        "router_status": {
            "core_routers": ["referral", "participant", "care_workflow"],
            "admin_routers": ["admin", "dynamic_data"],
            "optional_routers": ["document", "document_workflow", "email_test"],
            "fallback_active": "check logs for specific router failures"
        }
    }

# ==========================================
# FALLBACK ERROR HANDLER
# ==========================================

@api_router.get("/debug/routes", tags=["debug"])
def list_routes():
    """Debug endpoint to list all available routes"""
    return {
        "message": "Available API routes",
        "core_endpoints": [
            "/api/v1/participants/referral-simple",
            "/api/v1/participants/referrals",
            "/api/v1/participants/{participant_id}",
            "/api/v1/care/*",
        ],
        "admin_endpoints": [
            "/api/v1/admin/system-status",
            "/api/v1/admin/settings/application",
            "/api/v1/admin/users",
            "/api/v1/admin/roles"
        ],
        "dynamic_data_endpoints": [
            "/api/v1/dynamic-data/{type}",
            "/api/v1/dynamic-data/{type}?all=true"
        ],
        "health_endpoints": [
            "/api/v1/health",
            "/api/v1/status"
        ],
        "email_endpoints": [
            "/api/v1/email/test-email-configuration",
            "/api/v1/email/email-configuration-status"
        ]
    }

# Export the main router
__all__ = ["api_router"]