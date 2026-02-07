from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List

from app.database import get_db
from app.models.item import Item
from app.models.location import Location
from app.schemas.search import SearchResult, SearchResponse

router = APIRouter(prefix="/search", tags=["Search"])


def get_location_path_string(db: Session, location: Location) -> str:
    """Build readable path string like 'Home → Bedroom → Wardrobe'."""
    path_parts = []
    current = location
    
    while current:
        path_parts.insert(0, current.name)
        if current.parent_id:
            current = db.query(Location).filter(Location.id == current.parent_id).first()
        else:
            current = None
    
    return " → ".join(path_parts)


@router.get("", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db)
):
    """
    Search for items and locations by name.
    Returns results grouped by type with full location paths.
    """
    search_term = f"%{q.lower()}%"
    
    # Search items
    items = db.query(Item).filter(
        or_(
            func.lower(Item.name).like(search_term),
            func.lower(Item.description).like(search_term)
        )
    ).limit(25).all()
    
    # Search locations by name and description (skip alias search for now to avoid complex queries)
    locations = db.query(Location).filter(
        or_(
            func.lower(Location.name).like(search_term),
            func.lower(Location.description).like(search_term)
        )
    ).limit(25).all()
    
    # Build item results
    item_results = []
    for item in items:
        location_path = get_location_path_string(db, item.current_location) if item.current_location else None
        item_results.append(SearchResult(
            id=item.id,
            name=item.name,
            type="item",
            description=item.description,
            location_path=location_path
        ))
    
    # Build location results
    location_results = []
    for loc in locations:
        path_str = get_location_path_string(db, loc)
        location_results.append(SearchResult(
            id=loc.id,
            name=loc.name,
            type="location",
            description=loc.description,
            location_path=path_str
        ))
    
    return SearchResponse(
        query=q,
        total_count=len(item_results) + len(location_results),
        items=item_results,
        locations=location_results
    )


@router.get("/alias/{alias}", response_model=List[SearchResult])
def search_by_alias(alias: str, db: Session = Depends(get_db)):
    """Find locations by their alias."""
    locations = db.query(Location).filter(
        Location.aliases.any(alias)
    ).all()
    
    results = []
    for loc in locations:
        path_str = get_location_path_string(db, loc)
        results.append(SearchResult(
            id=loc.id,
            name=loc.name,
            type="location",
            description=loc.description,
            location_path=path_str
        ))
    
    return results
