from fastapi import APIRouter
from app.api.v1 import participants, referrals, providers

api_router = APIRouter()
api_router.include_router(referrals.router, prefix="/participants", tags=["referrals"])
api_router.include_router(participants.router, prefix="/participants", tags=["participants"])
api_router.include_router(providers.router, prefix="/providers", tags=["providers"])