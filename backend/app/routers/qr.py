from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
import qrcode
import io
import uuid as uuid_lib

try:
    from fpdf import FPDF
    FPDF_AVAILABLE = True
except ImportError:
    FPDF_AVAILABLE = False

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
    seq: int = None,  # Sequence number (1-based)
    of: int = None,   # Total count
    db: Session = Depends(get_db)
):
    """
    Generate a QR code image for an item.
    If seq and of are provided, generates a sequence-aware QR code.
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
    
    # Encode the item QR code ID with optional sequence info
    if seq and of:
        qr_data = f"psms://item/{item.qr_code_id}?seq={seq}&of={of}"
    else:
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


@router.get("/bulk-pdf")
def generate_bulk_pdf(
    type: str = Query(..., description="Type: 'locations' or 'items'"),
    ids: str = Query(..., description="Comma-separated list of UUIDs"),
    db: Session = Depends(get_db)
):
    """
    Generate a printable PDF with multiple QR codes.
    Each QR code includes the name label below it.
    """
    if not FPDF_AVAILABLE:
        raise HTTPException(status_code=500, detail="PDF generation not available")
    
    id_list = [id.strip() for id in ids.split(',') if id.strip()]
    if not id_list:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    # Fetch items based on type
    qr_entries = []  # List of (name, qr_data)
    
    if type == 'locations':
        for loc_id in id_list:
            try:
                loc = db.query(Location).filter(Location.id == loc_id).first()
                if loc:
                    if not loc.qr_code_id:
                        loc.qr_code_id = f"psms-loc-{uuid_lib.uuid4().hex[:8]}"
                        db.commit()
                    name = loc.name[:32] + '...' if len(loc.name) > 32 else loc.name
                    qr_entries.append((name, f"psms://location/{loc.qr_code_id}"))
            except:
                continue
    elif type == 'items':
        for item_id in id_list:
            try:
                item = db.query(Item).filter(Item.id == item_id).first()
                if item:
                    if not item.qr_code_id:
                        item.qr_code_id = f"psms-item-{uuid_lib.uuid4().hex[:8]}"
                        db.commit()
                    # For items with qty > 1, create multiple entries
                    qty = item.quantity or 1
                    for seq in range(1, qty + 1):
                        if qty > 1:
                            name = f"{item.name[:25]}... ({seq}/{qty})" if len(item.name) > 25 else f"{item.name} ({seq}/{qty})"
                            qr_data = f"psms://item/{item.qr_code_id}?seq={seq}&of={qty}"
                        else:
                            name = item.name[:32] + '...' if len(item.name) > 32 else item.name
                            qr_data = f"psms://item/{item.qr_code_id}"
                        qr_entries.append((name, qr_data))
            except:
                continue
    else:
        raise HTTPException(status_code=400, detail="Invalid type. Use 'locations' or 'items'")
    
    if not qr_entries:
        raise HTTPException(status_code=404, detail="No valid entries found")
    
    # Generate PDF
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # QR grid layout: 3 columns, ~4 rows per page
    qr_size = 50  # mm
    margin = 10
    col_width = 65
    row_height = 70
    cols_per_row = 3
    
    for idx, (name, qr_data) in enumerate(qr_entries):
        col = idx % cols_per_row
        row = (idx // cols_per_row) % 4
        
        if idx % 12 == 0:  # New page every 12 items
            pdf.add_page()
        
        x = margin + col * col_width
        y = margin + row * row_height
        
        # Generate QR code image
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save QR to temp bytes
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # Add QR image to PDF
        pdf.image(img_buffer, x=x, y=y, w=qr_size, h=qr_size)
        
        # Add name label below QR
        pdf.set_xy(x, y + qr_size + 2)
        pdf.set_font('Helvetica', size=8)
        pdf.cell(col_width - 5, 5, name, align='C')
    
    # Output PDF
    pdf_bytes = io.BytesIO()
    pdf_bytes.write(pdf.output())
    pdf_bytes.seek(0)
    
    return StreamingResponse(
        pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=qr-codes-{type}.pdf"
        }
    )
