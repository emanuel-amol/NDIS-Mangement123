#!/usr/bin/env python3
"""
Create provider tables and update referrals table
Run this once to set up the provider functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

def create_provider_tables():
    """Create provider tables and update referrals table"""
    
    print("🔧 Creating provider tables and updating database schema...")
    
    try:
        with engine.connect() as conn:
            # Check if assigned_provider_id column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'referrals' AND column_name = 'assigned_provider_id'
            """))
            
            if not result.fetchone():
                print("Adding provider columns to referrals table...")
                
                # Add provider assignment columns
                conn.execute(text("""
                    ALTER TABLE referrals 
                    ADD COLUMN assigned_provider_id INTEGER REFERENCES users(id),
                    ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE,
                    ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'
                """))
                
                conn.commit()
                print("✅ Added provider columns to referrals table")
            else:
                print("✅ Provider columns already exist")
            
            # Assign some test referrals to providers
            print("🔄 Assigning test referrals to providers...")
            
            # Get provider IDs
            providers = conn.execute(text("""
                SELECT id, service_type FROM users 
                WHERE role = 'provider' AND is_active = true
                ORDER BY id
            """)).fetchall()
            
            if providers:
                # Get unassigned referrals
                referrals = conn.execute(text("""
                    SELECT id, referred_for FROM referrals 
                    WHERE assigned_provider_id IS NULL 
                    ORDER BY id
                    LIMIT 20
                """)).fetchall()
                
                if referrals:
                    for i, referral in enumerate(referrals):
                        # Round-robin assignment to providers
                        provider = providers[i % len(providers)]
                        
                        conn.execute(text("""
                            UPDATE referrals 
                            SET assigned_provider_id = :provider_id,
                                status = 'assigned',
                                priority = CASE 
                                    WHEN :index % 3 = 0 THEN 'high'
                                    WHEN :index % 3 = 1 THEN 'medium' 
                                    ELSE 'low'
                                END
                            WHERE id = :referral_id
                        """), {
                            "provider_id": provider.id, 
                            "referral_id": referral.id,
                            "index": i
                        })
                    
                    conn.commit()
                    print(f"✅ Assigned {len(referrals)} referrals to {len(providers)} providers")
                else:
                    print("⚠️ No unassigned referrals found")
            else:
                print("⚠️ No active providers found")
            
            # Show final summary
            result = conn.execute(text("""
                SELECT 
                    COUNT(*) as total_referrals,
                    COUNT(assigned_provider_id) as assigned_referrals,
                    COUNT(*) - COUNT(assigned_provider_id) as unassigned_referrals
                FROM referrals
            """)).fetchone()
            
            provider_count = conn.execute(text("""
                SELECT COUNT(*) as provider_count
                FROM users
                WHERE role = 'provider' AND is_active = true
            """)).fetchone()
            
            print(f"\n📊 Database Summary:")
            print(f"   Active providers: {provider_count.provider_count}")
            print(f"   Total referrals: {result.total_referrals}")
            print(f"   Assigned to providers: {result.assigned_referrals}")
            print(f"   Unassigned: {result.unassigned_referrals}")
            
            return True
            
    except OperationalError as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("🗄️ NDIS Provider Database Setup")
    print("=" * 40)
    
    success = create_provider_tables()
    
    if success:
        print("\n🎉 Provider database setup completed successfully!")
        print("\nNow restart your FastAPI server and test:")
        print("1. uvicorn app.main:app --reload")
        print("2. Login as provider at http://localhost:3000/provider")
        print("3. Check API docs: http://localhost:8000/docs")
    else:
        print("\n❌ Database setup failed!")
        sys.exit(1)