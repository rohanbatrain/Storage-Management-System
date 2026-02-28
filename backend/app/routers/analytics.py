from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any
from datetime import datetime, timedelta

from app.database import get_db
from app.models.item import Item
from app.models.wear_history import WearHistory

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.post("/wear/{item_id}")
def log_wear(item_id: str, db: Session = Depends(get_db)):
    """Log that an item was worn today."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    history = WearHistory(item_id=item.id)
    db.add(history)
    
    # Increment legacy wear_count if it exists in JSONB
    item_data = item.item_data or {}
    wear_count = item_data.get("wear_count", 0)
    item_data["wear_count"] = wear_count + 1
    item.item_data = item_data
    
    db.commit()
    return {"status": "success", "message": f"Logged wear for {item.name}"}

@router.get("/cost-per-wear")
def get_cost_per_wear(db: Session = Depends(get_db)):
    """Calculate average cost per wear across all items with a purchase_price."""
    items = db.query(Item).filter(Item.purchase_price != None).all()
    
    analysis = []
    total_value = 0
    
    for item in items:
        # Get count from history table
        wear_count = db.query(func.count(WearHistory.id)).filter(WearHistory.item_id == item.id).scalar()
        
        # Fallback to legacy count
        if wear_count == 0:
            wear_count = (item.item_data or {}).get("wear_count", 0)
            
        cpw = item.purchase_price / wear_count if wear_count > 0 else item.purchase_price
        total_value += item.purchase_price
        
        analysis.append({
            "id": str(item.id),
            "name": item.name,
            "image_url": item.image_url,
            "purchase_price": item.purchase_price,
            "wear_count": wear_count,
            "cost_per_wear": round(cpw, 2)
        })
        
    # Sort by worst value (highest cost per wear)
    analysis.sort(key=lambda x: x["cost_per_wear"], reverse=True)
    
    return {
        "total_wardrobe_value": round(total_value, 2),
        "items_analyzed": len(analysis),
        "items": analysis
    }

@router.get("/declutter")
def get_declutter_list(days: int = 365, db: Session = Depends(get_db)):
    """Find items that haven't been worn in X days."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Simple heuristic: items created before cutoff, with 0 wears in history since cutoff
    items = db.query(Item).filter(Item.created_at < cutoff_date).all()
    
    declutter = []
    for item in items:
        recent_wears = db.query(func.count(WearHistory.id)).filter(
            WearHistory.item_id == item.id,
            WearHistory.date_worn >= cutoff_date
        ).scalar()
        
        if recent_wears == 0:
            declutter.append({
                "id": str(item.id),
                "name": item.name,
                "created_at": item.created_at,
                "image_url": item.image_url
            })
            
    return {"suggested_declutter_count": len(declutter), "items": declutter}
