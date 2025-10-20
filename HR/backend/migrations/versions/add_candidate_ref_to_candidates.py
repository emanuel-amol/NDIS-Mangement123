"""add candidate_ref to candidates

Revision ID: add_candidate_ref
Revises: e3c9fa93db05
Create Date: 2025-10-12
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_candidate_ref'
down_revision = 'add_extras'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('candidates') as batch_op:
        batch_op.add_column(sa.Column('candidate_ref', sa.Integer(), nullable=True))
        batch_op.create_index('ix_candidates_candidate_ref', ['candidate_ref'], unique=True)


def downgrade():
    with op.batch_alter_table('candidates') as batch_op:
        batch_op.drop_index('ix_candidates_candidate_ref')
        batch_op.drop_column('candidate_ref')
