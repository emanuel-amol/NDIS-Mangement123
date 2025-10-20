# backend/scripts/init_document_categories.py
"""
Script to initialize document categories in the database
Run this after creating the database tables
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.document import DocumentCategory
from app.services.document_service import DocumentService

def init_document_categories():
    """Initialize default document categories"""
    db = SessionLocal()
    
    try:
        print("Initializing document categories...")
        
        # Check if categories already exist
        existing_categories = db.query(DocumentCategory).count()
        if existing_categories > 0:
            print(f"Found {existing_categories} existing categories. Skipping initialization.")
            return
        
        # Create default categories
        DocumentService.create_default_categories(db)
        
        # Verify categories were created
        total_categories = db.query(DocumentCategory).count()
        print(f"Successfully created {total_categories} document categories!")
        
        # List created categories
        categories = db.query(DocumentCategory).order_by(DocumentCategory.sort_order).all()
        print("\nCreated categories:")
        for cat in categories:
            print(f"  - {cat.name} ({cat.category_id}) - {'Required' if cat.is_required else 'Optional'}")
        
    except Exception as e:
        print(f"Error initializing document categories: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_document_categories()