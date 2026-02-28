from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.compatibility import GUID

class WearHistory(Base):
    """
    Tracks exactly when an item was worn/used for cost-per-wear and declutter analytics.
    """
    __tablename__ = "wear_history"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    item_id = Column(
        GUID(),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Optional: if it was worn as part of a specific outfit
    outfit_id = Column(
        GUID(),
        ForeignKey("outfits.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    
    date_worn = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    item = relationship("Item", back_populates="wear_history", lazy="selectin")
    outfit = relationship("Outfit", back_populates="wear_history", lazy="selectin")

    def __repr__(self):
        return f"<WearHistory(item_id='{self.item_id}', date_worn='{self.date_worn}')>"
