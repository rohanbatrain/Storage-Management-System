from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Set
from uuid import UUID
import uuid

from app.database import get_db
from app.models.location import Location, LocationKind
from app.schemas.location import (
    LocationCreate,
    LocationUpdate,
    LocationResponse,
    LocationTreeResponse,
    LocationDetailResponse,
    LocationPathResponse,
    AliasCreate
)

router = APIRouter(prefix="/locations", tags=["Locations"])


# Define valid parent kinds for each location type
# None means it can be a root location (no parent)
VALID_PARENT_KINDS: dict[LocationKind, Set[Optional[LocationKind]]] = {
    LocationKind.ROOM: {None},  # Rooms can only be root locations
    LocationKind.FURNITURE: {LocationKind.ROOM},  # Furniture goes in rooms
    LocationKind.CONTAINER: {LocationKind.ROOM, LocationKind.FURNITURE, LocationKind.CONTAINER, LocationKind.SURFACE, LocationKind.PORTABLE},
    LocationKind.SURFACE: {LocationKind.ROOM, LocationKind.FURNITURE},  # Surfaces are on furniture or in rooms
    LocationKind.PORTABLE: {LocationKind.ROOM, LocationKind.FURNITURE, LocationKind.SURFACE, LocationKind.CONTAINER},
    LocationKind.LAUNDRY_WORN: {LocationKind.ROOM, LocationKind.FURNITURE},  # Laundry baskets in rooms or furniture
    LocationKind.LAUNDRY_DIRTY: {LocationKind.ROOM, LocationKind.FURNITURE},
}


def validate_location_hierarchy(child_kind: LocationKind, parent: Optional[Location]) -> None:
    """Validate that the parent-child relationship is logical."""
    parent_kind = parent.kind if parent else None
    valid_parents = VALID_PARENT_KINDS.get(child_kind, set())
    
    if parent_kind not in valid_parents:
        if parent is None:
            raise HTTPException(
                status_code=400,
                detail=f"'{child_kind.value}' cannot be a root location. Valid parents: {[k.value for k in valid_parents if k]}"
            )
        else:
            valid_parent_names = [k.value for k in valid_parents if k] or ["(root only)"]
            raise HTTPException(
                status_code=400,
                detail=f"'{child_kind.value}' cannot be inside '{parent_kind.value}'. Valid parents: {valid_parent_names}"
            )


def get_location_path(db: Session, location: Location) -> List[LocationPathResponse]:
    """Build the full path from root to this location."""
    path = []
    current = location
    while current:
        path.insert(0, LocationPathResponse(
            id=current.id,
            name=current.name,
            kind=current.kind.value
        ))
        if current.parent_id:
            current = db.query(Location).filter(Location.id == current.parent_id).first()
        else:
            current = None
    return path


def build_tree(location: Location, db: Session) -> LocationTreeResponse:
    """Recursively build tree structure for a location."""
    children = db.query(Location).filter(Location.parent_id == location.id).all()
    item_count = len(location.items) if location.items else 0
    
    return LocationTreeResponse(
        id=location.id,
        name=location.name,
        description=location.description,
        kind=location.kind,
        aliases=location.aliases or [],
        qr_code_id=location.qr_code_id,
        is_wardrobe=location.is_wardrobe,
        item_count=item_count,
        children=[build_tree(child, db) for child in children]
    )


@router.get("", response_model=List[LocationResponse])
def list_root_locations(db: Session = Depends(get_db)):
    """List all root-level locations (no parent)."""
    locations = db.query(Location).filter(Location.parent_id.is_(None)).all()
    
    result = []
    for loc in locations:
        item_count = len(loc.items) if loc.items else 0
        children_count = db.query(func.count(Location.id)).filter(
            Location.parent_id == loc.id
        ).scalar()
        
        result.append(LocationResponse(
            id=loc.id,
            name=loc.name,
            description=loc.description,
            parent_id=loc.parent_id,
            kind=loc.kind,
            aliases=loc.aliases or [],
            qr_code_id=loc.qr_code_id,
            is_wardrobe=loc.is_wardrobe,
            default_clothing_category=loc.default_clothing_category,
            created_at=loc.created_at,
            updated_at=loc.updated_at,
            item_count=item_count,
            children_count=children_count
        ))
    
    return result


@router.get("/tree", response_model=List[LocationTreeResponse])
def get_full_tree(db: Session = Depends(get_db)):
    """Get full location tree starting from root locations."""
    root_locations = db.query(Location).filter(Location.parent_id.is_(None)).all()
    return [build_tree(loc, db) for loc in root_locations]


@router.get("/{location_id}", response_model=LocationDetailResponse)
def get_location(location_id: UUID, db: Session = Depends(get_db)):
    """Get a specific location with its path and children."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Get path
    path = get_location_path(db, location)
    
    # Get children
    children = db.query(Location).filter(Location.parent_id == location_id).all()
    children_count = len(children)
    
    # Build children response
    children_response = []
    for child in children:
        child_item_count = len(child.items) if child.items else 0
        child_children_count = db.query(func.count(Location.id)).filter(
            Location.parent_id == child.id
        ).scalar()
        
        children_response.append(LocationResponse(
            id=child.id,
            name=child.name,
            description=child.description,
            parent_id=child.parent_id,
            kind=child.kind,
            aliases=child.aliases or [],
            qr_code_id=child.qr_code_id,
            created_at=child.created_at,
            updated_at=child.updated_at,
            item_count=child_item_count,
            children_count=child_children_count
        ))
    
    item_count = len(location.items) if location.items else 0
    
    return LocationDetailResponse(
        id=location.id,
        name=location.name,
        description=location.description,
        parent_id=location.parent_id,
        kind=location.kind,
        aliases=location.aliases or [],
        qr_code_id=location.qr_code_id,
        created_at=location.created_at,
        updated_at=location.updated_at,
        item_count=item_count,
        children_count=children_count,
        path=path,
        children=children_response
    )


@router.get("/{location_id}/tree", response_model=LocationTreeResponse)
def get_location_tree(location_id: UUID, db: Session = Depends(get_db)):
    """Get full nested tree for a specific location."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    return build_tree(location, db)


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
def create_location(location_data: LocationCreate, db: Session = Depends(get_db)):
    """Create a new storage location."""
    # Validate parent exists if provided
    parent = None
    if location_data.parent_id:
        parent = db.query(Location).filter(Location.id == location_data.parent_id).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent location not found")
    
    # Validate parent-child hierarchy
    validate_location_hierarchy(location_data.kind, parent)
    
    # Generate QR code ID
    qr_code_id = f"sms-loc-{uuid.uuid4().hex[:8]}"
    
    location = Location(
        name=location_data.name,
        description=location_data.description,
        parent_id=location_data.parent_id,
        kind=location_data.kind,
        aliases=location_data.aliases,
        qr_code_id=qr_code_id,
        is_wardrobe=location_data.is_wardrobe,
        default_clothing_category=location_data.default_clothing_category
    )
    
    db.add(location)
    db.commit()
    db.refresh(location)
    
    return LocationResponse(
        id=location.id,
        name=location.name,
        description=location.description,
        parent_id=location.parent_id,
        kind=location.kind,
        aliases=location.aliases or [],
        qr_code_id=location.qr_code_id,
        is_wardrobe=location.is_wardrobe,
        default_clothing_category=location.default_clothing_category,
        created_at=location.created_at,
        updated_at=location.updated_at,
        item_count=0,
        children_count=0
    )


@router.put("/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: UUID,
    location_data: LocationUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing location."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Determine new parent and kind
    new_parent = None
    new_parent_id = location_data.parent_id if location_data.parent_id is not None else location.parent_id
    new_kind = location_data.kind if location_data.kind is not None else location.kind
    
    # Validate parent if being changed
    if location_data.parent_id is not None:
        if location_data.parent_id == location_id:
            raise HTTPException(status_code=400, detail="Location cannot be its own parent")
        new_parent = db.query(Location).filter(Location.id == location_data.parent_id).first()
        if not new_parent:
            raise HTTPException(status_code=400, detail="Parent location not found")
    elif new_parent_id:
        new_parent = db.query(Location).filter(Location.id == new_parent_id).first()
    
    # Validate hierarchy if parent or kind is changing
    if location_data.parent_id is not None or location_data.kind is not None:
        validate_location_hierarchy(new_kind, new_parent)
    
    # Update fields
    if location_data.name is not None:
        location.name = location_data.name
    if location_data.description is not None:
        location.description = location_data.description
    if location_data.kind is not None:
        location.kind = location_data.kind
    if location_data.parent_id is not None:
        location.parent_id = location_data.parent_id
    if location_data.is_wardrobe is not None:
        location.is_wardrobe = location_data.is_wardrobe
    if location_data.default_clothing_category is not None:
        location.default_clothing_category = location_data.default_clothing_category
    
    db.commit()
    db.refresh(location)
    
    item_count = len(location.items) if location.items else 0
    children_count = db.query(func.count(Location.id)).filter(
        Location.parent_id == location.id
    ).scalar()
    
    return LocationResponse(
        id=location.id,
        name=location.name,
        description=location.description,
        parent_id=location.parent_id,
        kind=location.kind,
        aliases=location.aliases or [],
        qr_code_id=location.qr_code_id,
        created_at=location.created_at,
        updated_at=location.updated_at,
        item_count=item_count,
        children_count=children_count
    )


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(location_id: UUID, db: Session = Depends(get_db)):
    """Delete a location (cascades to children and items via database CASCADE)."""
    # Check if location exists first
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Get all descendant location IDs (recursive)
    from sqlalchemy import text
    
    # Find all locations to delete (this location + all descendants)
    descendant_query = text("""
        WITH RECURSIVE descendants AS (
            SELECT id FROM locations WHERE id = :id
            UNION ALL
            SELECT l.id FROM locations l
            INNER JOIN descendants d ON l.parent_id = d.id
        )
        SELECT id FROM descendants
    """)
    result = db.execute(descendant_query, {"id": str(location_id)})
    location_ids = [str(row[0]) for row in result.fetchall()]
    
    # Delete movement history records that reference these locations
    if location_ids:
        from app.models.history import MovementHistory
        from app.models.item import Item
        from app.routers.upload import cleanup_image
        
        db.query(MovementHistory).filter(
            (MovementHistory.to_location_id.in_(location_ids)) |
            (MovementHistory.from_location_id.in_(location_ids))
        ).delete(synchronize_session=False)
        
        # Clean up image files for items being deleted
        items_to_delete = db.query(Item).filter(
            (Item.current_location_id.in_(location_ids)) |
            (Item.permanent_location_id.in_(location_ids))
        ).all()
        for item in items_to_delete:
            cleanup_image(item.image_url)
        
        # Clean up image files for locations being deleted
        locations_to_delete = db.query(Location).filter(
            Location.id.in_(location_ids)
        ).all()
        for loc in locations_to_delete:
            cleanup_image(loc.image_url)
        
        # Delete items
        db.query(Item).filter(
            (Item.current_location_id.in_(location_ids)) |
            (Item.permanent_location_id.in_(location_ids))
        ).delete(synchronize_session=False)
        
        # Delete the locations
        db.query(Location).filter(
            Location.id.in_(location_ids)
        ).delete(synchronize_session=False)
    
    db.commit()


@router.post("/{location_id}/alias", response_model=LocationResponse)
def add_alias(
    location_id: UUID,
    alias_data: AliasCreate,
    db: Session = Depends(get_db)
):
    """Add an alias to a location."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Add alias if not already present
    current_aliases = location.aliases or []
    if alias_data.alias not in current_aliases:
        current_aliases.append(alias_data.alias)
        location.aliases = current_aliases
        db.commit()
        db.refresh(location)
    
    item_count = len(location.items) if location.items else 0
    children_count = db.query(func.count(Location.id)).filter(
        Location.parent_id == location.id
    ).scalar()
    
    return LocationResponse(
        id=location.id,
        name=location.name,
        description=location.description,
        parent_id=location.parent_id,
        kind=location.kind,
        aliases=location.aliases or [],
        qr_code_id=location.qr_code_id,
        created_at=location.created_at,
        updated_at=location.updated_at,
        item_count=item_count,
        children_count=children_count
    )


@router.delete("/{location_id}/alias/{alias}", status_code=status.HTTP_204_NO_CONTENT)
def remove_alias(location_id: UUID, alias: str, db: Session = Depends(get_db)):
    """Remove an alias from a location."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    current_aliases = location.aliases or []
    if alias in current_aliases:
        current_aliases.remove(alias)
        location.aliases = current_aliases
        db.commit()
