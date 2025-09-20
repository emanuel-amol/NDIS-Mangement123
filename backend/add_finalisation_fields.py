# backend/migrations/add_finalisation_fields.py - DATABASE MIGRATION SCRIPT
"""
Add is_finalised fields to CarePlan and RiskAssessment tables

Run this script once to add the new finalisation fields to existing databases.
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

def run_migration():
    """Add finalisation fields to existing tables"""
    engine = create_engine(DATABASE_URL)
    
    migration_queries = [
        # Add is_finalised field to care_plans table
        """
        ALTER TABLE care_plans 
        ADD COLUMN IF NOT EXISTS is_finalised BOOLEAN DEFAULT FALSE;
        """,
        
        # Add finalised_at field to care_plans table
        """
        ALTER TABLE care_plans 
        ADD COLUMN IF NOT EXISTS finalised_at TIMESTAMP WITH TIME ZONE;
        """,
        
        # Add finalised_by field to care_plans table
        """
        ALTER TABLE care_plans 
        ADD COLUMN IF NOT EXISTS finalised_by VARCHAR(255);
        """,
        
        # Add is_finalised field to risk_assessments table
        """
        ALTER TABLE risk_assessments 
        ADD COLUMN IF NOT EXISTS is_finalised BOOLEAN DEFAULT FALSE;
        """,
        
        # Add finalised_at field to risk_assessments table
        """
        ALTER TABLE risk_assessments 
        ADD COLUMN IF NOT EXISTS finalised_at TIMESTAMP WITH TIME ZONE;
        """,
        
        # Add finalised_by field to risk_assessments table
        """
        ALTER TABLE risk_assessments 
        ADD COLUMN IF NOT EXISTS finalised_by VARCHAR(255);
        """,
        
        # Update existing completed care plans to be finalised
        """
        UPDATE care_plans 
        SET is_finalised = TRUE, finalised_at = updated_at 
        WHERE status = 'complete' OR status = 'approved';
        """,
        
        # Update existing completed risk assessments to be finalised
        """
        UPDATE risk_assessments 
        SET is_finalised = TRUE, finalised_at = updated_at 
        WHERE approval_status = 'complete' OR approval_status = 'approved';
        """
    ]
    
    try:
        with engine.connect() as connection:
            # Start a transaction
            with connection.begin():
                print("Running finalisation fields migration...")
                
                for i, query in enumerate(migration_queries, 1):
                    print(f"Executing step {i}/{len(migration_queries)}...")
                    connection.execute(text(query))
                    print(f"Step {i} completed successfully")
                
                print("✅ Migration completed successfully!")
                print("Added finalisation fields to care_plans and risk_assessments tables")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

def check_migration_status():
    """Check if the migration has already been applied"""
    engine = create_engine(DATABASE_URL)
    
    check_queries = [
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'care_plans' AND column_name = 'is_finalised';",
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'risk_assessments' AND column_name = 'is_finalised';"
    ]
    
    try:
        with engine.connect() as connection:
            results = []
            for query in check_queries:
                result = connection.execute(text(query)).fetchone()
                results.append(result is not None)
            
            if all(results):
                print("✅ Migration has already been applied")
                return True
            else:
                print("⚠️  Migration needs to be applied")
                return False
                
    except Exception as e:
        print(f"❌ Error checking migration status: {e}")
        return False

if __name__ == "__main__":
    print("NDIS Management System - Finalisation Fields Migration")
    print("=" * 60)
    
    if not check_migration_status():
        print("\nApplying migration...")
        run_migration()
    else:
        print("\nNo migration needed.")
    
    print("\nMigration check complete.")