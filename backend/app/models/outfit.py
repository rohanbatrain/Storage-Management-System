import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from app.database import Base
from app.models.compatibility import GUID, JSONCompatible, ArrayCompatible


class Outfit(Base):
    """
    Represents a saved outfit combination (Wardrobe Module).
    
    Outfits are collections of clothing items that can be worn together.
    They support:
    - Naming and description
    - Tags for categorization (formal, casual, summer, etc.)
    - Rating for favorites
    - Wear tracking
    """
    __tablename__ = "outfits"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    tags = Column(JSONCompatible(), default=[])  # ["formal", "casual", "summer", "winter"]
    item_ids = Column(ArrayCompatible(), default=[])  # References to clothing items (stored as list of UUID strings)
    rating = Column(Integer, nullable=True)  # 1-5 stars
    wear_count = Column(Integer, default=0, nullable=False)
    last_worn_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    device_id = Column(String(64), nullable=True, index=True)  # Sync: which device last modified this
    
    def __repr__(self):
        return f"<Outfit(name='{self.name}', items={len(self.item_ids or [])})>"
