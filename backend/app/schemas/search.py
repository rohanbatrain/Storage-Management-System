from pydantic import BaseModel
from typing import List, Optional, Literal
from uuid import UUID


class SearchResult(BaseModel):
    """Single search result."""
    id: UUID
    name: str
    type: Literal["item", "location"]
    description: Optional[str] = None
    location_path: Optional[str] = None  # e.g., "Home → Bedroom → Wardrobe"
    
    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    """Response for search queries."""
    query: str
    total_count: int
    items: List[SearchResult] = []
    locations: List[SearchResult] = []
