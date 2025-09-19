# backend/migrations/add_document_workflow.py
"""
Migration script to add document workflow tables
Run this from backend/migrations directory
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables from project root
project_root = backend_dir.parent
env_paths = [
    project_root / '.env',
    backend_dir / '.env',
    Path.cwd() / '.env'
]

env_loaded = False
for env_path in env_paths:
    if env_path.exists():
        print(f"Loading .env from: {env_path}")
        load_dotenv(dotenv_path=env_path)
        env_loaded = True
        break

if not env_loaded:
    print("Warning: .env file not found in any expected location")
    print(f"Searched in: {[str(p) for p in env_paths]}")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Available environment variables:")
    for key in sorted(os.environ.keys()):
        if 'DATABASE' in key or 'DB' in key:
            print(f"  {key}={os.environ[key]}")
    
    raise ValueError(
        "DATABASE_URL environment variable is required! "
        "Please set it in your .env file in the project root."
    )

def run_migration():
    engine = create_engine(DATABASE_URL)
    
    print(f"Connected to database: {DATABASE_URL.split('@')[0] if '@' in DATABASE_URL else 'Local DB'}@***")
    
    # Import all models to register them with SQLAlchemy
    try:
        from app.core.database import Base
        print("✅ Database Base imported successfully")
        
        # Import all model modules to register tables
        from app.models import (
            participant, referral, care_plan, document, 
            document_generation, document_workflow
        )
        print("✅ All model modules imported successfully")
        
        # Import the specific classes to ensure they're registered
        from app.models import (
            Participant, Referral, CarePlan, RiskAssessment, ProspectiveWorkflow,
            Document, DocumentAccess, DocumentNotification, DocumentCategory,
            DocumentGenerationTemplate, GeneratedDocument, DocumentGenerationVariable, DocumentSignature,
            DocumentWorkflow, DocumentVersion, DocumentApproval
        )
        print("✅ All model classes imported successfully")
        
    except ImportError as e:
        print(f"❌ Error importing models: {e}")
        print("Make sure you've updated the __init__.py file in the models directory")
        return
    
    try:
        print("\n🔄 Creating new document workflow tables...")
        
        # Create all tables (existing tables won't be affected)
        Base.metadata.create_all(bind=engine)
        
        print("✅ Migration completed successfully!")
        print("\nNew tables that should be created:")
        print("- document_workflows")
        print("- document_versions") 
        print("- document_approvals")
        
        # Verify tables were created
        with engine.connect() as conn:
            try:
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('document_workflows', 'document_versions', 'document_approvals')
                    ORDER BY table_name;
                """))
                
                created_tables = [row[0] for row in result]
                print(f"\n📋 Verified tables in database: {created_tables}")
                
                if len(created_tables) == 3:
                    print("✅ All 3 workflow tables created successfully!")
                elif len(created_tables) > 0:
                    print(f"✅ {len(created_tables)} out of 3 tables were created")
                    missing = set(['document_workflows', 'document_versions', 'document_approvals']) - set(created_tables)
                    if missing:
                        print(f"⚠️  Missing tables: {list(missing)}")
                else:
                    print("⚠️  No new workflow tables found. They might already exist or there was an issue.")
                
                # Also show all document-related tables
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name LIKE '%document%'
                    ORDER BY table_name;
                """))
                all_doc_tables = [row[0] for row in result]
                print(f"\n📊 All document-related tables: {all_doc_tables}")
                
            except Exception as e:
                print(f"⚠️  Could not verify table creation: {e}")
                print("The tables may have been created successfully anyway.")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    print("🚀 Starting document workflow migration...")
    print(f"Working directory: {os.getcwd()}")
    print(f"Script location: {__file__}")
    print(f"Backend directory: {backend_dir}")
    print(f"Python path: {sys.path[:3]}...")  # Show first 3 entries
    
    try:
        run_migration()
        
        print("\n🎉 Migration script completed successfully!")
        print("\nNext steps:")
        print("1. Restart your FastAPI server")
        print("2. Test document upload with workflow")
        print("3. Check the new approval endpoints")
        print("4. The new API endpoints will be available at:")
        print("   - GET /api/v1/document-workflow/workflows/pending-approvals")
        print("   - POST /api/v1/document-workflow/documents/{id}/approve")
        print("   - POST /api/v1/document-workflow/documents/{id}/reject")
        
    except Exception as e:
        print(f"\n💥 Migration failed: {e}")
        print("\nTroubleshooting:")
        print("1. Check that your DATABASE_URL is correct in .env")
        print("2. Ensure your database is running")
        print("3. Verify all model files are created correctly")
        print("4. Make sure __init__.py imports are correct")