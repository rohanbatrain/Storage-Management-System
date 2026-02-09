from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models.item import Item, ItemType
from app.models.location import Location
from app.models.history import MovementHistory, ActionType
from app.schemas.item import (
    ItemCreate,
    ItemUpdate,
    ItemResponse,
    ItemMoveRequest,
    ItemWithPath,
    LocationSummary,
    PathSegment
)
from app.schemas.history import MovementHistoryResponse, LocationSummary as HistoryLocationSummary

router = APIRouter(prefix="/items", tags=["Items"])


def get_item_location_path(db: Session, location_id: UUID) -> List[PathSegment]:
    """Build the full path from root to a location."""
    path = []
    location = db.query(Location).filter(Location.id == location_id).first()
    
    while location:
        path.insert(0, PathSegment(id=location.id, name=location.name))
        if location.parent_id:
            location = db.query(Location).filter(Location.id == location.parent_id).first()
        else:
            location = None
    
    return path


def item_to_response(item: Item) -> ItemResponse:
    """Convert Item model to response schema."""
    current_loc = None
    if item.current_location:
        current_loc = LocationSummary(
            id=item.current_location.id,
            name=item.current_location.name,
            kind=item.current_location.kind.value
        )
    
    permanent_loc = None
    if item.permanent_location:
        permanent_loc = LocationSummary(
            id=item.permanent_location.id,
            name=item.permanent_location.name,
            kind=item.permanent_location.kind.value
        )
    
    return ItemResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        quantity=item.quantity,
        tags=item.tags or [],
        current_location_id=item.current_location_id,
        permanent_location_id=item.permanent_location_id,
        is_temporary_placement=item.is_temporary_placement,
        last_moved_at=item.last_moved_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
        current_location=current_loc,
        permanent_location=permanent_loc,
        # Loan fields
        is_lent=item.is_lent,
        lent_to=item.lent_to,
        lent_at=item.lent_at,
        due_date=item.due_date,
        lent_notes=item.lent_notes
    )


@router.get("", response_model=List[ItemResponse])
def list_items(
    location_id: Optional[UUID] = None,
    temporary_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    List all items, optionally filtered by location or temporary status.
    """
    query = db.query(Item)
    
    if location_id:
        query = query.filter(Item.current_location_id == location_id)
    
    if temporary_only:
        query = query.filter(Item.is_temporary_placement == True)
    
    items = query.all()
    return [item_to_response(item) for item in items]


@router.get("/{item_id}", response_model=ItemWithPath)
def get_item(item_id: UUID, db: Session = Depends(get_db)):
    """Get an item with its full location path."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    response = item_to_response(item)
    location_path = get_item_location_path(db, item.current_location_id)
    
    return ItemWithPath(
        **response.model_dump(),
        location_path=location_path
    )


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(item_data: ItemCreate, db: Session = Depends(get_db)):
    """Create a new item. Auto-converts to clothing if placed in wardrobe location."""
    # Validate current location exists
    location = db.query(Location).filter(Location.id == item_data.current_location_id).first()
    if not location:
        raise HTTPException(status_code=400, detail="Current location not found")
    
    # Validate permanent location if provided
    if item_data.permanent_location_id:
        perm_location = db.query(Location).filter(Location.id == item_data.permanent_location_id).first()
        if not perm_location:
            raise HTTPException(status_code=400, detail="Permanent location not found")
    
    # If no permanent location, use current as permanent (unless marked temporary)
    permanent_id = item_data.permanent_location_id
    if not permanent_id and not item_data.is_temporary_placement:
        permanent_id = item_data.current_location_id
    
    # Auto-convert to clothing if location is a wardrobe
    item_type = ItemType.GENERIC
    item_data_json = {}
    
    if location.is_wardrobe:
        item_type = ItemType.CLOTHING
        # Set default clothing metadata
        item_data_json = {
            "category": location.default_clothing_category or "other",
            "wear_count_since_wash": 0,
            "max_wears_before_wash": 3,
            "last_worn_at": None,
            "cleanliness": "clean",
            "color": None,
            "brand": None,
            "season": "all",
        }
    
    item = Item(
        name=item_data.name,
        description=item_data.description,
        current_location_id=item_data.current_location_id,
        permanent_location_id=permanent_id,
        quantity=item_data.quantity,
        tags=item_data.tags,
        is_temporary_placement=item_data.is_temporary_placement,
        item_type=item_type,
        item_data=item_data_json
    )
    
    db.add(item)
    db.commit()
    db.refresh(item)
    
    # Create initial placement history
    history = MovementHistory(
        item_id=item.id,
        from_location_id=None,
        to_location_id=item.current_location_id,
        action=ActionType.PLACED
    )
    db.add(history)
    db.commit()
    
    return item_to_response(item)


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: UUID,
    item_data: ItemUpdate,
    db: Session = Depends(get_db)
):
    """Update an item's details (not location - use move endpoint for that)."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item_data.name is not None:
        item.name = item_data.name
    if item_data.description is not None:
        item.description = item_data.description
    if item_data.quantity is not None:
        item.quantity = item_data.quantity
    if item_data.tags is not None:
        item.tags = item_data.tags
    
    db.commit()
    db.refresh(item)
    
    return item_to_response(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: UUID, db: Session = Depends(get_db)):
    """Delete an item."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()


@router.post("/{item_id}/move", response_model=ItemResponse)
def move_item(
    item_id: UUID,
    move_data: ItemMoveRequest,
    db: Session = Depends(get_db)
):
    """Move an item to a new location."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Validate destination location
    destination = db.query(Location).filter(Location.id == move_data.to_location_id).first()
    if not destination:
        raise HTTPException(status_code=400, detail="Destination location not found")
    
    # Record movement
    old_location_id = item.current_location_id
    
    # Update item
    item.current_location_id = move_data.to_location_id
    item.is_temporary_placement = move_data.is_temporary
    item.last_moved_at = datetime.utcnow()
    
    # Create history record
    history = MovementHistory(
        item_id=item.id,
        from_location_id=old_location_id,
        to_location_id=move_data.to_location_id,
        action=ActionType.MOVED,
        notes=move_data.notes
    )
    db.add(history)
    db.commit()
    db.refresh(item)
    
    return item_to_response(item)


@router.post("/{item_id}/return", response_model=ItemResponse)
def return_item(item_id: UUID, db: Session = Depends(get_db)):
    """Return an item to its permanent location."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if not item.permanent_location_id:
        raise HTTPException(status_code=400, detail="Item has no permanent location set")
    
    if item.current_location_id == item.permanent_location_id:
        raise HTTPException(status_code=400, detail="Item is already at its permanent location")
    
    # Record movement
    old_location_id = item.current_location_id
    
    # Update item
    item.current_location_id = item.permanent_location_id
    item.is_temporary_placement = False
    item.last_moved_at = datetime.utcnow()
    
    # Create history record
    history = MovementHistory(
        item_id=item.id,
        from_location_id=old_location_id,
        to_location_id=item.permanent_location_id,
        action=ActionType.RETURNED,
        notes="Returned to permanent location"
    )
    db.add(history)
    db.commit()
    db.refresh(item)
    
    return item_to_response(item)


@router.get("/{item_id}/history", response_model=List[MovementHistoryResponse])
def get_item_history(item_id: UUID, db: Session = Depends(get_db)):
    """Get movement history for an item."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    history_records = db.query(MovementHistory).filter(
        MovementHistory.item_id == item_id
    ).order_by(MovementHistory.moved_at.desc()).all()
    
    result = []
    for record in history_records:
        from_loc = None
        if record.from_location:
            from_loc = HistoryLocationSummary(
                id=record.from_location.id,
                name=record.from_location.name
            )
        
        to_loc = HistoryLocationSummary(
            id=record.to_location.id,
            name=record.to_location.name
        )
        
        result.append(MovementHistoryResponse(
            id=record.id,
            item_id=record.item_id,
            from_location=from_loc,
            to_location=to_loc,
            action=record.action,
            moved_at=record.moved_at,
            notes=record.notes
        ))
    
    return result


# ============ LOAN TRACKING ENDPOINTS ============

@router.get("/lent/all")
def list_lent_items(db: Session = Depends(get_db)):
    """List all items currently lent out."""
    items = db.query(Item).filter(Item.is_lent == True).all()
    return [item_to_response(item) for item in items]


@router.post("/{item_id}/lend")
def lend_item(
    item_id: UUID,
    borrower: str,
    due_date: Optional[datetime] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lend an item to someone.
    Records who borrowed it, when, and optional due date.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.is_lent:
        raise HTTPException(
            status_code=400, 
            detail=f"Item is already lent to {item.lent_to}"
        )
    
    # Update item loan status
    item.is_lent = True
    item.lent_to = borrower
    item.lent_at = datetime.utcnow()
    item.due_date = due_date
    item.lent_notes = notes
    
    # Create history record
    history = MovementHistory(
        item_id=item.id,
        from_location_id=item.current_location_id,
        to_location_id=item.current_location_id,  # Item stays in location but is lent
        action=ActionType.LENT,
        notes=f"Lent to {borrower}" + (f" - {notes}" if notes else "")
    )
    db.add(history)
    db.commit()
    db.refresh(item)
    
    return {
        "message": f"Item lent to {borrower}",
        "item": item_to_response(item)
    }


@router.post("/{item_id}/return-loan")
def return_from_loan(item_id: UUID, notes: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Mark a lent item as returned.
    Clears the loan status and records in history.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if not item.is_lent:
        raise HTTPException(status_code=400, detail="Item is not currently lent")
    
    borrower = item.lent_to
    
    # Clear loan status
    item.is_lent = False
    item.lent_to = None
    item.lent_at = None
    item.due_date = None
    item.lent_notes = None
    
    # Create history record
    history = MovementHistory(
        item_id=item.id,
        from_location_id=item.current_location_id,
        to_location_id=item.current_location_id,
        action=ActionType.RETURNED_FROM_LOAN,
        notes=f"Returned from {borrower}" + (f" - {notes}" if notes else "")
    )
    db.add(history)
    db.commit()
    db.refresh(item)
    
    return {
        "message": f"Item returned from {borrower}",
        "item": item_to_response(item)
    }

