# Create this file: backend/alembic/versions/add_care_plan_finalisation.py

"""Add finalisation fields to care plans

Revision ID: add_finalisation_001
Revises: [replace_with_latest_revision]
Create Date: 2025-09-21 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_finalisation_001'
down_revision = '[replace_with_latest_revision]'  # Replace with actual latest revision
branch_labels = None
depends_on = None

def upgrade():
    """Add finalisation columns to care_plans table"""
    
    # Add is_finalised column with default False
    op.add_column('care_plans', 
        sa.Column('is_finalised', sa.Boolean(), nullable=False, server_default='false')
    )
    
    # Add finalised_at timestamp column  
    op.add_column('care_plans',
        sa.Column('finalised_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Add finalised_by column
    op.add_column('care_plans',
        sa.Column('finalised_by', sa.String(255), nullable=True)
    )
    
    # Update existing care plans to be finalised if they have substantial content
    # This fixes existing data to be finalised based on content presence
    op.execute("""
        UPDATE care_plans 
        SET is_finalised = true, 
            finalised_at = COALESCE(updated_at, created_at, NOW()),
            finalised_by = 'Migration Script'
        WHERE summary IS NOT NULL 
        AND summary != ''
        AND supports IS NOT NULL
        AND supports != '[]'
        AND supports != 'null'
    """)

def downgrade():
    """Remove finalisation columns (rollback)"""
    op.drop_column('care_plans', 'finalised_by')
    op.drop_column('care_plans', 'finalised_at') 
    op.drop_column('care_plans', 'is_finalised')


# =========================================================================
# MANUAL SQL SCRIPT (Alternative if Alembic not available)
# =========================================================================

"""
If you can't use Alembic, run this SQL directly on your database:

-- Add finalisation columns to care_plans table
ALTER TABLE care_plans 
ADD COLUMN is_finalised BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE care_plans 
ADD COLUMN finalised_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE care_plans 
ADD COLUMN finalised_by VARCHAR(255);

-- Update existing care plans with content to be finalised
UPDATE care_plans 
SET is_finalised = true, 
    finalised_at = COALESCE(updated_at, created_at, NOW()),
    finalised_by = 'Migration Script'
WHERE summary IS NOT NULL 
AND summary != ''
AND supports IS NOT NULL
AND supports != '[]'
AND supports != 'null';

-- Verify the changes
SELECT 
    id, 
    plan_name, 
    is_finalised, 
    finalised_at, 
    finalised_by,
    (CASE WHEN supports IS NOT NULL AND supports != '[]' THEN 'Has Supports' ELSE 'No Supports' END) as supports_status
FROM care_plans 
ORDER BY created_at DESC;
"""