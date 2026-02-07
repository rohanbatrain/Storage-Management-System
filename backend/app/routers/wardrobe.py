from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models.item import Item, ItemType
from app.models.location import Location, LocationKind
from app.models.history import MovementHistory, ActionType
from app.models.outfit import Outfit
from app.schemas.wardrobe import (
    ClothingCategory,
    CleanlinessStatus,
    ClothingMetadata,
    ClothingItemCreate,
    ClothingItemUpdate,
    ClothingItemResponse,
    OutfitCreate,
    OutfitUpdate,
    OutfitResponse,
    OutfitWithItems,
    WardrobeStats,
    DEFAULT_WEAR_THRESHOLDS,
)

router = APIRouter(prefix="/wardrobe", tags=["Wardrobe"])


# ============== Helper Functions ==============

def get_clothing_metadata(item: Item) -> dict:
    """Extract clothing metadata from item.item_data JSONB."""
    return item.item_data or {}


def update_clothing_metadata(item: Item, updates: dict) -> None:
    """Update clothing metadata in item.item_data JSONB."""
    current = item.item_data or {}
    current.update(updates)
    item.item_data = current


def item_to_clothing_response(item: Item) -> ClothingItemResponse:
    """Convert Item model to ClothingItemResponse."""
    meta = get_clothing_metadata(item)
    
    # Determine if item can be reworn
    wear_count = meta.get("wear_count_since_wash", 0)
    max_wears = meta.get("max_wears_before_wash", 3)
    can_rewear = wear_count < max_wears and meta.get("cleanliness") != "dirty"
    
    return ClothingItemResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        current_location_id=item.current_location_id,
        permanent_location_id=item.permanent_location_id,
        tags=item.tags or [],
        is_temporary_placement=item.is_temporary_placement,
        last_moved_at=item.last_moved_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
        category=meta.get("category", "other"),
        wear_count_since_wash=wear_count,
        max_wears_before_wash=max_wears,
        last_worn_at=meta.get("last_worn_at"),
        cleanliness=meta.get("cleanliness", "clean"),
        color=meta.get("color"),
        brand=meta.get("brand"),
        season=meta.get("season", "all"),
        image_url=item.image_url,
        can_rewear=can_rewear,
    )


# ============== Clothing Items ==============

@router.get("/items", response_model=List[ClothingItemResponse])
def list_clothing_items(
    category: Optional[ClothingCategory] = None,
    cleanliness: Optional[CleanlinessStatus] = None,
    location_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """List all clothing items with optional filters."""
    query = db.query(Item).filter(Item.item_type == ItemType.CLOTHING)
    
    if location_id:
        query = query.filter(Item.current_location_id == location_id)
    
    items = query.all()
    
    # Filter by metadata fields in Python (JSONB filtering)
    result = []
    for item in items:
        meta = get_clothing_metadata(item)
        if category and meta.get("category") != category.value:
            continue
        if cleanliness and meta.get("cleanliness") != cleanliness.value:
            continue
        result.append(item_to_clothing_response(item))
    
    return result


@router.post("/items", response_model=ClothingItemResponse, status_code=status.HTTP_201_CREATED)
def create_clothing_item(
    item_data: ClothingItemCreate,
    db: Session = Depends(get_db)
):
    """Create a new clothing item."""
    # Validate location
    location = db.query(Location).filter(Location.id == item_data.current_location_id).first()
    if not location:
        raise HTTPException(status_code=400, detail="Location not found")
    
    # Get default wear threshold for category
    category = item_data.clothing.category
    default_threshold = DEFAULT_WEAR_THRESHOLDS.get(category, 3)
    
    # Build clothing metadata
    clothing_meta = {
        "category": item_data.clothing.category.value,
        "wear_count_since_wash": 0,
        "max_wears_before_wash": item_data.clothing.max_wears_before_wash or default_threshold,
        "last_worn_at": None,
        "cleanliness": CleanlinessStatus.CLEAN.value,
        "color": item_data.clothing.color,
        "brand": item_data.clothing.brand,
        "season": item_data.clothing.season.value if item_data.clothing.season else "all",
    }
    
    # Create item
    item = Item(
        name=item_data.name,
        description=item_data.description,
        current_location_id=item_data.current_location_id,
        permanent_location_id=item_data.permanent_location_id or item_data.current_location_id,
        tags=item_data.tags,
        image_url=item_data.image_url,
        item_type=ItemType.CLOTHING,
        item_data=clothing_meta,
    )
    
    db.add(item)
    db.commit()
    db.refresh(item)
    
    # Create initial placement history
    history = MovementHistory(
        item_id=item.id,
        from_location_id=None,
        to_location_id=item.current_location_id,
        action=ActionType.PLACED,
    )
    db.add(history)
    db.commit()
    
    return item_to_clothing_response(item)


@router.get("/items/{item_id}", response_model=ClothingItemResponse)
def get_clothing_item(item_id: UUID, db: Session = Depends(get_db)):
    """Get a specific clothing item."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.item_type == ItemType.CLOTHING
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    
    return item_to_clothing_response(item)


@router.put("/items/{item_id}", response_model=ClothingItemResponse)
def update_clothing_item(
    item_id: UUID,
    item_data: ClothingItemUpdate,
    db: Session = Depends(get_db)
):
    """Update a clothing item."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.item_type == ItemType.CLOTHING
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    
    # Update basic fields
    if item_data.name is not None:
        item.name = item_data.name
    if item_data.description is not None:
        item.description = item_data.description
    if item_data.tags is not None:
        item.tags = item_data.tags
    
    # Update metadata fields
    meta_updates = {}
    if item_data.max_wears_before_wash is not None:
        meta_updates["max_wears_before_wash"] = item_data.max_wears_before_wash
    if item_data.color is not None:
        meta_updates["color"] = item_data.color
    if item_data.brand is not None:
        meta_updates["brand"] = item_data.brand
    if item_data.season is not None:
        meta_updates["season"] = item_data.season.value
    
    if meta_updates:
        update_clothing_metadata(item, meta_updates)
    
    db.commit()
    db.refresh(item)
    
    return item_to_clothing_response(item)


# ============== Wear & Laundry ==============

@router.post("/items/{item_id}/wear", response_model=ClothingItemResponse)
def wear_item(item_id: UUID, db: Session = Depends(get_db)):
    """Log wearing a clothing item."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.item_type == ItemType.CLOTHING
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    
    meta = get_clothing_metadata(item)
    
    # Check if item is wearable
    if meta.get("cleanliness") == CleanlinessStatus.DIRTY.value:
        raise HTTPException(status_code=400, detail="Item is dirty and needs washing")
    if meta.get("cleanliness") == CleanlinessStatus.WASHING.value:
        raise HTTPException(status_code=400, detail="Item is currently being washed")
    
    # Update wear count
    wear_count = meta.get("wear_count_since_wash", 0) + 1
    max_wears = meta.get("max_wears_before_wash", 3)
    
    # Determine new cleanliness status
    if wear_count >= max_wears:
        new_cleanliness = CleanlinessStatus.DIRTY.value
    else:
        new_cleanliness = CleanlinessStatus.WORN.value
    
    # Update metadata
    now = datetime.utcnow()
    update_clothing_metadata(item, {
        "wear_count_since_wash": wear_count,
        "last_worn_at": now.isoformat(),
        "cleanliness": new_cleanliness,
    })
    
    # Create wear event in history
    history = MovementHistory(
        item_id=item.id,
        from_location_id=item.current_location_id,
        to_location_id=item.current_location_id,
        action=ActionType.WORN,
        notes=f"Wear #{wear_count} since last wash",
    )
    db.add(history)
    db.commit()
    db.refresh(item)
    
    return item_to_clothing_response(item)


@router.post("/items/{item_id}/wash", response_model=ClothingItemResponse)
def wash_item(item_id: UUID, db: Session = Depends(get_db)):
    """Mark item as washed and return to clean state."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.item_type == ItemType.CLOTHING
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    
    # Reset wear tracking
    update_clothing_metadata(item, {
        "wear_count_since_wash": 0,
        "cleanliness": CleanlinessStatus.CLEAN.value,
    })
    
    # If item has a permanent location, move it back
    if item.permanent_location_id and item.current_location_id != item.permanent_location_id:
        old_location_id = item.current_location_id
        item.current_location_id = item.permanent_location_id
        item.is_temporary_placement = False
        item.last_moved_at = datetime.utcnow()
        
        # Create movement history
        history = MovementHistory(
            item_id=item.id,
            from_location_id=old_location_id,
            to_location_id=item.permanent_location_id,
            action=ActionType.WASHED,
            notes="Washed and returned to closet",
        )
        db.add(history)
    else:
        # Just record the wash event
        history = MovementHistory(
            item_id=item.id,
            from_location_id=item.current_location_id,
            to_location_id=item.current_location_id,
            action=ActionType.WASHED,
            notes="Item washed",
        )
        db.add(history)
    
    db.commit()
    db.refresh(item)
    
    return item_to_clothing_response(item)


@router.post("/items/{item_id}/to-laundry", response_model=ClothingItemResponse)
def move_to_laundry(item_id: UUID, db: Session = Depends(get_db)):
    """Move dirty item to laundry basket (dirty basket for washing)."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.item_type == ItemType.CLOTHING
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    
    # Find dirty laundry location
    laundry = db.query(Location).filter(Location.kind == LocationKind.LAUNDRY_DIRTY).first()
    if not laundry:
        raise HTTPException(status_code=400, detail="No dirty laundry basket found. Create a location with kind 'laundry_dirty' first.")
    
    old_location_id = item.current_location_id
    item.current_location_id = laundry.id
    item.is_temporary_placement = True
    item.last_moved_at = datetime.utcnow()
    
    update_clothing_metadata(item, {
        "cleanliness": CleanlinessStatus.WASHING.value,
    })
    
    history = MovementHistory(
        item_id=item.id,
        from_location_id=old_location_id,
        to_location_id=laundry.id,
        action=ActionType.MOVED,
        notes="Moved to dirty laundry basket",
    )
    db.add(history)
    db.commit()
    db.refresh(item)
    
    return item_to_clothing_response(item)


@router.post("/items/{item_id}/to-worn-basket", response_model=ClothingItemResponse)
def move_to_worn_basket(item_id: UUID, db: Session = Depends(get_db)):
    """Move worn (but rewearable) item to worn basket."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.item_type == ItemType.CLOTHING
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    
    meta = get_clothing_metadata(item)
    
    # Check if item is dirty - should go to dirty basket instead
    if meta.get("cleanliness") == CleanlinessStatus.DIRTY.value:
        raise HTTPException(status_code=400, detail="Item is dirty, use to-laundry endpoint instead")
    
    # Find worn laundry location
    worn_basket = db.query(Location).filter(Location.kind == LocationKind.LAUNDRY_WORN).first()
    if not worn_basket:
        raise HTTPException(status_code=400, detail="No worn clothes basket found. Create a location with kind 'laundry_worn' first.")
    
    old_location_id = item.current_location_id
    item.current_location_id = worn_basket.id
    item.is_temporary_placement = True
    item.last_moved_at = datetime.utcnow()
    
    history = MovementHistory(
        item_id=item.id,
        from_location_id=old_location_id,
        to_location_id=worn_basket.id,
        action=ActionType.MOVED,
        notes="Moved to worn clothes basket",
    )
    db.add(history)
    db.commit()
    db.refresh(item)
    
    return item_to_clothing_response(item)


@router.get("/laundry", response_model=List[ClothingItemResponse])
def get_laundry_items(db: Session = Depends(get_db)):
    """Get all items that need washing (dirty or in laundry)."""
    items = db.query(Item).filter(Item.item_type == ItemType.CLOTHING).all()
    
    result = []
    for item in items:
        meta = get_clothing_metadata(item)
        cleanliness = meta.get("cleanliness", "clean")
        if cleanliness in [CleanlinessStatus.DIRTY.value, CleanlinessStatus.WASHING.value]:
            result.append(item_to_clothing_response(item))
    
    return result


@router.get("/rewear-safe", response_model=List[ClothingItemResponse])
def get_rewear_safe_items(db: Session = Depends(get_db)):
    """Get items that are safe to rewear."""
    items = db.query(Item).filter(Item.item_type == ItemType.CLOTHING).all()
    
    result = []
    for item in items:
        meta = get_clothing_metadata(item)
        wear_count = meta.get("wear_count_since_wash", 0)
        max_wears = meta.get("max_wears_before_wash", 3)
        cleanliness = meta.get("cleanliness", "clean")
        
        if cleanliness in [CleanlinessStatus.CLEAN.value, CleanlinessStatus.WORN.value] and wear_count < max_wears:
            result.append(item_to_clothing_response(item))
    
    return result


# ============== Outfits ==============

@router.get("/outfits", response_model=List[OutfitResponse])
def list_outfits(db: Session = Depends(get_db)):
    """List all saved outfits."""
    outfits = db.query(Outfit).order_by(Outfit.updated_at.desc()).all()
    return outfits


@router.post("/outfits", response_model=OutfitResponse, status_code=status.HTTP_201_CREATED)
def create_outfit(outfit_data: OutfitCreate, db: Session = Depends(get_db)):
    """Create a new outfit."""
    # Validate all items exist and are clothing
    for item_id in outfit_data.item_ids:
        item = db.query(Item).filter(
            Item.id == item_id,
            Item.item_type == ItemType.CLOTHING
        ).first()
        if not item:
            raise HTTPException(status_code=400, detail=f"Clothing item {item_id} not found")
    
    outfit = Outfit(
        name=outfit_data.name,
        description=outfit_data.description,
        item_ids=outfit_data.item_ids,
        tags=outfit_data.tags,
        rating=outfit_data.rating,
    )
    
    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    
    return outfit


@router.get("/outfits/{outfit_id}", response_model=OutfitWithItems)
def get_outfit(outfit_id: UUID, db: Session = Depends(get_db)):
    """Get an outfit with full item details."""
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    
    # Fetch all items
    items = []
    for item_id in (outfit.item_ids or []):
        item = db.query(Item).filter(Item.id == item_id).first()
        if item:
            items.append(item_to_clothing_response(item))
    
    return OutfitWithItems(
        **{k: v for k, v in outfit.__dict__.items() if not k.startswith('_')},
        items=items,
    )


@router.put("/outfits/{outfit_id}", response_model=OutfitResponse)
def update_outfit(
    outfit_id: UUID,
    outfit_data: OutfitUpdate,
    db: Session = Depends(get_db)
):
    """Update an outfit."""
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    
    if outfit_data.name is not None:
        outfit.name = outfit_data.name
    if outfit_data.description is not None:
        outfit.description = outfit_data.description
    if outfit_data.item_ids is not None:
        # Validate items
        for item_id in outfit_data.item_ids:
            item = db.query(Item).filter(
                Item.id == item_id,
                Item.item_type == ItemType.CLOTHING
            ).first()
            if not item:
                raise HTTPException(status_code=400, detail=f"Clothing item {item_id} not found")
        outfit.item_ids = outfit_data.item_ids
    if outfit_data.tags is not None:
        outfit.tags = outfit_data.tags
    if outfit_data.rating is not None:
        outfit.rating = outfit_data.rating
    
    db.commit()
    db.refresh(outfit)
    
    return outfit


@router.delete("/outfits/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit(outfit_id: UUID, db: Session = Depends(get_db)):
    """Delete an outfit."""
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    
    db.delete(outfit)
    db.commit()


@router.post("/outfits/{outfit_id}/wear", response_model=OutfitWithItems)
def wear_outfit(outfit_id: UUID, db: Session = Depends(get_db)):
    """Wear an entire outfit (logs wear for all items)."""
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    
    # Wear each item
    worn_items = []
    for item_id in (outfit.item_ids or []):
        item = db.query(Item).filter(Item.id == item_id).first()
        if item:
            meta = get_clothing_metadata(item)
            
            # Skip if not wearable
            if meta.get("cleanliness") in [CleanlinessStatus.DIRTY.value, CleanlinessStatus.WASHING.value]:
                continue
            
            # Update wear count
            wear_count = meta.get("wear_count_since_wash", 0) + 1
            max_wears = meta.get("max_wears_before_wash", 3)
            
            new_cleanliness = CleanlinessStatus.DIRTY.value if wear_count >= max_wears else CleanlinessStatus.WORN.value
            
            now = datetime.utcnow()
            update_clothing_metadata(item, {
                "wear_count_since_wash": wear_count,
                "last_worn_at": now.isoformat(),
                "cleanliness": new_cleanliness,
            })
            
            history = MovementHistory(
                item_id=item.id,
                from_location_id=item.current_location_id,
                to_location_id=item.current_location_id,
                action=ActionType.WORN,
                notes=f"Worn as part of outfit: {outfit.name}",
            )
            db.add(history)
            worn_items.append(item_to_clothing_response(item))
    
    # Update outfit stats
    outfit.wear_count = (outfit.wear_count or 0) + 1
    outfit.last_worn_at = datetime.utcnow()
    
    db.commit()
    db.refresh(outfit)
    
    return OutfitWithItems(
        **{k: v for k, v in outfit.__dict__.items() if not k.startswith('_')},
        items=worn_items,
    )


# ============== Analytics ==============

@router.get("/stats", response_model=WardrobeStats)
def get_wardrobe_stats(db: Session = Depends(get_db)):
    """Get wardrobe analytics."""
    items = db.query(Item).filter(Item.item_type == ItemType.CLOTHING).all()
    outfits = db.query(Outfit).all()
    
    clean = worn = dirty = in_laundry = 0
    items_by_category = {}
    
    for item in items:
        meta = get_clothing_metadata(item)
        cleanliness = meta.get("cleanliness", "clean")
        category = meta.get("category", "other")
        
        if cleanliness == CleanlinessStatus.CLEAN.value:
            clean += 1
        elif cleanliness == CleanlinessStatus.WORN.value:
            worn += 1
        elif cleanliness == CleanlinessStatus.DIRTY.value:
            dirty += 1
        elif cleanliness == CleanlinessStatus.WASHING.value:
            in_laundry += 1
        
        items_by_category[category] = items_by_category.get(category, 0) + 1
    
    # Sort items by wear frequency (from metadata.last_worn_at)
    items_with_worn = [(item, get_clothing_metadata(item).get("last_worn_at")) for item in items]
    items_with_worn.sort(key=lambda x: x[1] or "", reverse=True)
    
    most_worn = [item_to_clothing_response(i[0]) for i in items_with_worn[:5] if i[1]]
    least_worn = [item_to_clothing_response(i[0]) for i in items_with_worn[-5:] if not i[1]]
    
    return WardrobeStats(
        total_clothing_items=len(items),
        clean_items=clean,
        worn_items=worn,
        dirty_items=dirty,
        in_laundry=in_laundry,
        total_outfits=len(outfits),
        most_worn_items=most_worn,
        least_worn_items=least_worn,
        items_by_category=items_by_category,
    )
