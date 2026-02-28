from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from pydantic.json_schema import SkipJsonSchema

from app.database import get_db
from app.models.trip import Trip
from app.models.item import Item
import uuid

router = APIRouter(prefix="/api/trips", tags=["trips"])

class TripCreate(BaseModel):
    name: str
    description: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class TripResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    destination: Optional[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    packed_items_count: int

    class Config:
        from_attributes = True

@router.get("", response_model=List[TripResponse])
def get_trips(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(Trip)
    if active_only:
        query = query.filter(Trip.is_active == True)
    
    trips = query.order_by(Trip.created_at.desc()).all()
    
    # Calculate counts
    response = []
    for t in trips:
        count = db.query(Item).filter(Item.current_trip_id == t.id).count()
        response.append({**t.__dict__, "packed_items_count": count})
    
    return response

@router.post("", response_model=TripResponse)
def create_trip(trip_in: TripCreate, db: Session = Depends(get_db)):
    db_trip = Trip(
        name=trip_in.name,
        description=trip_in.description,
        destination=trip_in.destination,
        start_date=trip_in.start_date,
        end_date=trip_in.end_date,
        is_active=True
    )
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    
    return {**db_trip.__dict__, "packed_items_count": 0}

@router.post("/{trip_id}/pack/{item_id}")
def pack_item(trip_id: str, item_id: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.current_trip_id = trip.id
    db.commit()
    return {"status": "success", "item_name": item.name, "trip_name": trip.name}

@router.post("/{trip_id}/unpack/{item_id}")
def unpack_item(trip_id: str, item_id: str, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id, Item.current_trip_id == trip_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in this trip")

    item.current_trip_id = None
    db.commit()
    return {"status": "success", "message": f"{item.name} unpacked."}

@router.post("/{trip_id}/unpack-all")
def unpack_all(trip_id: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    items = db.query(Item).filter(Item.current_trip_id == trip.id).all()
    count = len(items)
    for item in items:
        item.current_trip_id = None
        
    # Mark trip as completed
    trip.is_active = False
    db.commit()
    
    return {"status": "success", "unpacked_count": count}
