from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.v1.api_simple import api_router
from app.core.database import engine
from app.models import referral, user, email_log  # Import all models

app = FastAPI(
    title="NDIS Management System",
    description="A comprehensive system for managing NDIS referrals and services",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "NDIS Management System API", 
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "NDIS Management System"}

if __name__ == "__main__":
    uvicorn.run("main_simple:app", host="127.0.0.1", port=8000, reload=True)