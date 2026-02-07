import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class LocationKind(str, enum.Enum):
    """Types of storage locations."""
    ROOM = "room"               # Bedroom, Bathroom, Kitchen, Living Room
    FURNITURE = "furniture"     # Almirah, Bed, Table, Cabinet
    CONTAINER = "container"     # Box, Drawer, Bin, Basket
    SURFACE = "surface"         # Desk top, Shelf, Counter
    PORTABLE = "portable"       # Bag, Suitcase, Backpack
    LAUNDRY_WORN = "laundry_worn"    # Basket for worn but rewearable clothes
    LAUNDRY_DIRTY = "laundry_dirty"  # Basket for dirty clothes needing wash


class Location(Base):
    """
    Represents a physical storage location.
    
    Locations can be:
    - Room: Physical room (bedroom, bathroom, kitchen)
    - Furniture: Large furniture pieces (almirah, bed, table)
    - Container: Closed storage (box, drawer, bin)
    - Surface: Open placement area (desk top, shelf)
    - Portable: Movable storage (bag, suitcase)
    
    Locations support unlimited nesting depth through parent_id.
    """
    __tablename__ = "locations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), nullable=True, index=True)
    kind = Column(SQLEnum(LocationKind), nullable=False, default=LocationKind.CONTAINER)
    aliases = Column(ARRAY(String), default=[])
    qr_code_id = Column(String(100), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Self-referential relationship for nested locations
    parent = relationship(
        "Location",
        remote_side=[id],
        backref="children",
        lazy="selectin"
    )
    
    # Items currently in this location (database CASCADE handles deletion)
    items = relationship(
        "Item",
        back_populates="current_location",
        foreign_keys="Item.current_location_id",
        lazy="selectin",
        passive_deletes=True
    )
    
    # Items that have this as their permanent home
    permanent_items = relationship(
        "Item",
        back_populates="permanent_location",
        foreign_keys="Item.permanent_location_id",
        lazy="selectin"
    )
    
    def __repr__(self):
        return f"<Location(name='{self.name}', kind='{self.kind.value}')>"
