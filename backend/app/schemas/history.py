from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class ActionType(str, Enum):
    """Types of movement actions."""
    PLACED = "placed"
    MOVED = "moved"
    RETURNED = "returned"


class LocationSummary(BaseModel):
    """Summary of a location for history."""
    id: UUID
    name: str
    
    class Config:
        from_attributes = True


class MovementHistoryResponse(BaseModel):
    """Schema for movement history response."""
    id: UUID
    item_id: UUID
    from_location: Optional[LocationSummary] = None
    to_location: LocationSummary
    action: ActionType
    moved_at: datetime
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True
