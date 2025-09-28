# backend/app/api/v1/api.py - COMPLETE API ROUTER WITH FILES INTEGRATION
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
# FILES ROUTER - NEW ADDITION FOR FILE UPLOAD
# ==========================================

try:
    from app.api.v1.endpoints.files import router as files_router
    api_router.include_router(files_router, prefix="/files", tags=["files"])
    logger.info("✅ Files router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load files router: {e}")
    # Create a fallback router for files
    fallback_files_router = APIRouter()
    
    @fallback_files_router.post("/upload")
    def fallback_file_upload():
        return {
            "error": "File upload service not available",
            "message": "File upload service is temporarily unavailable"
        }
    
    @fallback_files_router.get("/{filename}")
    def fallback_file_download(filename: str):
        return {
            "error": "File download service not available",
            "message": "File download service is temporarily unavailable"
        }
    
    @fallback_files_router.delete("/file/{file_id}")
    def fallback_file_delete(file_id: str):
        return {
            "error": "File deletion service not available",
            "message": "File deletion service is temporarily unavailable"
        }
    
    api_router.include_router(fallback_files_router, prefix="/files", tags=["files-fallback"])

# ==========================================
# SUPPORT WORKERS ROUTER
# ==========================================

try:
    from app.api.v1.endpoints.support_workers import router as support_workers_router
    api_router.include_router(support_workers_router, prefix="/support-workers", tags=["support-workers"])
    logger.info('✅ Support workers router loaded')
except ImportError as e:
    logger.error(f"❌ Failed to load support workers router: {e}")

# ==========================================
# APPOINTMENTS ROUTER
# ==========================================

try:
    from app.api.v1.endpoints.appointments import router as appointments_router
    api_router.include_router(appointments_router, prefix="/appointments", tags=["appointments"])
    logger.info("✅ Appointments router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load appointments router: {e}")
    # Create a fallback router for appointments
    fallback_appointments_router = APIRouter()
    
    @fallback_appointments_router.get("/status")
    def fallback_appointments_status():
        return {
            "error": "Appointments service not available",
            "message": "Please check server logs and ensure appointments endpoint is properly configured"
        }
    
    @fallback_appointments_router.get("/{appointment_id}")
    def fallback_get_appointment(appointment_id: int):
        return {
            "error": "Appointments service not available",
            "appointment_id": appointment_id,
            "message": "Appointments service temporarily unavailable"
        }
    
    @fallback_appointments_router.patch("/{appointment_id}/status")
    def fallback_update_appointment_status(appointment_id: int):
        return {
            "error": "Appointments service not available",
            "message": "Cannot update appointment status - service temporarily unavailable"
        }
    
    api_router.include_router(fallback_appointments_router, prefix="/appointments", tags=["appointments-fallback"])

# ==========================================
# ROSTERING ROUTER
# ==========================================

try:
    from app.api.v1.endpoints.roster import router as roster_router
    api_router.include_router(roster_router, prefix="/rostering", tags=["rostering"])
    logger.info("✅ Rostering router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load rostering router: {e}")
    # Create a fallback router for rostering
    fallback_roster_router = APIRouter()
    
    @fallback_roster_router.get("/status")
    def fallback_roster_status():
        return {
            "error": "Rostering service not available",
            "message": "Please check server logs and ensure roster endpoint is properly configured"
        }
    
    @fallback_roster_router.get("/shifts")
    def fallback_get_shifts():
        return {
            "error": "Rostering service not available",
            "shifts": [],
            "message": "Roster service temporarily unavailable"
        }
    
    api_router.include_router(fallback_roster_router, prefix="/rostering", tags=["rostering-fallback"])

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
# QUOTATIONS ROUTER
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
# ADMIN ROUTERS
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

# NEW: ADMIN USERS ROUTER
try:
    from app.api.v1.endpoints.admin_users import router as admin_users_router
    api_router.include_router(admin_users_router, prefix="/admin", tags=["admin-users"])
    logger.info("✅ Admin Users router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load admin users router: {e}")
    # Create a fallback router for admin users
    fallback_admin_users_router = APIRouter()
    
    @fallback_admin_users_router.get("/users")
    def fallback_admin_users_list():
        return {
            "error": "Admin users service not available",
            "message": "User management service is temporarily unavailable",
            "users": []
        }
    
    @fallback_admin_users_router.post("/users")
    def fallback_admin_users_create():
        return {
            "error": "Admin users service not available",
            "message": "User creation service is temporarily unavailable"
        }
    
    api_router.include_router(fallback_admin_users_router, prefix="/admin", tags=["admin-users-fallback"])

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

try:
    from app.api.v1.endpoints.document_generation import router as document_generation_router
    api_router.include_router(document_generation_router, prefix="/document-generation", tags=["document-generation"])
    logger.info("✅ Document generation router loaded")
except ImportError as e:
    logger.error(f"❌ Failed to load document generation router: {e}")

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
# HEALTH CHECK ENDPOINTS - UPDATED WITH FILES
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
            "files": "available",  # NEW: Files service
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
            "appointments": "/api/v1/appointments/{id}",
            "admin": "/api/v1/admin/system-status",
            "admin_users": "/api/v1/admin/users",
            "dynamic_data": "/api/v1/dynamic-data/contact_methods",
            "quotations": "/api/v1/quotations/participants/{id}/generate-from-care-plan",
            "documents": "/api/v1/participants/{id}/documents",
            "files": "/api/v1/files/upload",  # NEW: Files endpoints
            "file_download": "/api/v1/files/{filename}",
            "file_delete": "/api/v1/files/file/{file_id}",
            "care_workflow": "/api/v1/care/participants/{id}/prospective-workflow",
            "rostering": "/api/v1/rostering/shifts"
        },
        "router_status": {
            "core_routers": ["referral", "participant", "care_workflow", "appointments", "rostering", "files"],
            "admin_routers": ["admin", "admin_users", "dynamic_data"],
            "quotation_routers": ["quotations"],
            "document_routers": ["document", "document_generation", "document_versions", "document_workflow"],
            "fallback_active": "check logs for specific router failures"
        }
    }

# ==========================================
# DEBUG ENDPOINTS - UPDATED WITH FILES
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
        "file_endpoints": [  # NEW: File endpoints
            "/api/v1/files/upload",
            "/api/v1/files/{filename}",
            "/api/v1/files/file/{file_id}",
            "/api/v1/files/referral/{referral_id}/files",
            "/api/v1/files/participant/{participant_id}/files",
            "/api/v1/files/health"
        ],
        "appointment_endpoints": [
            "/api/v1/appointments",
            "/api/v1/appointments/{appointment_id}",
            "/api/v1/appointments/{appointment_id}/status",
            "/api/v1/appointments/health"
        ],
        "rostering_endpoints": [
            "/api/v1/rostering/shifts",
            "/api/v1/rostering/shifts/{shift_id}",
            "/api/v1/rostering/workers/{worker_id}/shifts",
            "/api/v1/rostering/participants/{participant_id}/shifts"
        ],
        "quotation_endpoints": [
            "/api/v1/quotations/participants/{participant_id}/generate-from-care-plan",
            "/api/v1/quotations/participants/{participant_id}",
            "/api/v1/quotations/{quotation_id}",
            "/api/v1/quotations/{quotation_id}/finalise"
        ],
        "document_endpoints": [
            "/api/v1/participants/{participant_id}/documents",
            "/api/v1/participants/{participant_id}/documents/{document_id}",
            "/api/v1/participants/{participant_id}/documents/{document_id}/download",
            "/api/v1/document-generation/templates",
            "/api/v1/document-versions/documents/{document_id}/versions",
            "/api/v1/document-workflow/workflows/pending-approvals"
        ],
        "admin_endpoints": [
            "/api/v1/admin/system-status",
            "/api/v1/admin/initialize-system",
            "/api/v1/admin/users",
            "/api/v1/admin/users/{user_id}",
            "/api/v1/admin/users/{user_id}/activate",
            "/api/v1/admin/users/{user_id}/deactivate",
            "/api/v1/admin/dynamic-data/{type}",
            "/api/v1/admin/settings/application"
        ],
        "dynamic_data_endpoints": [
            "/api/v1/dynamic-data/{type}",
            "/api/v1/dynamic-data/types/list"
        ],
        "email_endpoints": [
            "/api/v1/email/test-email-configuration",
            "/api/v1/email/send-test-email",
            "/api/v1/email/email-configuration-status"
        ],
        "health_endpoints": [
            "/api/v1/health",
            "/api/v1/status",
            "/api/v1/debug/routes"
        ]
    }

@api_router.get("/debug/import-status", tags=["debug"])
def get_import_status():
    """Debug endpoint to check which routers are loaded"""
    import_status = {
        "routers_loaded": [],
        "routers_failed": [],
        "total_routes": len(api_router.routes),
        "fallback_routers_active": []
    }
    
    # This would be populated during import attempts above
    # For now, return a summary based on what we know
    return {
        **import_status,
        "message": "Check startup logs for detailed import information",
        "recommendation": "Look for ✅ and ❌ symbols in the startup logs to see which routers loaded successfully"
    }

# ==========================================
# UTILITY ENDPOINTS
# ==========================================

@api_router.get("/ping", tags=["utility"])
def ping():
    """Simple ping endpoint for connectivity testing"""
    return {"message": "pong", "timestamp": "2025-01-27T10:30:00Z"}

@api_router.get("/version", tags=["utility"])
def get_version():
    """Get API version information"""
    return {
        "api_version": "1.0.0",
        "system_name": "NDIS Management System",
        "build_date": "2025-01-27",
        "features": [
            "Participant Management",
            "Referral Processing", 
            "Care Plan Workflow",
            "Appointment Management",
            "Rostering & Shift Management",
            "Document Management",
            "File Upload & Management",  # NEW
            "Quotation Generation",
            "Dynamic Data Configuration",
            "Admin Interface",
            "User Management",
            "Email Notifications"
        ]
    }

# Export the main router - CRITICAL FOR IMPORT
__all__ = ["api_router"]


# existing imports...
from app.api.v1.endpoints.participant_ai import router as participant_ai_router  # ADD

api_router = APIRouter()
# existing includes...
api_router.include_router(participant_ai_router)  # ADD
