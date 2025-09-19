# backend/app/api/v1/api.py - COMPLETE FIXED VERSION WITH CORRECT ROUTING
from fastapi import APIRouter

# Import all routers
from app.api.v1.endpoints.referral import router as referral_router
from app.api.v1.endpoints.participant import router as participant_router
from app.api.v1.endpoints.care_workflow import router as care_workflow_router
from app.api.v1.endpoints.document import router as document_router
from app.api.v1.endpoints.document_generation import router as document_generation_router
from app.api.v1.endpoints.document_workflow import router as document_workflow_router
from app.api.v1.endpoints.document_versions import router as document_versions_router
from app.api.v1.endpoints.enhanced_document_versions import router as enhanced_version_router

api_router = APIRouter()

# CRITICAL: Order matters for routing! More specific routes must come first.

# 1. Referral and Participant routes
api_router.include_router(referral_router, prefix="/participants", tags=["referrals"])
api_router.include_router(participant_router, prefix="/participants", tags=["participants"])

# 2. Care workflow routes
api_router.include_router(care_workflow_router, prefix="/care", tags=["care-workflow"])

# 3. Document workflow routes (specific routes first)
api_router.include_router(document_workflow_router, prefix="/document-workflow", tags=["document-workflow"])

# 4. Enhanced version control routes (MUST come before basic document routes)
# These handle: /documents/{id}/versions/detailed, /documents/{id}/versions/analytics, etc.
api_router.include_router(enhanced_version_router, prefix="", tags=["enhanced-version-control"])

# 5. Basic version control routes
api_router.include_router(document_versions_router, prefix="", tags=["document-versions"])

# 6. Document generation routes (specific routes)
api_router.include_router(document_generation_router, prefix="", tags=["document-generation"])

# 7. Basic document management routes (MUST come last to avoid conflicts)
# These handle: /participants/{id}/documents, /participants/{id}/documents/{id}, etc.
api_router.include_router(document_router, prefix="", tags=["documents"])