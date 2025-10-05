"""add care plan and risk assessment versioning

Revision ID: add_versioning_001
Revises: <PUT_YOUR_PREVIOUS_REVISION_ID_HERE>
Create Date: 2025-01-06 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'add_versioning_001'
down_revision = None  # REPLACE WITH YOUR LATEST REVISION ID
branch_labels = None
depends_on = None

def upgrade():
    # Create enum
    op.execute("CREATE TYPE versionstatus AS ENUM ('draft', 'current', 'archived')")
    
    # Create care_plan_versions table
    op.create_table(
        'care_plan_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('participant_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.String(50), nullable=False),
        sa.Column('status', postgresql.ENUM('draft', 'current', 'archived', name='versionstatus'), nullable=False),
        sa.Column('plan_name', sa.String(255), nullable=False),
        sa.Column('plan_version', sa.String(50)),
        sa.Column('plan_period', sa.String(50)),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('participant_strengths', sa.Text()),
        sa.Column('participant_preferences', sa.Text()),
        sa.Column('family_goals', sa.Text()),
        sa.Column('short_goals', postgresql.JSON()),
        sa.Column('long_goals', postgresql.JSON()),
        sa.Column('supports', postgresql.JSON()),
        sa.Column('monitoring', postgresql.JSON()),
        sa.Column('risk_considerations', sa.Text()),
        sa.Column('emergency_contacts', sa.Text()),
        sa.Column('cultural_considerations', sa.Text()),
        sa.Column('communication_preferences', sa.Text()),
        sa.Column('base_version_id', sa.Integer()),
        sa.Column('revision_note', sa.Text()),
        sa.Column('created_by', sa.String(255)),
        sa.Column('approved_by', sa.String(255)),
        sa.Column('published_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['base_version_id'], ['care_plan_versions.id']),
        sa.ForeignKeyConstraint(['participant_id'], ['participants.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_care_plan_versions_participant_id', 'care_plan_versions', ['participant_id'])
    op.create_index('ix_care_plan_versions_status', 'care_plan_versions', ['status'])

    # Create risk_assessment_versions table
    op.create_table(
        'risk_assessment_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('participant_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.String(50), nullable=False),
        sa.Column('status', postgresql.ENUM('draft', 'current', 'archived', name='versionstatus'), nullable=False),
        sa.Column('assessment_date', sa.Date(), nullable=False),
        sa.Column('assessor_name', sa.String(255), nullable=False),
        sa.Column('assessor_role', sa.String(100)),
        sa.Column('review_date', sa.Date(), nullable=False),
        sa.Column('context', postgresql.JSON()),
        sa.Column('risks', postgresql.JSON()),
        sa.Column('overall_risk_rating', sa.String(50)),
        sa.Column('emergency_procedures', sa.Text()),
        sa.Column('monitoring_requirements', sa.Text()),
        sa.Column('staff_training_needs', sa.Text()),
        sa.Column('equipment_requirements', sa.Text()),
        sa.Column('environmental_modifications', sa.Text()),
        sa.Column('communication_plan', sa.Text()),
        sa.Column('family_involvement', sa.Text()),
        sa.Column('external_services', sa.Text()),
        sa.Column('review_schedule', sa.String(50)),
        sa.Column('notes', sa.Text()),
        sa.Column('base_version_id', sa.Integer()),
        sa.Column('revision_note', sa.Text()),
        sa.Column('created_by', sa.String(255)),
        sa.Column('approved_by', sa.String(255)),
        sa.Column('published_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['base_version_id'], ['risk_assessment_versions.id']),
        sa.ForeignKeyConstraint(['participant_id'], ['participants.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_risk_assessment_versions_participant_id', 'risk_assessment_versions', ['participant_id'])
    op.create_index('ix_risk_assessment_versions_status', 'risk_assessment_versions', ['status'])

def downgrade():
    op.drop_index('ix_risk_assessment_versions_status', table_name='risk_assessment_versions')
    op.drop_index('ix_risk_assessment_versions_participant_id', table_name='risk_assessment_versions')
    op.drop_table('risk_assessment_versions')
    
    op.drop_index('ix_care_plan_versions_status', table_name='care_plan_versions')
    op.drop_index('ix_care_plan_versions_participant_id', table_name='care_plan_versions')
    op.drop_table('care_plan_versions')
    
    op.execute('DROP TYPE versionstatus')