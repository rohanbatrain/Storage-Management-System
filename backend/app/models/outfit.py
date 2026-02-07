import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from app.database import Base


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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    tags = Column(JSONB, default=[])  # ["formal", "casual", "summer", "winter"]
    item_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])  # References to clothing items
    rating = Column(Integer, nullable=True)  # 1-5 stars
    wear_count = Column(Integer, default=0, nullable=False)
    last_worn_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Outfit(name='{self.name}', items={len(self.item_ids or [])})>"
