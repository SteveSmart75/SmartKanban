"""Add is_deleted flag to BoardColumn model

Revision ID: 58f8c80e5396
Revises: 3be46b955202
Create Date: 2025-03-29 14:20:36.705180

"""
from alembic import op
import sqlalchemy as sa
# Removed unused postgresql import

# revision identifiers, used by Alembic.
revision = '58f8c80e5396'
down_revision = '3be46b955202'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands adjusted by Gemini - please review! ###
    op.add_column('board_columns', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index(op.f('ix_board_columns_is_deleted'), 'board_columns', ['is_deleted'], unique=False)
    # ### end adjusted commands ###


def downgrade() -> None:
    # ### commands adjusted by Gemini - please review! ###
    op.drop_index(op.f('ix_board_columns_is_deleted'), table_name='board_columns')
    op.drop_column('board_columns', 'is_deleted')
    # ### end adjusted commands ### 