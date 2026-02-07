from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID
import qrcode
import io

from app.database import get_db
from app.models.location import Location
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


@router.get("/scan/{qr_code_id}", response_model=LocationResponse)
def scan_qr_code(qr_code_id: str, db: Session = Depends(get_db)):
    """
    Look up a location by its QR code ID.
    Used when scanning a physical QR code label.
    """
    location = db.query(Location).filter(Location.qr_code_id == qr_code_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found for this QR code")
    
    item_count = len(location.items) if location.items else 0
    children_count = len(location.children) if location.children else 0
    
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
