"""add role column to users

Revision ID: add_role_to_users
Revises: e3c9fa93db05
Create Date: 2025-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_role_to_users'
down_revision: Union[str, Sequence[str], None] = 'e3c9fa93db05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('role', sa.String(), nullable=False, server_default='user'))
    # Drop server_default after backfilling default
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('role', server_default=None)


def downgrade() -> None:
    op.drop_column('users', 'role')
