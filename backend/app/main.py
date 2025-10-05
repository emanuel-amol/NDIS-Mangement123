# backend/app/main.py - UPDATED WITH AI FUNCTIONALITY AND PROPER CORS
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy import inspect, text

# Load .env from project root (2 levels up from backend/app/)
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

app = FastAPI(
    title="NDIS Management System API",
    description="APIs for NDIS Service Providers - Clients, Documents, Resources, Referrals, AI, and Admin",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS - EXPANDED FOR AI FUNCTIONALITY
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000,http://127.0.0.1:3001").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
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
            "dynamic_data": "/api/v1/dynamic-data",
            "ai": "/api/v1/participants/{id}/ai"
        },
        "ai": {
            "status": "/api/v1/ai/status",
            "endpoints": {
                "care_plan_suggest": "/api/v1/participants/{id}/ai/care-plan/suggest",
                "risk_assess": "/api/v1/participants/{id}/ai/risk/assess",
                "clinical_notes": "/api/v1/participants/{id}/ai/notes/clinical",
                "suggestion_history": "/api/v1/participants/{id}/ai/suggestions/history"
            }
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
    return {"status": "healthy", "database": "connected", "ai": "available"}

def ensure_document_storage_schema(engine):
    """Ensure documents table has the columns required for file uploads."""
    try:
        inspector = inspect(engine)
        if "documents" not in inspector.get_table_names():
            return

        columns = {col["name"] for col in inspector.get_columns("documents")}

        ddl_statements = []
        if "file_id" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN file_id VARCHAR(255)")
        if "referral_id" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN referral_id INTEGER")
        if "file_url" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN file_url VARCHAR(500)")
        if "document_type" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN document_type VARCHAR(100)")
        if "is_confidential" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN is_confidential BOOLEAN DEFAULT FALSE")
        if "requires_approval" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN requires_approval BOOLEAN DEFAULT FALSE")
        if "is_active" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
        if "uploaded_at" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN uploaded_at TIMESTAMPTZ")
        if "approved_by" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN approved_by INTEGER")
        if "approved_at" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN approved_at TIMESTAMPTZ")
        if "extra_metadata" not in columns:
            ddl_statements.append("ALTER TABLE documents ADD COLUMN extra_metadata JSON")

        with engine.begin() as conn:
            for stmt in ddl_statements:
                conn.execute(text(stmt))

            conn.execute(text("ALTER TABLE documents ALTER COLUMN is_confidential SET DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE documents ALTER COLUMN requires_approval SET DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE documents ALTER COLUMN is_active SET DEFAULT TRUE"))
            conn.execute(text("ALTER TABLE documents ALTER COLUMN uploaded_at SET DEFAULT NOW()"))
            conn.execute(text("ALTER TABLE documents ALTER COLUMN extra_metadata SET DEFAULT '{}'::json"))

            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_documents_file_id ON documents (file_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_documents_referral_id ON documents (referral_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_documents_participant_id ON documents (participant_id)"))

            conn.execute(text("UPDATE documents SET file_id = CONCAT('doc_', id) WHERE file_id IS NULL"))
            conn.execute(text("UPDATE documents SET file_url = CONCAT('/api/v1/files/', filename) WHERE file_url IS NULL AND filename IS NOT NULL"))
            conn.execute(text("UPDATE documents SET uploaded_at = created_at WHERE uploaded_at IS NULL AND created_at IS NOT NULL"))
            conn.execute(text("UPDATE documents SET extra_metadata = '{}'::json WHERE extra_metadata IS NULL"))
            conn.execute(text("UPDATE documents SET tags = '[]'::json WHERE tags IS NULL"))
            conn.execute(text("UPDATE documents SET is_confidential = FALSE WHERE is_confidential IS NULL"))
            conn.execute(text("UPDATE documents SET requires_approval = FALSE WHERE requires_approval IS NULL"))
            conn.execute(text("UPDATE documents SET is_active = TRUE WHERE is_active IS NULL"))
    except Exception as exc:
        print(f'[warn] Document schema check failed: {exc}')

@app.on_event("startup")
async def startup_event():
    print('[info] Starting up NDIS Management System API...')
    
    try:
        from app.core.database import engine, Base
                
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if not existing_tables:
            print('[info] No tables found. Creating database tables...')
            from app.models import (
                referral, participant, care_plan, document, 
                document_generation, document_workflow,
                dynamic_data, user, settings, ai_suggestion
            )
            Base.metadata.create_all(bind=engine)
            print('[info] Database tables created successfully!')
        else:
            print(f'[info] Database already initialized with {len(existing_tables)} tables')
        
        ensure_document_storage_schema(engine)
        
        from app.core.database import SessionLocal
        from app.services.seed_dynamic_data import run as run_seeds
        from app.services.user_service import RoleService
        
        db = SessionLocal()
        try:
            run_seeds(db)
            print('[info] Dynamic data seeded')
            
            RoleService.initialize_system_roles(db)
            print('[info] System roles initialized')
            
        except Exception as e:
            print(f'[warn] Warning during data initialization: {e}')
        finally:
            db.close()
            
    except Exception as e:
        print(f'[warn] Database initialization issue: {e}')
        print("You may need to run: python create_tables.py")

    admin_key_set = bool(os.getenv("ADMIN_API_KEY") and os.getenv("ADMIN_API_KEY") != "admin-secret-key-change-in-production")
    print(f'[info] Admin API key configured: {admin_key_set}')
    
    email_configured = bool(os.getenv("SMTP_SERVER") and os.getenv("SMTP_USERNAME"))
    print(f'[info] Email service configured: {email_configured}')
    
    ai_configured = bool(os.getenv("WATSONX_API_KEY") and os.getenv("WATSONX_PROJECT_ID"))
    print(f'[info] AI service configured: {ai_configured}')
    
    print(f'[info] CORS origins: {origins}')
    print('[info] NDIS Management System API is ready!')

@app.on_event("shutdown")
async def shutdown_event():
    print('[info] Shutting down NDIS Management System API...')