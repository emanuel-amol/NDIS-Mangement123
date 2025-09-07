#!/usr/bin/env python3
# backend/create_supabase_views.py

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

def create_supabase_views():
    """Create database views optimized for Supabase dashboard visualization"""
    
    views_sql = """
    -- Referrals Overview
    CREATE OR REPLACE VIEW vw_referrals_dashboard AS
    SELECT 
        id,
        first_name || ' ' || last_name AS full_name,
        email_address,
        phone_number,
        city,
        state,
        postcode,
        status,
        CASE 
            WHEN rep_first_name IS NOT NULL THEN rep_first_name || ' ' || COALESCE(rep_last_name, '')
            ELSE NULL 
        END AS representative_name,
        rep_relationship,
        created_at,
        updated_at,
        EXTRACT(DAY FROM NOW() - created_at) AS days_since_referral
    FROM referrals
    ORDER BY created_at DESC;

    -- Referrals by Status
    CREATE OR REPLACE VIEW vw_referrals_by_status AS
    SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
    FROM referrals
    GROUP BY status
    ORDER BY count DESC;

    -- Referrals by State
    CREATE OR REPLACE VIEW vw_referrals_by_state AS
    SELECT 
        state,
        COUNT(*) as referral_count,
        COUNT(CASE WHEN status = 'NEW' THEN 1 END) as new_referrals,
        COUNT(CASE WHEN status = 'PROSPECTIVE' THEN 1 END) as prospective_referrals,
        COUNT(CASE WHEN status = 'ONBOARDED' THEN 1 END) as onboarded_referrals
    FROM referrals
    GROUP BY state
    ORDER BY referral_count DESC;

    -- Monthly Trends
    CREATE OR REPLACE VIEW vw_monthly_referral_trends AS
    SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as referrals_count,
        COUNT(CASE WHEN rep_first_name IS NOT NULL THEN 1 END) as with_representative
    FROM referrals
    WHERE created_at >= DATE_TRUNC('year', NOW()) - INTERVAL '1 year'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month;

    -- System Stats
    CREATE OR REPLACE VIEW vw_system_stats AS
    SELECT 
        'referrals' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_count
    FROM referrals;
    """
    
    try:
        with engine.connect() as conn:
            # Execute each view creation
            conn.execute(text(views_sql))
            conn.commit()
            print("[SUCCESS] Supabase dashboard views created successfully!")
            
            # List created views
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.views 
                WHERE table_schema = 'public' 
                AND table_name LIKE 'vw_%'
                ORDER BY table_name
            """))
            
            print("[INFO] Created views:")
            for row in result:
                print(f"  - {row[0]}")
                
    except Exception as e:
        print(f"[ERROR] Failed to create views: {e}")
        return False
    
    return True

if __name__ == "__main__":
    create_supabase_views()