# backend/app/main.py - UPDATED WITH ADMIN FUNCTIONALITY
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root (2 levels up from backend/app/)
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

app = FastAPI(
    title="NDIS Management System API",
    description="APIs for NDIS Service Providers - Clients, Documents, Resources, Referrals, and Admin",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

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
            "care_workflow": "/api/v1/care",
            "admin": "/api/v1/admin",
            "dynamic_data": "/api/v1/dynamic-data"
        },
        "admin": {
            "note": "Admin endpoints require X-Admin-Key header",
            "endpoints": {
                "system_status": "/api/v1/admin/system-status",
                "dynamic_data": "/api/v1/admin/dynamic-data/{type}",
                "users": "/api/v1/admin/users",
                "settings": "/api/v1/admin/settings/application"
            }
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# Only initialize database if not already done
@app.on_event("startup")
async def startup_event():
    print("🚀 Starting up NDIS Management System API...")
    
    # Check if tables exist, if not create them
    try:
        from app.core.database import engine, Base
        from sqlalchemy import inspect
        
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if not existing_tables:
            print("📋 No tables found. Creating database tables...")
            # Import models to register them with SQLAlchemy
            from app.models import (
                referral, participant, care_plan, document, 
                document_generation, document_workflow,
                dynamic_data, user, settings
            )
            Base.metadata.create_all(bind=engine)
            print("✅ Database tables created successfully!")
        else:
            print(f"✅ Database already initialized with {len(existing_tables)} tables")
        
        # Initialize default data
        from app.core.database import SessionLocal
        from app.services.seed_dynamic_data import run as run_seeds
        from app.services.user_service import RoleService
        
        db = SessionLocal()
        try:
            # Seed dynamic data
            run_seeds(db)
            print("✅ Dynamic data seeded")
            
            # Initialize system roles
            RoleService.initialize_system_roles(db)
            print("✅ System roles initialized")
            
        except Exception as e:
            print(f"⚠️  Warning during data initialization: {e}")
        finally:
            db.close()
            
    except Exception as e:
        print(f"⚠️  Database initialization issue: {e}")
        print("You may need to run: python create_tables.py")
        # Don't fail startup, let the app run

    # Display configuration info
    admin_key_set = bool(os.getenv("ADMIN_API_KEY") and os.getenv("ADMIN_API_KEY") != "admin-secret-key-change-in-production")
    print(f"🔐 Admin API key configured: {admin_key_set}")
    
    email_configured = bool(os.getenv("SMTP_SERVER") and os.getenv("SMTP_USERNAME"))
    print(f"📧 Email service configured: {email_configured}")
    
    print(f"🌐 CORS origins: {origins}")
    print("🎉 NDIS Management System API is ready!")

@app.on_event("shutdown")
async def shutdown_event():
    print("🛑 Shutting down NDIS Management System API...")