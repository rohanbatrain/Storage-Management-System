from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum


class LocationKind(str, Enum):
    """Types of storage locations."""
    ROOM = "room"
    FURNITURE = "furniture"
    CONTAINER = "container"
    SURFACE = "surface"
    PORTABLE = "portable"


class LocationBase(BaseModel):
    """Base schema for location data."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    kind: LocationKind = LocationKind.CONTAINER
    parent_id: Optional[UUID] = None


class LocationCreate(LocationBase):
    """Schema for creating a new location."""
    aliases: List[str] = []


class LocationUpdate(BaseModel):
    """Schema for updating a location."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    kind: Optional[LocationKind] = None
    parent_id: Optional[UUID] = None


class AliasCreate(BaseModel):
    """Schema for adding an alias to a location."""
    alias: str = Field(..., min_length=1, max_length=100)


class LocationResponse(LocationBase):
    """Schema for location response."""
    id: UUID
    aliases: List[str] = []
    qr_code_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    item_count: int = 0
    children_count: int = 0

    class Config:
        from_attributes = True


class LocationTreeResponse(BaseModel):
    """Schema for location tree response with nested children."""
    id: UUID
    name: str
    description: Optional[str] = None
    kind: LocationKind
    aliases: List[str] = []
    qr_code_id: Optional[str] = None
    item_count: int = 0
    children: List["LocationTreeResponse"] = []
    
    class Config:
        from_attributes = True


class LocationPathResponse(BaseModel):
    """Schema for location path (breadcrumb)."""
    id: UUID
    name: str
    kind: LocationKind


class LocationDetailResponse(LocationResponse):
    """Schema for detailed location response with path."""
    path: List[LocationPathResponse] = []
    children: List[LocationResponse] = []


# Allow forward references
LocationTreeResponse.model_rebuild()
