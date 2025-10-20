"""merge heads: drop_candidate_ref + add_role_to_users

Revision ID: mrg_dropref_role_1013
Revises: drop_candidate_ref, add_role_to_users
Create Date: 2025-10-13

"""
from typing import Sequence, Union

# No operations are needed; this revision only merges branches.

# revision identifiers, used by Alembic.
revision: str = 'mrg_dropref_role_1013'
down_revision: Union[str, Sequence[str], None] = ('drop_candidate_ref', 'add_role_to_users')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This is a no-op merge migration.
    pass


def downgrade() -> None:
    # Downgrading a merge revision would split branches; leave as no-op.
    pass
