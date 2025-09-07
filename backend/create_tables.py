#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from app.core.database import Base
from sqlalchemy import text

# Import all models so they are registered with SQLAlchemy
from app.models.referral import Referral
from app.models.dynamic_data import DataType, DataPoint

def column_exists(conn, table_name, column_name):
    """Check if a column exists in a table"""
    try:
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = :table_name AND column_name = :column_name
        """), {"table_name": table_name, "column_name": column_name})
        return result.fetchone() is not None
    except Exception:
        return False

def create_tables():
    """Create all database tables and update existing ones"""
    print("Creating/updating database tables...")
    
    try:
        # First, create any missing tables
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] Base tables created/verified")
        
        # Then, add missing columns to existing tables
        with engine.connect() as conn:
            # Check if new referral columns exist
            if not column_exists(conn, 'referrals', 'disability_type'):
                print("[INFO] Adding new NDIS columns to referrals table...")
                
                # Add columns one by one to avoid transaction issues
                columns_to_add = [
                    "ALTER TABLE referrals ADD COLUMN disability_type VARCHAR(100) DEFAULT 'Not Specified'",
                    "ALTER TABLE referrals ADD COLUMN service_types TEXT[] DEFAULT ARRAY['Personal Care']",
                    "ALTER TABLE referrals ADD COLUMN ndis_number VARCHAR(50)",
                    "ALTER TABLE referrals ADD COLUMN urgency_level VARCHAR(20) DEFAULT 'medium'",
                    "ALTER TABLE referrals ADD COLUMN preferred_contact_method VARCHAR(50) DEFAULT 'phone'",
                    "ALTER TABLE referrals ADD COLUMN current_supports TEXT DEFAULT 'Information not provided'",
                    "ALTER TABLE referrals ADD COLUMN support_goals TEXT DEFAULT 'Information not provided'",
                    "ALTER TABLE referrals ADD COLUMN accessibility_needs TEXT",
                    "ALTER TABLE referrals ADD COLUMN cultural_considerations TEXT"
                ]
                
                for sql in columns_to_add:
                    try:
                        conn.execute(text(sql))
                        conn.commit()
                    except Exception as e:
                        print(f"[WARNING] Column might already exist: {e}")
                        conn.rollback()
                
                # Now make required fields NOT NULL
                required_fields = [
                    "ALTER TABLE referrals ALTER COLUMN disability_type SET NOT NULL",
                    "ALTER TABLE referrals ALTER COLUMN service_types SET NOT NULL", 
                    "ALTER TABLE referrals ALTER COLUMN urgency_level SET NOT NULL",
                    "ALTER TABLE referrals ALTER COLUMN preferred_contact_method SET NOT NULL",
                    "ALTER TABLE referrals ALTER COLUMN current_supports SET NOT NULL",
                    "ALTER TABLE referrals ALTER COLUMN support_goals SET NOT NULL"
                ]
                
                for sql in required_fields:
                    try:
                        conn.execute(text(sql))
                        conn.commit()
                    except Exception as e:
                        print(f"[WARNING] Constraint might already exist: {e}")
                        conn.rollback()
                
                print("[SUCCESS] Added NDIS columns to referrals table")
            else:
                print("[INFO] Referrals table already has NDIS columns")
        
        print("[SUCCESS] All tables created/updated successfully!")
        print("[INFO] Tables available:")
        print("  - referrals (with NDIS fields)")
        print("  - data_types")
        print("  - data_points")
        
    except Exception as e:
        print(f"[ERROR] Error creating/updating tables: {e}")
        return False
    
    return True

if __name__ == "__main__":
    create_tables()