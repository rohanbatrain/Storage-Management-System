import json
from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.compatibility import GUID, JSONCompatible


class ItemEmbedding(Base):
    """
    Stores feature vector embeddings for an item's reference image(s).
    Used for the Visual Lens feature to match incoming photos via cosine similarity.
    """
    __tablename__ = "item_embeddings"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    item_id = Column(
        GUID(), 
        ForeignKey("items.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    image_url = Column(String(1000), nullable=False)
    # The 1280-d feature vector extracted from the image
    embedding = Column(JSONCompatible(), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship back to Item
    item = relationship("Item", back_populates="embeddings")
    
    def __repr__(self):
        return f"<ItemEmbedding(item_id='{self.item_id}', image_url='{self.image_url}')>"
