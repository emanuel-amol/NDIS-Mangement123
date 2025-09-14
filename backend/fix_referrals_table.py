#!/usr/bin/env python3
# backend/fix_referrals_table.py - Focus only on referrals table

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base
from sqlalchemy import text

def fix_referrals_table():
    """Drop and recreate only the referrals table"""
    
    print("Fixing referrals table...")
    
    try:
        # Import only the Referral model
        from app.models.referral import Referral
        
        with engine.connect() as conn:
            # Start a transaction
            trans = conn.begin()
            
            try:
                # Drop only the referrals table
                print("Dropping referrals table...")
                conn.execute(text("DROP TABLE IF EXISTS referrals CASCADE"))
                
                # Commit the drop
                trans.commit()
                print("Referrals table dropped")
                
            except Exception as e:
                trans.rollback()
                print(f"Warning during table drop: {e}")
        
        # Create only the referrals table
        print("Creating referrals table...")
        Referral.__table__.create(bind=engine, checkfirst=True)
        
        print("Referrals table created successfully!")
        
        # Verify table exists
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'referrals'
                ORDER BY ordinal_position
            """))
            
            columns = [(row[0], row[1]) for row in result]
            print(f"Referrals table columns: {len(columns)}")
            for col_name, col_type in columns[:5]:  # Show first 5 columns
                print(f"  - {col_name}: {col_type}")
            
        return True
        
    except Exception as e:
        print(f"Error fixing referrals table: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database_connection():
    """Test database connection"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("Database connection successful")
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False

if __name__ == "__main__":
    print("NDIS Referrals Table Fix")
    print("=" * 30)
    
    # Test connection first
    if not test_database_connection():
        print("Fix database connection and try again.")
        sys.exit(1)
    
    # Fix referrals table
    if fix_referrals_table():
        print("\nReferrals table setup completed!")
        print("You can now restart your FastAPI server.")
    else:
        print("\nTable setup failed!")
        sys.exit(1)