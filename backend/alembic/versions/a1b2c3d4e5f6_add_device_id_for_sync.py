"""Add device_id and updated_at for sync

Revision ID: a1b2c3d4e5f6
Revises: c717eb6ba5a5
Create Date: 2026-02-22 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'c717eb6ba5a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add device_id to all tables
    op.add_column('locations', sa.Column('device_id', sa.String(64), nullable=True))
    op.create_index(op.f('ix_locations_device_id'), 'locations', ['device_id'], unique=False)

    op.add_column('items', sa.Column('device_id', sa.String(64), nullable=True))
    op.create_index(op.f('ix_items_device_id'), 'items', ['device_id'], unique=False)

    op.add_column('movement_history', sa.Column('device_id', sa.String(64), nullable=True))
    op.create_index(op.f('ix_movement_history_device_id'), 'movement_history', ['device_id'], unique=False)
    op.add_column('movement_history', sa.Column('updated_at', sa.DateTime(), nullable=True))

    op.add_column('outfits', sa.Column('device_id', sa.String(64), nullable=True))
    op.create_index(op.f('ix_outfits_device_id'), 'outfits', ['device_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_outfits_device_id'), table_name='outfits')
    op.drop_column('outfits', 'device_id')

    op.drop_column('movement_history', 'updated_at')
    op.drop_index(op.f('ix_movement_history_device_id'), table_name='movement_history')
    op.drop_column('movement_history', 'device_id')

    op.drop_index(op.f('ix_items_device_id'), table_name='items')
    op.drop_column('items', 'device_id')

    op.drop_index(op.f('ix_locations_device_id'), table_name='locations')
    op.drop_column('locations', 'device_id')
