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


# IMPORTANT: Static routes must come BEFORE dynamic routes like /{location_id}

@router.get("/bulk-pdf")
def generate_bulk_pdf(
    type: str = Query(..., description="Type: 'locations' or 'items'"),
    ids: str = Query(..., description="Comma-separated list of UUIDs"),
    qr_size: int = Query(50, ge=25, le=80, description="QR code size in mm (25-80)"),
    page_size: str = Query("letter", description="Page size: 'letter' or 'a4'"),
    orientation: str = Query("portrait", description="Orientation: 'portrait' or 'landscape'"),
    columns: int = Query(3, ge=1, le=6, description="Number of columns (1-6)"),
    show_labels: bool = Query(True, description="Show name labels below QR codes"),
    label_font_size: int = Query(8, ge=6, le=14, description="Label font size in pt (6-14)"),
    include_border: bool = Query(False, description="Draw a dashed border around each QR cell"),
    include_id: bool = Query(False, description="Print QR code ID text below the label"),
    db: Session = Depends(get_db)
):
    """
    Generate a printable PDF with multiple QR codes.
    Supports extensive customization: QR size, page format, layout, labels, and borders.
    """
    if not FPDF_AVAILABLE:
        raise HTTPException(status_code=500, detail="PDF generation not available")
    
    # Validate enum-style params
    if page_size not in ('letter', 'a4'):
        raise HTTPException(status_code=400, detail="page_size must be 'letter' or 'a4'")
    if orientation not in ('portrait', 'landscape'):
        raise HTTPException(status_code=400, detail="orientation must be 'portrait' or 'landscape'")
    
    id_list = [id.strip() for id in ids.split(',') if id.strip()]
    if not id_list:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    # Fetch items based on type
    qr_entries = []  # List of (name, qr_data, qr_code_id)
    
    if type == 'locations':
        for loc_id in id_list:
            try:
                loc = db.query(Location).filter(Location.id == loc_id).first()
                if loc:
                    if not loc.qr_code_id:
                        loc.qr_code_id = f"psms-loc-{uuid_lib.uuid4().hex[:8]}"
                        db.commit()
                    name = loc.name[:32] + '...' if len(loc.name) > 32 else loc.name
                    qr_entries.append((name, f"psms://location/{loc.qr_code_id}", loc.qr_code_id))
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
                        qr_entries.append((name, qr_data, item.qr_code_id))
            except:
                continue
    else:
        raise HTTPException(status_code=400, detail="Invalid type. Use 'locations' or 'items'")
    
    if not qr_entries:
        raise HTTPException(status_code=404, detail="No valid entries found")
    
    # --- Page dimensions ---
    # Letter: 215.9 x 279.4 mm, A4: 210 x 297 mm
    page_dimensions = {
        'letter': (215.9, 279.4),
        'a4': (210.0, 297.0),
    }
    page_w, page_h = page_dimensions[page_size]
    if orientation == 'landscape':
        page_w, page_h = page_h, page_w
    
    # --- Layout calculations ---
    margin = 10  # mm
    usable_w = page_w - 2 * margin
    usable_h = page_h - 2 * margin
    
    col_width = usable_w / columns
    # Cap qr_size to fit in column
    effective_qr_size = min(qr_size, col_width - 4)
    
    # Row height: QR + optional label + optional ID + padding
    label_height = (label_font_size * 0.4 + 3) if show_labels else 0
    id_height = 4 if include_id else 0
    row_height = effective_qr_size + label_height + id_height + 8  # 8mm padding
    
    rows_per_page = max(1, int(usable_h / row_height))
    items_per_page = columns * rows_per_page
    
    # --- Generate PDF ---
    fmt = page_size.upper() if page_size == 'a4' else 'Letter'
    orient = 'P' if orientation == 'portrait' else 'L'
    pdf = FPDF(orientation=orient, format=fmt)
    pdf.set_auto_page_break(auto=False)
    
    from PIL import Image as PILImage
    
    for idx, (name, qr_data, qr_code_id) in enumerate(qr_entries):
        col = idx % columns
        row = (idx // columns) % rows_per_page
        
        if idx % items_per_page == 0:
            pdf.add_page()
        
        # Calculate cell position
        cell_x = margin + col * col_width
        cell_y = margin + row * row_height
        
        # Center QR within the cell
        qr_x = cell_x + (col_width - effective_qr_size) / 2
        qr_y = cell_y + 2
        
        # Optional dashed border around cell
        if include_border:
            pdf.set_draw_color(180, 180, 180)
            pdf.set_line_width(0.3)
            bx = cell_x + 1
            by = cell_y
            bw = col_width - 2
            bh = row_height - 2
            # Draw border with dash pattern if available, else solid rect
            if hasattr(pdf, 'set_dash_pattern'):
                pdf.set_dash_pattern(dash=2, gap=1)
                pdf.rect(bx, by, bw, bh)
                pdf.set_dash_pattern()
            elif hasattr(pdf, 'dashed_line'):
                pdf.dashed_line(bx, by, bx + bw, by, 2, 1)
                pdf.dashed_line(bx + bw, by, bx + bw, by + bh, 2, 1)
                pdf.dashed_line(bx + bw, by + bh, bx, by + bh, 2, 1)
                pdf.dashed_line(bx, by + bh, bx, by, 2, 1)
            else:
                pdf.rect(bx, by, bw, bh)
        
        # Generate QR code image
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        if hasattr(qr_img, 'convert'):
            pil_img = qr_img.convert('RGB')
        else:
            pil_img = qr_img.get_image().convert('RGB')
        
        img_buffer = io.BytesIO()
        pil_img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        pdf.image(img_buffer, x=qr_x, y=qr_y, w=effective_qr_size, h=effective_qr_size)
        
        # Name label
        if show_labels:
            pdf.set_xy(cell_x, qr_y + effective_qr_size + 1)
            pdf.set_font('Helvetica', size=label_font_size)
            pdf.set_text_color(0, 0, 0)
            # Truncate name to fit cell width (rough estimate: 2.5 chars per mm at small sizes)
            max_chars = max(8, int(col_width / (label_font_size * 0.22)))
            display_name = name[:max_chars] + '...' if len(name) > max_chars else name
            pdf.cell(col_width, label_font_size * 0.4 + 1, display_name, align='C')
        
        # QR code ID text
        if include_id:
            id_y = qr_y + effective_qr_size + 1 + (label_height if show_labels else 0)
            pdf.set_xy(cell_x, id_y)
            pdf.set_font('Courier', size=6)
            pdf.set_text_color(120, 120, 120)
            pdf.cell(col_width, 3, qr_code_id, align='C')
    
    # Reset text color
    pdf.set_text_color(0, 0, 0)
    
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
    seq: Optional[int] = Query(None, description="Sequence number for quantity items"),
    of: Optional[int] = Query(None, description="Total quantity for sequence"),
    db: Session = Depends(get_db)
):
    """
    Generate a QR code image for an item.
    Optionally include sequence info for quantity items.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if not item.qr_code_id:
        item.qr_code_id = f"psms-item-{uuid_lib.uuid4().hex[:8]}"
        db.commit()
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    
    # Build QR data with optional sequence info
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


# Dynamic route with UUID - must come AFTER static routes like /bulk-pdf
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
