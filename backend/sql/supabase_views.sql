-- backend/sql/supabase_views.sql
-- Create views optimized for Supabase dashboard visualization

-- 1. Referrals Overview
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
    DATE_PART('day', NOW() - created_at) AS days_since_referral
FROM referrals
ORDER BY created_at DESC;

-- 2. Referrals by Status (for charts)
CREATE OR REPLACE VIEW vw_referrals_by_status AS
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM referrals
GROUP BY status
ORDER BY count DESC;

-- 3. Referrals by State (geographic analysis)
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

-- 4. Monthly Referral Trends
CREATE OR REPLACE VIEW vw_monthly_referral_trends AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as referrals_count,
    COUNT(CASE WHEN rep_first_name IS NOT NULL THEN 1 END) as with_representative
FROM referrals
WHERE created_at >= DATE_TRUNC('year', NOW()) - INTERVAL '1 year'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- 5. Data Points Summary (when you implement dynamic data)
-- This will be useful once you add the dynamic data points feature
CREATE OR REPLACE VIEW vw_data_types_summary AS
SELECT 
    dt.id,
    dt.name,
    dt.display_name,
    dt.description,
    dt.is_active,
    COUNT(dp.id) as data_points_count,
    COUNT(CASE WHEN dp.is_active THEN 1 END) as active_data_points_count
FROM data_types dt
LEFT JOIN data_points dp ON dt.id = dp.data_type_id
GROUP BY dt.id, dt.name, dt.display_name, dt.description, dt.is_active
ORDER BY dt.display_name;

-- 6. Participant Analytics (placeholder for future)
-- CREATE OR REPLACE VIEW vw_participant_analytics AS
-- This will be created once you have participants table

-- 7. System Health Dashboard
CREATE OR REPLACE VIEW vw_system_stats AS
SELECT 
    'referrals' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_count
FROM referrals

UNION ALL

SELECT 
    'data_types' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_count
FROM data_types

UNION ALL

SELECT 
    'data_points' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_count
FROM data_points;

-- Grant permissions for Supabase (adjust role as needed)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO supabase_read_only;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_read_only;