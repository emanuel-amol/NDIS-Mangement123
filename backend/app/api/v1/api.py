# backend/app/api/v1/api.py - FIXED VERSION
from fastapi import APIRouter
from app.api.v1 import participants, referrals_simple

api_router = APIRouter()

# Include referrals_simple router - this has the correct endpoints
api_router.include_router(referrals_simple.router, prefix="/participants", tags=["referrals"])

# Include participants router 
api_router.include_router(participants.router, prefix="/participants", tags=["participants"])