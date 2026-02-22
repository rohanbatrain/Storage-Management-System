import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.compatibility import GUID, JSONCompatible
import enum
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.item_embedding import ItemEmbedding


class ItemType(str, enum.Enum):
    """Types of items for domain-specific extensions."""
    GENERIC = "generic"     # Standard storage item
    CLOTHING = "clothing"   # Wardrobe module clothing item


class Item(Base):
    """
    Represents a physical item stored in a location.
    
    Items can have:
    - Current location: Where the item is right now
    - Permanent location: The item's "home" location
    - Temporary placement flag: Indicates if current placement is temporary
    - Item type: For domain extensions (generic, clothing, etc.)
    - Metadata: JSONB for domain-specific data
    
    Tags are stored as JSONB for flexible categorization.
    """
    __tablename__ = "items"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    current_location_id = Column(
        GUID(),
        ForeignKey("locations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    permanent_location_id = Column(
        GUID(),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    quantity = Column(Integer, default=1, nullable=False)
    tags = Column(JSONCompatible(), default=[])
    is_temporary_placement = Column(Boolean, default=False, nullable=False)
    last_moved_at = Column(DateTime, nullable=True)
    qr_code_id = Column(String(100), unique=True, nullable=True, index=True)  # For QR scanning
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    device_id = Column(String(64), nullable=True, index=True)  # Sync: which device last modified this
    
    # Wardrobe Module Extensions
    item_type = Column(SQLEnum(ItemType), default=ItemType.GENERIC, nullable=False, index=True)
    item_data = Column(JSONCompatible(), default={})  # Domain-specific data (clothing: category, wear_count, etc.)
    image_url = Column(String(1000), nullable=True)  # External image URL
    
    # Loan Tracking
    is_lent = Column(Boolean, default=False, nullable=False, index=True)
    lent_to = Column(String(255), nullable=True)  # Name of borrower
    lent_at = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    lent_notes = Column(String(500), nullable=True)

    # Lost Items Tracking
    is_lost = Column(Boolean, default=False, nullable=False, index=True)
    lost_at = Column(DateTime, nullable=True)
    lost_notes = Column(String(500), nullable=True)
    
    # Relationships
    current_location = relationship(
        "Location",
        back_populates="items",
        foreign_keys=[current_location_id],
        lazy="selectin"
    )
    
    permanent_location = relationship(
        "Location",
        back_populates="permanent_items",
        foreign_keys=[permanent_location_id],
        lazy="selectin"
    )
    
    # Movement history
    movement_history = relationship(
        "MovementHistory",
        back_populates="item",
        order_by="desc(MovementHistory.moved_at)",
        lazy="selectin"
    )
    
    embeddings = relationship(
        "ItemEmbedding",
        back_populates="item",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    def __repr__(self):
        return f"<Item(name='{self.name}', type='{self.item_type.value}', quantity={self.quantity})>"
