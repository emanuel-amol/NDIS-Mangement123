# Create this file: backend/alembic/versions/xxx_add_document_version_control.py
"""Add document version control tables

Revision ID: version_control_001
Revises: [your_previous_revision]
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql, mysql

# revision identifiers
revision = 'version_control_001'
down_revision = None  # Replace with your latest migration
branch_labels = None
depends_on = None

def upgrade():
    """Create document version control tables"""
    
    # Create document_versions table
    op.create_table('document_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('changes_summary', sa.Text(), nullable=True),
        sa.Column('change_metadata', sa.JSON(), nullable=True),
        sa.Column('file_hash', sa.String(length=64), nullable=True),
        sa.Column('is_metadata_only', sa.Boolean(), nullable=True, default=False),
        sa.Column('replaced_by_version_id', sa.Integer(), nullable=True),
        sa.Column('replaced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('created_by', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['replaced_by_version_id'], ['document_versions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index('ix_document_versions_document_version', 'document_versions', ['document_id', 'version_number'])
    op.create_index('ix_document_versions_replaced_by', 'document_versions', ['replaced_by_version_id'])
    op.create_index('ix_document_versions_document_id', 'document_versions', ['document_id'])
    
    # Create document_workflows table (enhanced version)
    op.create_table('document_workflows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('participant_id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('workflow_type', sa.Enum('APPROVAL', 'REVIEW', 'EXPIRY', 'COMPLIANCE', name='workflowtype'), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'EXPIRED', name='workflowstatus'), nullable=True),
        sa.Column('assigned_to', sa.String(length=255), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('workflow_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['participant_id'], ['participants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create document_approvals table (enhanced version)
    op.create_table('document_approvals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('version_id', sa.Integer(), nullable=True),
        sa.Column('approver_name', sa.String(length=255), nullable=False),
        sa.Column('approver_role', sa.String(length=100), nullable=False),
        sa.Column('approver_id', sa.String(length=100), nullable=True),
        sa.Column('approval_status', sa.String(length=50), nullable=False),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('approval_metadata', sa.JSON(), nullable=True),
        sa.Column('approval_level', sa.Integer(), nullable=True),
        sa.Column('requires_additional_approval', sa.Boolean(), nullable=True),
        sa.Column('workflow_id', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['version_id'], ['document_versions.id'], ),
        sa.ForeignKeyConstraint(['workflow_id'], ['document_workflows.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create document_change_logs table
    op.create_table('document_change_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('version_id', sa.Integer(), nullable=True),
        sa.Column('change_type', sa.String(length=50), nullable=False),
        sa.Column('field_changed', sa.String(length=100), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('change_reason', sa.Text(), nullable=True),
        sa.Column('user_id', sa.String(length=100), nullable=False),
        sa.Column('user_role', sa.String(length=50), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('change_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['version_id'], ['document_versions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for change logs
    op.create_index('ix_change_logs_document_time', 'document_change_logs', ['document_id', 'created_at'])
    op.create_index('ix_change_logs_user', 'document_change_logs', ['user_id', 'created_at'])
    
    # Add version field to documents table if it doesn't exist
    try:
        op.add_column('documents', sa.Column('version', sa.Integer(), nullable=True, default=1))
    except Exception as e:
        print(f"Column 'version' may already exist: {e}")
    
    # Add is_current_version field to documents table if it doesn't exist
    try:
        op.add_column('documents', sa.Column('is_current_version', sa.Boolean(), nullable=True, default=True))
    except Exception as e:
        print(f"Column 'is_current_version' may already exist: {e}")

def downgrade():
    """Drop document version control tables"""
    
    # Drop indexes first
    op.drop_index('ix_change_logs_user', table_name='document_change_logs')
    op.drop_index('ix_change_logs_document_time', table_name='document_change_logs')
    op.drop_index('ix_document_versions_document_id', table_name='document_versions')
    op.drop_index('ix_document_versions_replaced_by', table_name='document_versions')
    op.drop_index('ix_document_versions_document_version', table_name='document_versions')
    
    # Drop tables
    op.drop_table('document_change_logs')
    op.drop_table('document_approvals')
    op.drop_table('document_workflows')
    op.drop_table('document_versions')
    
    # Drop enum types (if using PostgreSQL)
    try:
        op.execute('DROP TYPE workflowtype')
        op.execute('DROP TYPE workflowstatus')
    except Exception:
        pass  # Ignore if not using PostgreSQL or if types don't exist
    
    # Remove columns from documents table
    try:
        op.drop_column('documents', 'is_current_version')
        op.drop_column('documents', 'version')
    except Exception as e:
        print(f"Error dropping columns: {e}")

# Alternative migration script for manual execution
def create_tables_manually():
    """
    If Alembic isn't set up, run this in a Python script to create tables manually:
    
    from sqlalchemy import create_engine
    from app.core.database import Base
    from app.models.document_workflow import *  # Import all models
    
    engine = create_engine('your_database_url_here')
    Base.metadata.create_all(bind=engine, tables=[
        DocumentVersion.__table__,
        DocumentWorkflow.__table__,
        DocumentApproval.__table__,
        DocumentChangeLog.__table__
    ])
    """
    pass