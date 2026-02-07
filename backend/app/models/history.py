import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ActionType(str, enum.Enum):
    """Types of movement actions."""
    PLACED = "placed"      # Initial placement in a location
    MOVED = "moved"        # Moved from one location to another
    RETURNED = "returned"  # Returned to permanent location


class MovementHistory(Base):
    """
    Tracks all movements of items between locations.
    
    Each record captures:
    - Which item was moved
    - From which location (null for initial placement)
    - To which location
    - What type of action it was
    - When it happened
    """
    __tablename__ = "movement_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    from_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True
    )
    to_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=False
    )
    action = Column(SQLEnum(ActionType), nullable=False, default=ActionType.PLACED)
    moved_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    notes = Column(String(500), nullable=True)
    
    # Relationships
    item = relationship("Item", back_populates="movement_history")
    
    from_location = relationship(
        "Location",
        foreign_keys=[from_location_id],
        lazy="selectin"
    )
    
    to_location = relationship(
        "Location",
        foreign_keys=[to_location_id],
        lazy="selectin"
    )
    
    def __repr__(self):
        return f"<MovementHistory(action='{self.action.value}', moved_at='{self.moved_at}')>"
