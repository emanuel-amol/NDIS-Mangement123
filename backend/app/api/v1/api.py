# backend/app/api/v1/api.py - COMPLETE API ROUTER WITH DOCUMENT GENERATION
from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)

# Create the main API router
api_router = APIRouter()

def safe_import_router(module_path, router_name, fallback_prefix="/"):
    """Safely import router with fallback"""
    try:
        module = __import__(module_path, fromlist=[router_name])
        return getattr(module, router_name)
    except ImportError as e:
        logger.warning(f"Could not import {module_path}.{router_name}: {e}")
        fallback_router = APIRouter()
        @fallback_router.get("/status")
        def get_status():
            return {"status": "service_unavailable", "message": f"Module {module_path} not available"}
        return fallback_router

# ==========================================
# CORE ROUTERS
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
# FILES ROUTER
# ==========================================

try:
    from app.api.v1.endpoints.files import router as files_router
    api_router.include_router(files_router, prefix="/files", tags=["files"])
    logger.info("✅ Files router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load files router: {e}")

# ==========================================
# DOCUMENT GENERATION ROUTER - CRITICAL
# ==========================================

try:
    from app.api.v1.endpoints.document_generation import router as document_generation_router
    api_router.include_router(
        document_generation_router, 
        prefix="/document-generation", 
        tags=["document-generation"]
    )
    logger.info("✅ Document generation router loaded at /document-generation")
except ImportError as e:
    logger.error(f"❌ Failed to load document generation router: {e}")
    logger.error("Make sure document_generation.py exists in app/api/v1/endpoints/")

# ==========================================
# AI ROUTERS
# ==========================================

try:
    from app.api.v1.endpoints.participant_ai import router as participant_ai_router
    api_router.include_router(participant_ai_router, tags=["participant-ai"])
    logger.info("✅ Participant AI router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load participant AI router: {e}")

try:
    from app.api.v1.endpoints.ai_status import router as ai_status_router
    api_router.include_router(ai_status_router, tags=["ai-status"])
    logger.info("✅ AI Status router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load AI status router: {e}")

# ==========================================
# ADDITIONAL ROUTERS
# ==========================================

try:
    from app.api.v1.endpoints.support_workers import router as support_workers_router
    api_router.include_router(support_workers_router, prefix="/support-workers", tags=["support-workers"])
    logger.info('✅ Support workers router loaded')
except ImportError as e:
    logger.error(f"❌ Failed to load support workers router: {e}")

try:
    from app.api.v1.endpoints.appointments import router as appointments_router
    api_router.include_router(appointments_router, prefix="/appointments", tags=["appointments"])
    logger.info("✅ Appointments router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load appointments router: {e}")

try:
    from app.api.v1.endpoints.roster import router as roster_router
    api_router.include_router(roster_router, prefix="/rostering", tags=["rostering"])
    logger.info("✅ Rostering router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load rostering router: {e}")

try:
    from app.api.v1.endpoints.dynamic_data import router as dynamic_data_router
    api_router.include_router(dynamic_data_router, prefix="/dynamic-data", tags=["dynamic-data"])
    logger.info("✅ Dynamic data router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load dynamic data router: {e}")

try:
    from app.api.v1.endpoints.quotations import router as quotations_router
    api_router.include_router(quotations_router, prefix="", tags=["quotations"])
    logger.info("✅ Quotations router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load quotations router: {e}")

try:
    from app.api.v1.endpoints.admin import router as admin_router
    api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
    logger.info("✅ Admin router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load admin router: {e}")

try:
    from app.api.v1.endpoints.admin_users import router as admin_users_router
    api_router.include_router(admin_users_router, prefix="/admin", tags=["admin-users"])
    logger.info("✅ Admin Users router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load admin users router: {e}")

try:
    from app.api.v1.endpoints.email_test import router as email_test_router
    api_router.include_router(email_test_router, prefix="/email", tags=["email-testing"])
    logger.info("✅ Email testing router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load email testing router: {e}")

# ==========================================
# DOCUMENT ROUTERS
# ==========================================

try:
    from app.api.v1.endpoints.document import router as document_router
    api_router.include_router(document_router, prefix="", tags=["documents"])
    logger.info("✅ Document router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load document router: {e}")

try:
    from app.api.v1.endpoints.document_versions import router as document_versions_router
    api_router.include_router(document_versions_router, prefix="/document-versions", tags=["document-versions"])
    logger.info("✅ Document versions router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load document versions router: {e}")

try:
    from app.api.v1.endpoints.document_workflow import router as document_workflow_router
    api_router.include_router(document_workflow_router, prefix="/document-workflow", tags=["document-workflow"])
    logger.info("✅ Document workflow router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load document workflow router: {e}")

try:
    from app.api.v1.endpoints.enhanced_document_versions import router as enhanced_document_versions_router
    api_router.include_router(enhanced_document_versions_router, prefix="/enhanced-document-versions", tags=["enhanced-document-versions"])
    logger.info("✅ Enhanced document versions router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load enhanced document versions router: {e}")

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
            "appointments": "available",
            "rostering": "available",
            "documents": "available",
            "document_generation": "available",
            "files": "available",
            "ai": "available",
            "ai_status": "available",
            "dynamic_data": "available",
            "quotations": "available",
            "admin": "available",
            "admin_users": "available",
            "email": "available"
        }
    }

@api_router.get("/status", tags=["health"])  
def system_status():
    """System status with more details"""
    try:
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "connected"
        db.close()
        
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "api_status": "running",
        "database_status": db_status,
        "timestamp": "2025-10-05T10:30:00Z",
        "endpoints": {
            # Core endpoints
            "referrals": "/api/v1/participants/referral-simple",
            "appointments": "/api/v1/appointments/{id}",
            "admin": "/api/v1/admin/system-status",
            "admin_users": "/api/v1/admin/users",
            "dynamic_data": "/api/v1/dynamic-data/contact_methods",
            "quotations": "/api/v1/quotations/participants/{id}/generate-from-care-plan",
            
            # Document management endpoints
            "documents": "/api/v1/participants/{id}/documents",
            "files": "/api/v1/files/upload",
            "file_download": "/api/v1/files/{filename}",
            "file_delete": "/api/v1/files/file/{file_id}",
            
            # Document generation endpoints - NEW
            "doc_gen_templates": "/api/v1/document-generation/templates",
            "doc_gen_validate": "/api/v1/document-generation/participants/{id}/validate/{template_id}",
            "doc_gen_generate": "/api/v1/document-generation/participants/{id}/generate-document",
            "doc_gen_preview": "/api/v1/document-generation/participants/{id}/generate-document/{template_id}/preview",
            "doc_gen_bulk": "/api/v1/document-generation/participants/{id}/bulk-generate",
            "doc_gen_status": "/api/v1/document-generation/status",
            "doc_gen_categories": "/api/v1/document-generation/categories",
            
            # Workflow endpoints
            "care_workflow": "/api/v1/care/participants/{id}/prospective-workflow",
            "rostering": "/api/v1/rostering/shifts",
            
            # AI endpoints
            "ai_care_plan": "/api/v1/participants/{id}/ai/care-plan/suggest",
            "ai_risk": "/api/v1/participants/{id}/ai/risk/assess",
            "ai_notes": "/api/v1/participants/{id}/ai/notes/clinical",
            "ai_status": "/api/v1/ai/status",
            "ai_health": "/api/v1/ai/health"
        }
    }

# Export the main router
__all__ = ["api_router"]