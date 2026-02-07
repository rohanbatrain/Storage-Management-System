from pydantic import BaseModel, Field
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


class ItemBase(BaseModel):
    """Base schema for item data."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    quantity: int = Field(default=1, ge=1)
    tags: List[str] = []
    image_url: Optional[str] = Field(None, max_length=1000)


class ItemCreate(ItemBase):
    """Schema for creating a new item."""
    current_location_id: UUID
    permanent_location_id: Optional[UUID] = None
    is_temporary_placement: bool = False


class ItemUpdate(BaseModel):
    """Schema for updating an item."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    quantity: Optional[int] = Field(None, ge=1)
    tags: Optional[List[str]] = None
    image_url: Optional[str] = Field(None, max_length=1000)


class ItemMoveRequest(BaseModel):
    """Schema for moving an item to a new location."""
    to_location_id: UUID
    is_temporary: bool = False
    notes: Optional[str] = Field(None, max_length=500)


class LocationSummary(BaseModel):
    """Summary of a location for embedding in item response."""
    id: UUID
    name: str
    kind: str
    
    class Config:
        from_attributes = True


class ItemResponse(ItemBase):
    """Schema for item response."""
    id: UUID
    current_location_id: UUID
    permanent_location_id: Optional[UUID] = None
    is_temporary_placement: bool
    last_moved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    current_location: Optional[LocationSummary] = None
    permanent_location: Optional[LocationSummary] = None
    image_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class PathSegment(BaseModel):
    """Single segment in location path."""
    id: UUID
    name: str


class ItemWithPath(ItemResponse):
    """Item response including full location path."""
    location_path: List[PathSegment] = []
