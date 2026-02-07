from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from uuid import UUID
from datetime import datetime
from enum import Enum


# ============== Enums ==============

class ClothingCategory(str, Enum):
    """Categories of clothing items."""
    SHIRT = "shirt"
    TSHIRT = "tshirt"
    PANTS = "pants"
    JEANS = "jeans"
    SHORTS = "shorts"
    DRESS = "dress"
    SKIRT = "skirt"
    JACKET = "jacket"
    SWEATER = "sweater"
    HOODIE = "hoodie"
    COAT = "coat"
    UNDERWEAR = "underwear"
    SOCKS = "socks"
    SHOES = "shoes"
    ACCESSORIES = "accessories"
    OTHER = "other"


class CleanlinessStatus(str, Enum):
    """Cleanliness states for clothing items."""
    CLEAN = "clean"       # Fresh, ready to wear
    WORN = "worn"         # Worn but can be reworn
    DIRTY = "dirty"       # Needs washing
    WASHING = "washing"   # Currently in laundry


class Season(str, Enum):
    """Seasonal categorization."""
    SUMMER = "summer"
    WINTER = "winter"
    SPRING = "spring"
    FALL = "fall"
    ALL = "all"


# ============== Default Wear Thresholds ==============

DEFAULT_WEAR_THRESHOLDS = {
    ClothingCategory.UNDERWEAR: 1,
    ClothingCategory.SOCKS: 1,
    ClothingCategory.TSHIRT: 1,
    ClothingCategory.SHIRT: 2,
    ClothingCategory.PANTS: 3,
    ClothingCategory.JEANS: 4,
    ClothingCategory.SHORTS: 2,
    ClothingCategory.DRESS: 2,
    ClothingCategory.SKIRT: 2,
    ClothingCategory.SWEATER: 3,
    ClothingCategory.HOODIE: 3,
    ClothingCategory.JACKET: 5,
    ClothingCategory.COAT: 7,
    ClothingCategory.SHOES: 10,
    ClothingCategory.ACCESSORIES: 10,
    ClothingCategory.OTHER: 3,
}


# ============== Clothing Metadata ==============

class ClothingMetadata(BaseModel):
    """Metadata for clothing items stored in Item.metadata JSONB."""
    category: ClothingCategory
    wear_count_since_wash: int = 0
    max_wears_before_wash: int = 3  # Can be customized per item
    last_worn_at: Optional[datetime] = None
    cleanliness: CleanlinessStatus = CleanlinessStatus.CLEAN
    color: Optional[str] = None
    brand: Optional[str] = None
    season: Season = Season.ALL
    
    class Config:
        use_enum_values = True


# ============== Clothing Item Schemas ==============

class ClothingItemCreate(BaseModel):
    """Schema for creating a clothing item."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    current_location_id: UUID
    permanent_location_id: Optional[UUID] = None
    tags: List[str] = []
    clothing: ClothingMetadata


class ClothingItemUpdate(BaseModel):
    """Schema for updating clothing item metadata."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    max_wears_before_wash: Optional[int] = Field(None, ge=1, le=20)
    color: Optional[str] = None
    brand: Optional[str] = None
    season: Optional[Season] = None


class ClothingItemResponse(BaseModel):
    """Response schema for clothing items."""
    id: UUID
    name: str
    description: Optional[str] = None
    current_location_id: UUID
    permanent_location_id: Optional[UUID] = None
    tags: List[str] = []
    is_temporary_placement: bool
    last_moved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Clothing-specific fields from metadata
    category: ClothingCategory
    wear_count_since_wash: int
    max_wears_before_wash: int
    last_worn_at: Optional[datetime] = None
    cleanliness: CleanlinessStatus
    color: Optional[str] = None
    brand: Optional[str] = None
    season: Season
    
    # Computed
    can_rewear: bool = True  # Computed based on wear count
    
    class Config:
        from_attributes = True


# ============== Outfit Schemas ==============

class OutfitCreate(BaseModel):
    """Schema for creating an outfit."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    item_ids: List[UUID] = Field(..., min_length=1)
    tags: List[str] = []
    rating: Optional[int] = Field(None, ge=1, le=5)


class OutfitUpdate(BaseModel):
    """Schema for updating an outfit."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    item_ids: Optional[List[UUID]] = None
    tags: Optional[List[str]] = None
    rating: Optional[int] = Field(None, ge=1, le=5)


class OutfitResponse(BaseModel):
    """Response schema for outfits."""
    id: UUID
    name: str
    description: Optional[str] = None
    item_ids: List[UUID] = []
    tags: List[str] = []
    rating: Optional[int] = None
    wear_count: int
    last_worn_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class OutfitWithItems(OutfitResponse):
    """Outfit response with full item details."""
    items: List[ClothingItemResponse] = []


# ============== Wardrobe Stats ==============

class WardrobeStats(BaseModel):
    """Analytics for wardrobe module."""
    total_clothing_items: int
    clean_items: int
    worn_items: int
    dirty_items: int
    in_laundry: int
    total_outfits: int
    most_worn_items: List[ClothingItemResponse] = []
    least_worn_items: List[ClothingItemResponse] = []
    items_by_category: dict = {}
