from datetime import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.compatibility import GUID, JSONCompatible

class Trip(Base):
    """
    Represents a packing list or temporary trip checkout.
    Any items assigned to this trip are temporarily "removed" from their 
    permanent locations until the trip is unpacked.
    """
    __tablename__ = "trips"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(1000), nullable=True)
    
    # Active trips are currently ongoing. Unpacking sets active=False.
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    destination = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Optional flexible metadata for weather, flight codes, etc.
    trip_data = Column(JSONCompatible(), default={})
    
    # Items packed for this trip
    items = relationship(
        "Item",
        back_populates="current_trip",
        lazy="selectin"
    )

    def __repr__(self):
        return f"<Trip(name='{self.name}', active={self.is_active})>"
