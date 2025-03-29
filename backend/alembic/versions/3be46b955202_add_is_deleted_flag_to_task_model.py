"""Add is_deleted flag to Task model

Revision ID: 3be46b955202
Revises: 1740cc1023c0
Create Date: 2025-03-29 14:12:09.233878

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3be46b955202'
down_revision = '1740cc1023c0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands adjusted by Gemini - please review! ###
    op.add_column('tasks', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index(op.f('ix_tasks_is_deleted'), 'tasks', ['is_deleted'], unique=False)
    # ### end adjusted commands ###


def downgrade() -> None:
    # ### commands adjusted by Gemini - please review! ###
    op.drop_index(op.f('ix_tasks_is_deleted'), table_name='tasks')
    op.drop_column('tasks', 'is_deleted')
    # ### end adjusted commands ### 