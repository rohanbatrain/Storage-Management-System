"""
Data Export Router
Provides endpoints for exporting all application data for backup purposes.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List

from app.database import get_db
from app.models.location import Location
from app.models.item import Item
from app.models.history import MovementHistory
from app.models.outfit import Outfit

router = APIRouter(prefix="/export", tags=["Export"])


def serialize_location(loc: Location) -> Dict[str, Any]:
    """Serialize a location to dict."""
    return {
        "id": str(loc.id),
        "name": loc.name,
        "kind": loc.kind.value if loc.kind else None,
        "description": loc.description,
        "qr_code_id": loc.qr_code_id,
        "parent_id": str(loc.parent_id) if loc.parent_id else None,
        "is_wardrobe": loc.is_wardrobe,
        "default_clothing_category": loc.default_clothing_category,
        "created_at": loc.created_at.isoformat() if loc.created_at else None,
        "updated_at": loc.updated_at.isoformat() if loc.updated_at else None,
    }


def serialize_item(item: Item) -> Dict[str, Any]:
    """Serialize an item to dict."""
    return {
        "id": str(item.id),
        "name": item.name,
        "description": item.description,
        "quantity": item.quantity,
        "tags": item.tags or [],
        "item_type": item.item_type.value if item.item_type else "generic",
        "item_data": item.item_data or {},
        "image_url": item.image_url,
        "current_location_id": str(item.current_location_id) if item.current_location_id else None,
        "permanent_location_id": str(item.permanent_location_id) if item.permanent_location_id else None,
        "is_temporary_placement": item.is_temporary_placement,
        "last_moved_at": item.last_moved_at.isoformat() if item.last_moved_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_history(hist: MovementHistory) -> Dict[str, Any]:
    """Serialize movement history to dict."""
    return {
        "id": str(hist.id),
        "item_id": str(hist.item_id) if hist.item_id else None,
        "from_location_id": str(hist.from_location_id) if hist.from_location_id else None,
        "to_location_id": str(hist.to_location_id) if hist.to_location_id else None,
        "action": hist.action.value if hist.action else None,
        "notes": hist.notes,
        "moved_at": hist.moved_at.isoformat() if hist.moved_at else None,
    }


def serialize_outfit(outfit: Outfit) -> Dict[str, Any]:
    """Serialize an outfit to dict."""
    return {
        "id": str(outfit.id),
        "name": outfit.name,
        "description": outfit.description,
        "item_ids": [str(i) for i in (outfit.item_ids or [])],
        "tags": outfit.tags or [],
        "rating": outfit.rating,
        "wear_count": outfit.wear_count,
        "last_worn_at": outfit.last_worn_at.isoformat() if outfit.last_worn_at else None,
        "created_at": outfit.created_at.isoformat() if outfit.created_at else None,
        "updated_at": outfit.updated_at.isoformat() if outfit.updated_at else None,
    }


@router.get("/full")
def export_all_data(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Export all application data as JSON.
    Use this for periodic backups.
    """
    # Get all data
    locations = db.query(Location).all()
    items = db.query(Item).all()
    history = db.query(MovementHistory).order_by(MovementHistory.moved_at.desc()).limit(1000).all()
    outfits = db.query(Outfit).all()
    
    export_data = {
        "export_version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "statistics": {
            "locations_count": len(locations),
            "items_count": len(items),
            "outfits_count": len(outfits),
            "history_entries": len(history),
        },
        "locations": [serialize_location(loc) for loc in locations],
        "items": [serialize_item(item) for item in items],
        "outfits": [serialize_outfit(outfit) for outfit in outfits],
        "movement_history": [serialize_history(h) for h in history],
    }
    
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename=psms_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        }
    )


@router.get("/summary")
def export_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get a summary of exportable data without full export."""
    locations_count = db.query(Location).count()
    items_count = db.query(Item).count()
    outfits_count = db.query(Outfit).count()
    
    return {
        "locations_count": locations_count,
        "items_count": items_count,
        "outfits_count": outfits_count,
        "export_endpoint": "/api/export/full",
    }
