# backend/app/api/v1/api_simple.py - Updated with Dynamic Data
from fastapi import APIRouter

from app.api.v1 import participants, documents, sil_homes, referrals_simple
# Import dynamic data router
from app.api.v1 import dynamic_data_complete

api_router = APIRouter()

# Referrals and participants
api_router.include_router(referrals_simple.router, prefix="/participants", tags=["referrals"])
api_router.include_router(participants.router, prefix="/participants", tags=["participants"])

# Documents and SIL homes
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(sil_homes.router, prefix="/sil-homes", tags=["sil-homes"])

# Dynamic data - the main router for all dynamic data operations
# This provides comprehensive CRUD operations for data types and points
api_router.include_router(
    dynamic_data_complete.router, 
    prefix="/dynamic-data", 
    tags=["dynamic-data"]
)