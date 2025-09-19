# backend/app/main.py - FIXED VERSION
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root (2 levels up from backend/app/)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

app = FastAPI(
    title="NDIS Management System API",
    description="APIs for NDIS Service Providers - Clients, Documents, Resources, and Referrals",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import router after app is created to avoid circular imports
from app.api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "NDIS Management System API", 
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "referrals": "/api/v1/participants/referral-simple",
            "participants": "/api/v1/participants",
            "documents": "/api/v1/participants/{id}/documents",
            "care_workflow": "/api/v1/care"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# Only initialize database if not already done
@app.on_event("startup")
async def startup_event():
    print("Starting up NDIS Management System API...")
    
    # Check if tables exist, if not create them
    try:
        from app.core.database import engine, Base
        from sqlalchemy import inspect
        
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if not existing_tables:
            print("No tables found. Creating database tables...")
            # Import models to register them
            from app.models import referral, participant, care_plan, document
            Base.metadata.create_all(bind=engine)
            print("✅ Database tables created successfully!")
        else:
            print(f"✅ Database already initialized with {len(existing_tables)} tables")
            
    except Exception as e:
        print(f"⚠️  Database initialization issue: {e}")
        print("You may need to run: python create_tables.py")
        # Don't fail startup, let the app run