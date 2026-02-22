"""Add item_embeddings table for Visual Lens

Revision ID: d3e4f5a6b7c8
Revises: a1b2c3d4e5f6
Create Date: 2026-02-22 17:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('item_embeddings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('item_id', sa.UUID(), nullable=False),
        sa.Column('image_url', sa.String(length=1000), nullable=False),
        sa.Column('embedding', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_item_embeddings_item_id'), 'item_embeddings', ['item_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_item_embeddings_item_id'), table_name='item_embeddings')
    op.drop_table('item_embeddings')
