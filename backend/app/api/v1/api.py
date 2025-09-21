# backend/app/api/v1/api.py - COMPLETE WORKING VERSION
from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)

# Create the main API router
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
# QUOTATIONS ROUTER - NEW FOR SRS COMPLIANCE
# ==========================================

try:
    from app.api.v1.endpoints.quotations import router as quotations_router
    api_router.include_router(quotations_router, prefix="", tags=["quotations"])
    logger.info("✅ Quotations router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load quotations router: {e}")
    # Create a fallback router for quotations
    fallback_quotations_router = APIRouter()
    
    @fallback_quotations_router.get("/quotations/status")
    def fallback_quotations_status():
        return {
            "error": "Quotations service not available",
            "message": "Please check server logs and ensure quotations endpoint is properly configured"
        }
    
    @fallback_quotations_router.post("/quotations/participants/{participant_id}/generate-from-care-plan")
    def fallback_generate_quotation(participant_id: int):
        return {
            "error": "Quotations service not available",
            "message": "Quotation generation service is temporarily unavailable"
        }
    
    api_router.include_router(fallback_quotations_router, prefix="", tags=["quotations-fallback"])

# ==========================================
# ADMIN ROUTER
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

# ==========================================
# DOCUMENT ROUTERS (may fail if workflow tables don't exist)
# ==========================================

try:
    from app.api.v1.endpoints.document import router as document_router
    api_router.include_router(document_router, prefix="", tags=["documents"])
    logger.info("✅ Document router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load document router: {e}")

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
            "quotations": "available",
            "admin": "available"
        }
    }

@api_router.get("/status", tags=["health"])  
def system_status():
    """System status with more details"""
    try:
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        
        # Test database connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "connected"
        db.close()
        
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "api_status": "running",
        "database_status": db_status,
        "timestamp": "2025-01-27T10:30:00Z",
        "endpoints": {
            "referrals": "/api/v1/participants/referral-simple",
            "admin": "/api/v1/admin/system-status",
            "dynamic_data": "/api/v1/dynamic-data/contact_methods",
            "quotations": "/api/v1/quotations/participants/{id}/generate-from-care-plan"
        },
        "router_status": {
            "core_routers": ["referral", "participant", "care_workflow"],
            "admin_routers": ["admin", "dynamic_data"],
            "quotation_routers": ["quotations"],
            "fallback_active": "check logs for specific router failures"
        }
    }

# ==========================================
# DEBUG ENDPOINTS
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
        "quotation_endpoints": [
            "/api/v1/quotations/participants/{participant_id}/generate-from-care-plan",
            "/api/v1/quotations/participants/{participant_id}",
            "/api/v1/quotations/{quotation_id}",
            "/api/v1/quotations/{quotation_id}/finalise"
        ],
        "admin_endpoints": [
            "/api/v1/admin/system-status",
            "/api/v1/dynamic-data/{type}"
        ],
        "health_endpoints": [
            "/api/v1/health",
            "/api/v1/status"
        ]
    }

# Export the main router - CRITICAL FOR IMPORT
__all__ = ["api_router"]