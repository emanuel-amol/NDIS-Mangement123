# backend/app/api/v1/api.py
from fastapi import APIRouter

from app.api.v1 import participants, documents, sil_homes

api_router = APIRouter()

api_router.include_router(participants.router, prefix="/participants", tags=["participants"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(sil_homes.router, prefix="/sil-homes", tags=["sil-homes"])