from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID
import qrcode
import io
import uuid as uuid_lib

from app.database import get_db
from app.models.location import Location
from app.models.item import Item
from app.schemas.location import LocationResponse

router = APIRouter(prefix="/qr", tags=["QR Codes"])


@router.get("/{location_id}")
def generate_qr_code(
    location_id: UUID,
    size: int = 200,
    db: Session = Depends(get_db)
):
    """
    Generate a QR code image for a location.
    The QR code encodes the location's unique QR ID.
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    if not location.qr_code_id:
        raise HTTPException(status_code=400, detail="Location has no QR code ID")
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    
    # Encode the QR code ID (can be used for app deep linking)
    qr_data = f"psms://location/{location.qr_code_id}"
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Generate image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Resize if needed
    img = img.resize((size, size))
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return StreamingResponse(
        img_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f"inline; filename=qr-{location.qr_code_id}.png"
        }
    )


@router.get("/scan/{qr_code_id}")
def scan_qr_code(qr_code_id: str, db: Session = Depends(get_db)):
    """
    Look up a location or item by its QR code ID.
    Used when scanning a physical QR code label.
    Returns: { type: "location" | "item", data: ... }
    """
    # First try to find a location
    location = db.query(Location).filter(Location.qr_code_id == qr_code_id).first()
    if location:
        item_count = len(location.items) if location.items else 0
        children_count = len(location.children) if location.children else 0
        return {
            "type": "location",
            "data": {
                "id": str(location.id),
                "name": location.name,
                "description": location.description,
                "kind": location.kind.value if location.kind else None,
                "qr_code_id": location.qr_code_id,
                "item_count": item_count,
                "children_count": children_count,
            }
        }
    
    # Then try to find an item
    item = db.query(Item).filter(Item.qr_code_id == qr_code_id).first()
    if item:
        location_name = item.current_location.name if item.current_location else "Unknown"
        return {
            "type": "item",
            "data": {
                "id": str(item.id),
                "name": item.name,
                "description": item.description,
                "qr_code_id": item.qr_code_id,
                "current_location": location_name,
                "current_location_id": str(item.current_location_id) if item.current_location_id else None,
                "is_temporary_placement": item.is_temporary_placement,
                "item_type": item.item_type.value if item.item_type else "generic",
            }
        }
    
    raise HTTPException(status_code=404, detail="No location or item found for this QR code")


@router.get("/item/{item_id}")
def generate_item_qr_code(
    item_id: UUID,
    size: int = 200,
    db: Session = Depends(get_db)
):
    """
    Generate a QR code image for an item.
    If the item doesn't have a QR code ID, one is generated.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Generate QR code ID if not exists
    if not item.qr_code_id:
        item.qr_code_id = f"psms-item-{uuid_lib.uuid4().hex[:8]}"
        db.commit()
        db.refresh(item)
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    
    # Encode the item QR code ID
    qr_data = f"psms://item/{item.qr_code_id}"
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Generate image
    img = qr.make_image(fill_color="black", back_color="white")
    img = img.resize((size, size))
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return StreamingResponse(
        img_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f"inline; filename=qr-{item.qr_code_id}.png"
        }
    )

