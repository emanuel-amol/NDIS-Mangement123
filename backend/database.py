# database_fix_script.py - Run this to fix the database schema issues
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

# Load environment
load_dotenv()

def fix_database_schema():
    """Fix the database schema to match the models"""
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return False
    
    print(f"🔗 Connecting to database...")
    engine = create_engine(database_url)
    
    try:
        with engine.connect() as conn:
            inspector = inspect(engine)
            
            # Check if quotations table exists
            if 'quotations' not in inspector.get_table_names():
                print("❌ quotations table doesn't exist - need to create tables first")
                return False
            
            # Get current columns
            quotation_columns = [col['name'] for col in inspector.get_columns('quotations')]
            print(f"📋 Current quotations columns: {quotation_columns}")
            
            # Check for missing columns
            missing_columns = []
            
            if 'finalised_at' not in quotation_columns:
                missing_columns.append("finalised_at TIMESTAMP WITH TIME ZONE")
                
            if 'finalised_by' not in quotation_columns:
                missing_columns.append("finalised_by VARCHAR(255)")
            
            if missing_columns:
                print(f"🔧 Adding missing columns: {missing_columns}")
                
                for column_def in missing_columns:
                    sql = f"ALTER TABLE quotations ADD COLUMN {column_def}"
                    print(f"   Executing: {sql}")
                    conn.execute(text(sql))
                    
                conn.commit()
                print("✅ Database schema updated successfully!")
                
            else:
                print("✅ Database schema is already up to date!")
                
            return True
            
    except Exception as e:
        print(f"❌ Error fixing database schema: {str(e)}")
        return False

def recreate_tables():
    """Alternative: Recreate all tables (DEVELOPMENT ONLY - DESTROYS DATA)"""
    
    print("⚠️  WARNING: This will destroy all existing data!")
    response = input("Are you sure you want to recreate all tables? (yes/NO): ")
    
    if response.lower() != 'yes':
        print("Operation cancelled.")
        return False
    
    try:
        # Import models to register them
        sys.path.append('backend')
        from app.core.database import engine, Base
        from app.models import (
            referral, participant, care_plan, document, 
            document_generation, document_workflow,
            dynamic_data, user, settings, quotation
        )
        
        print("🗑️  Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        
        print("🏗️  Creating all tables...")
        Base.metadata.create_all(bind=engine)
        
        print("✅ Tables recreated successfully!")
        
        # Seed dynamic data
        from app.core.database import SessionLocal
        from app.services.seed_dynamic_data import run as run_seeds
        
        db = SessionLocal()
        try:
            print("🌱 Seeding dynamic data...")
            run_seeds(db)
            print("✅ Dynamic data seeded!")
        finally:
            db.close()
            
        return True
        
    except Exception as e:
        print(f"❌ Error recreating tables: {str(e)}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Fix NDIS database schema")
    parser.add_argument("--recreate", action="store_true", 
                       help="Recreate all tables (DESTROYS DATA)")
    
    args = parser.parse_args()
    
    if args.recreate:
        recreate_tables()
    else:
        fix_database_schema()