# backend/scripts/setup_documents.py
"""
Complete setup script for the document management system
Run this after setting up the database to initialize everything
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.document import DocumentCategory
from app.services.document_service import DocumentService

def setup_document_system():
    """Set up the complete document management system"""
    print("Setting up NDIS Document Management System...")
    
    # Create database tables
    print("Creating database tables...")
    try:
        # Import all models to register them
        from app.models import referral, participant, care_plan, document
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False
    
    # Initialize document categories
    db = SessionLocal()
    try:
        print("Initializing document categories...")
        
        # Check if categories already exist
        existing_categories = db.query(DocumentCategory).count()
        if existing_categories > 0:
            print(f"Found {existing_categories} existing categories.")
        else:
            # Create default categories
            DocumentService.create_default_categories(db)
            print("✅ Document categories created successfully!")
        
        # List all categories
        categories = db.query(DocumentCategory).order_by(DocumentCategory.sort_order).all()
        print(f"\nAvailable document categories ({len(categories)}):")
        for cat in categories:
            status = "Required" if cat.is_required else "Optional"
            print(f"  • {cat.name} ({cat.category_id}) - {status}")
        
        print("\n✅ Document management system setup complete!")
        print("\nNext steps:")
        print("1. Start the backend server: uvicorn app.main:app --reload")
        print("2. Start the frontend: npm run dev")
        print("3. Navigate to the Documents section to upload files")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting up document categories: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def create_upload_directories():
    """Create necessary upload directories"""
    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    print(f"✅ Created upload directory: {upload_dir.absolute()}")

if __name__ == "__main__":
    # Create upload directories
    create_upload_directories()
    
    # Set up the document system
    success = setup_document_system()
    
    if success:
        print("\n🎉 Setup completed successfully!")
    else:
        print("\n❌ Setup failed. Please check the errors above.")
        sys.exit(1)