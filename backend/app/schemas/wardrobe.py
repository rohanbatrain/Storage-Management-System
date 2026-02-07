from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from uuid import UUID
from datetime import datetime
from enum import Enum


# ============== Enums ==============

class ClothingStyle(str, Enum):
    """Style types for clothing categorization."""
    FORMAL = "formal"       # Office, meetings, events
    CASUAL = "casual"       # Everyday wear
    SPORTS = "sports"       # Gym, athletics
    LOUNGE = "lounge"       # Home, sleep, relaxed
    OUTERWEAR = "outerwear" # Jackets, coats
    ESSENTIALS = "essentials" # Underwear, socks, basics


class ClothingCategory(str, Enum):
    """Categories of clothing items (male-focused)."""
    # Formal
    DRESS_SHIRT = "dress_shirt"
    BLAZER = "blazer"
    DRESS_PANTS = "dress_pants"
    TIE = "tie"
    FORMAL_SHOES = "formal_shoes"
    
    # Casual
    TSHIRT = "tshirt"
    POLO = "polo"
    CASUAL_SHIRT = "casual_shirt"
    JEANS = "jeans"
    CHINOS = "chinos"
    SHORTS = "shorts"
    SNEAKERS = "sneakers"
    
    # Sports
    SPORTS_TSHIRT = "sports_tshirt"
    TRACK_PANTS = "track_pants"
    ATHLETIC_SHORTS = "athletic_shorts"
    SPORTS_SHOES = "sports_shoes"
    GYM_WEAR = "gym_wear"
    
    # Lounge
    PAJAMAS = "pajamas"
    SWEATPANTS = "sweatpants"
    SLEEPWEAR = "sleepwear"
    
    # Outerwear
    JACKET = "jacket"
    COAT = "coat"
    SWEATER = "sweater"
    HOODIE = "hoodie"
    WINDBREAKER = "windbreaker"
    
    # Essentials
    UNDERWEAR = "underwear"
    SOCKS = "socks"
    VEST = "vest"
    BELT = "belt"
    
    # Other
    ACCESSORIES = "accessories"
    OTHER = "other"


# Style to Category mapping
STYLE_CATEGORIES = {
    ClothingStyle.FORMAL: [
        ClothingCategory.DRESS_SHIRT, ClothingCategory.BLAZER,
        ClothingCategory.DRESS_PANTS, ClothingCategory.TIE,
        ClothingCategory.FORMAL_SHOES
    ],
    ClothingStyle.CASUAL: [
        ClothingCategory.TSHIRT, ClothingCategory.POLO,
        ClothingCategory.CASUAL_SHIRT, ClothingCategory.JEANS,
        ClothingCategory.CHINOS, ClothingCategory.SHORTS,
        ClothingCategory.SNEAKERS
    ],
    ClothingStyle.SPORTS: [
        ClothingCategory.SPORTS_TSHIRT, ClothingCategory.TRACK_PANTS,
        ClothingCategory.ATHLETIC_SHORTS, ClothingCategory.SPORTS_SHOES,
        ClothingCategory.GYM_WEAR
    ],
    ClothingStyle.LOUNGE: [
        ClothingCategory.PAJAMAS, ClothingCategory.SWEATPANTS,
        ClothingCategory.SLEEPWEAR, ClothingCategory.HOODIE
    ],
    ClothingStyle.OUTERWEAR: [
        ClothingCategory.JACKET, ClothingCategory.COAT,
        ClothingCategory.SWEATER, ClothingCategory.HOODIE,
        ClothingCategory.WINDBREAKER
    ],
    ClothingStyle.ESSENTIALS: [
        ClothingCategory.UNDERWEAR, ClothingCategory.SOCKS,
        ClothingCategory.VEST, ClothingCategory.BELT
    ],
}


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
    # Essentials - wash after every use
    ClothingCategory.UNDERWEAR: 1,
    ClothingCategory.SOCKS: 1,
    ClothingCategory.VEST: 1,
    # Casual tops
    ClothingCategory.TSHIRT: 1,
    ClothingCategory.POLO: 2,
    ClothingCategory.CASUAL_SHIRT: 2,
    ClothingCategory.SPORTS_TSHIRT: 1,
    # Formal
    ClothingCategory.DRESS_SHIRT: 2,
    ClothingCategory.BLAZER: 5,
    ClothingCategory.DRESS_PANTS: 3,
    ClothingCategory.TIE: 10,
    # Pants
    ClothingCategory.JEANS: 4,
    ClothingCategory.CHINOS: 3,
    ClothingCategory.SHORTS: 2,
    ClothingCategory.TRACK_PANTS: 2,
    ClothingCategory.ATHLETIC_SHORTS: 1,
    ClothingCategory.SWEATPANTS: 3,
    # Outerwear
    ClothingCategory.SWEATER: 3,
    ClothingCategory.HOODIE: 3,
    ClothingCategory.JACKET: 7,
    ClothingCategory.COAT: 10,
    ClothingCategory.WINDBREAKER: 5,
    # Lounge
    ClothingCategory.PAJAMAS: 3,
    ClothingCategory.SLEEPWEAR: 3,
    # Shoes
    ClothingCategory.FORMAL_SHOES: 15,
    ClothingCategory.SNEAKERS: 10,
    ClothingCategory.SPORTS_SHOES: 5,
    ClothingCategory.GYM_WEAR: 1,
    # Other
    ClothingCategory.BELT: 20,
    ClothingCategory.ACCESSORIES: 10,
    ClothingCategory.OTHER: 3,
}


# ============== Clothing Metadata ==============

class ClothingMetadata(BaseModel):
    """Metadata for clothing items stored in Item.metadata JSONB."""
    style: ClothingStyle = ClothingStyle.CASUAL
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
    image_url: Optional[str] = Field(None, max_length=1000)
    clothing: ClothingMetadata


class ClothingItemUpdate(BaseModel):
    """Schema for updating clothing item metadata."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    image_url: Optional[str] = Field(None, max_length=1000)
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
    image_url: Optional[str] = None
    
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
