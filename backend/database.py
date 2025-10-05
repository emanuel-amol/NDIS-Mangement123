# backend/create_versioning_tables.py
from sqlalchemy import create_engine, text
from app.core.config import get_settings
import sys

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)

SQL_SCRIPT = """
-- Create enum type for version status
DO $$ BEGIN
    CREATE TYPE versionstatus AS ENUM ('draft', 'current', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create care_plan_versions table
CREATE TABLE IF NOT EXISTS care_plan_versions (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL,
    status versionstatus NOT NULL DEFAULT 'draft',
    
    plan_name VARCHAR(255) NOT NULL,
    plan_version VARCHAR(50),
    plan_period VARCHAR(50) DEFAULT '12 months',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    summary TEXT NOT NULL,
    participant_strengths TEXT,
    participant_preferences TEXT,
    family_goals TEXT,
    short_goals JSON,
    long_goals JSON,
    supports JSON,
    monitoring JSON,
    risk_considerations TEXT,
    emergency_contacts TEXT,
    cultural_considerations TEXT,
    communication_preferences TEXT,
    
    base_version_id INTEGER REFERENCES care_plan_versions(id) ON DELETE SET NULL,
    revision_note TEXT,
    created_by VARCHAR(255),
    approved_by VARCHAR(255),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create risk_assessment_versions table
CREATE TABLE IF NOT EXISTS risk_assessment_versions (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL,
    status versionstatus NOT NULL DEFAULT 'draft',
    
    assessment_date DATE NOT NULL,
    assessor_name VARCHAR(255) NOT NULL,
    assessor_role VARCHAR(100),
    review_date DATE NOT NULL,
    context JSON,
    risks JSON,
    overall_risk_rating VARCHAR(50),
    emergency_procedures TEXT,
    monitoring_requirements TEXT,
    staff_training_needs TEXT,
    equipment_requirements TEXT,
    environmental_modifications TEXT,
    communication_plan TEXT,
    family_involvement TEXT,
    external_services TEXT,
    review_schedule VARCHAR(50) DEFAULT 'Monthly',
    notes TEXT,
    
    base_version_id INTEGER REFERENCES risk_assessment_versions(id) ON DELETE SET NULL,
    revision_note TEXT,
    created_by VARCHAR(255),
    approved_by VARCHAR(255),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_care_plan_versions_participant_id ON care_plan_versions(participant_id);
CREATE INDEX IF NOT EXISTS ix_care_plan_versions_status ON care_plan_versions(status);
CREATE INDEX IF NOT EXISTS ix_risk_assessment_versions_participant_id ON risk_assessment_versions(participant_id);
CREATE INDEX IF NOT EXISTS ix_risk_assessment_versions_status ON risk_assessment_versions(status);
"""

print("=" * 60)
print("Creating Versioning Tables")
print("=" * 60)
print(f"Database: {settings.DATABASE_URL.split('@')[1]}")
print()

try:
    with engine.connect() as conn:
        # Execute the SQL script
        for statement in SQL_SCRIPT.split(';'):
            if statement.strip():
                conn.execute(text(statement))
        conn.commit()
    
    print("✅ SUCCESS! Tables created:")
    print("  - care_plan_versions")
    print("  - risk_assessment_versions")
    print()
    
    # Verify
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('care_plan_versions', 'risk_assessment_versions')
        """))
        
        print("📊 Verified tables:")
        for row in result:
            print(f"  ✅ {row[0]}")
    
    print()
    print("🎉 Versioning system is now ready to use!")
    
except Exception as e:
    print(f"❌ ERROR: {e}")
    print()
    print("If you see 'relation already exists', the tables are already there.")
    print("If you see 'relation participants does not exist', create participants table first.")
    sys.exit(1)