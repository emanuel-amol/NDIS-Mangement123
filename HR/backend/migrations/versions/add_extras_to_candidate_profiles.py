"""add extras column to candidate_profiles

Revision ID: add_extras
Revises: e3c9fa93db05
Create Date: 2025-10-07
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_extras'
down_revision = 'e3c9fa93db05'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('candidate_profiles', sa.Column('extras', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('candidate_profiles', 'extras')
