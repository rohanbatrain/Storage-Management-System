"""
Data Export & Import Router
Provides endpoints for exporting/importing all application data.
Supports both JSON-only and full archive (.zip with uploads) formats.
"""
import io
import os
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.history import ActionType, MovementHistory
from app.models.item import Item, ItemType
from app.models.location import Location, LocationKind
from app.models.outfit import Outfit

router = APIRouter(prefix="/export", tags=["Export & Import"])
settings = get_settings()

EXPORT_VERSION = "2.0"

# ---------------------------------------------------------------------------
# Serializers – every model field is included for lossless round-trip
# ---------------------------------------------------------------------------

def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


def _str(val) -> str | None:
    return str(val) if val is not None else None


def serialize_location(loc: Location) -> Dict[str, Any]:
    return {
        "id": _str(loc.id),
        "name": loc.name,
        "kind": loc.kind.value if loc.kind else None,
        "description": loc.description,
        "qr_code_id": loc.qr_code_id,
        "parent_id": _str(loc.parent_id),
        "aliases": loc.aliases or [],
        "image_url": loc.image_url,
        "is_wardrobe": loc.is_wardrobe,
        "default_clothing_category": loc.default_clothing_category,
        "device_id": loc.device_id,
        "created_at": _iso(loc.created_at),
        "updated_at": _iso(loc.updated_at),
    }


def serialize_item(item: Item) -> Dict[str, Any]:
    return {
        "id": _str(item.id),
        "name": item.name,
        "description": item.description,
        "quantity": item.quantity,
        "tags": item.tags or [],
        "item_type": item.item_type.value if item.item_type else "generic",
        "item_data": item.item_data or {},
        "image_url": item.image_url,
        "qr_code_id": item.qr_code_id,
        "current_location_id": _str(item.current_location_id),
        "permanent_location_id": _str(item.permanent_location_id),
        "is_temporary_placement": item.is_temporary_placement,
        "last_moved_at": _iso(item.last_moved_at),
        # Loan tracking
        "is_lent": item.is_lent,
        "lent_to": item.lent_to,
        "lent_at": _iso(item.lent_at),
        "due_date": _iso(item.due_date),
        "lent_notes": item.lent_notes,
        # Lost tracking
        "is_lost": item.is_lost,
        "lost_at": _iso(item.lost_at),
        "lost_notes": item.lost_notes,
        # Meta
        "device_id": item.device_id,
        "created_at": _iso(item.created_at),
        "updated_at": _iso(item.updated_at),
    }


def serialize_history(hist: MovementHistory) -> Dict[str, Any]:
    return {
        "id": _str(hist.id),
        "item_id": _str(hist.item_id),
        "from_location_id": _str(hist.from_location_id),
        "to_location_id": _str(hist.to_location_id),
        "action": hist.action.value if hist.action else None,
        "notes": hist.notes,
        "moved_at": _iso(hist.moved_at),
        "updated_at": _iso(hist.updated_at),
        "device_id": hist.device_id,
    }


def serialize_outfit(outfit: Outfit) -> Dict[str, Any]:
    return {
        "id": _str(outfit.id),
        "name": outfit.name,
        "description": outfit.description,
        "item_ids": [str(i) for i in (outfit.item_ids or [])],
        "tags": outfit.tags or [],
        "rating": outfit.rating,
        "wear_count": outfit.wear_count,
        "last_worn_at": _iso(outfit.last_worn_at),
        "device_id": outfit.device_id,
        "created_at": _iso(outfit.created_at),
        "updated_at": _iso(outfit.updated_at),
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_export_dict(db: Session) -> Dict[str, Any]:
    """Build the full JSON export payload from the database."""
    locations = db.query(Location).all()
    items = db.query(Item).all()
    history = db.query(MovementHistory).order_by(MovementHistory.moved_at.desc()).all()
    outfits = db.query(Outfit).all()

    return {
        "export_version": EXPORT_VERSION,
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


def _get_upload_dir() -> Path:
    """Return the resolved upload directory."""
    return Path(settings.upload_dir)


def _parse_datetime(val: str | None):
    """Parse an ISO datetime string, returning None on failure."""
    if not val:
        return None
    try:
        return datetime.fromisoformat(val)
    except (ValueError, TypeError):
        return None


def _wipe_all_tables(db: Session):
    """Delete all rows from every application table in FK-safe order."""
    db.query(MovementHistory).delete()
    db.query(Outfit).delete()
    db.query(Item).delete()
    db.query(Location).delete()
    db.flush()


def _topological_sort_locations(locations_data: List[Dict]) -> List[Dict]:
    """
    Sort locations so parents come before children.
    This ensures we can insert them without FK violations.
    """
    by_id = {loc["id"]: loc for loc in locations_data}
    visited = set()
    result = []

    def visit(loc_id):
        if loc_id in visited or loc_id not in by_id:
            return
        loc = by_id[loc_id]
        parent = loc.get("parent_id")
        if parent and parent in by_id:
            visit(parent)
        visited.add(loc_id)
        result.append(loc)

    for loc_id in by_id:
        visit(loc_id)

    return result


def _restore_from_dict(db: Session, data: Dict[str, Any]) -> Dict[str, int]:
    """
    Restore database from an export dict.
    Assumes tables have already been wiped.
    Returns counts of restored records.
    """
    counts = {"locations": 0, "items": 0, "outfits": 0, "history": 0}

    # --- Locations (topologically sorted) ---
    sorted_locations = _topological_sort_locations(data.get("locations", []))
    for loc_data in sorted_locations:
        loc = Location(
            id=UUID(loc_data["id"]),
            name=loc_data["name"],
            kind=LocationKind(loc_data["kind"]) if loc_data.get("kind") else LocationKind.CONTAINER,
            description=loc_data.get("description"),
            qr_code_id=loc_data.get("qr_code_id"),
            parent_id=UUID(loc_data["parent_id"]) if loc_data.get("parent_id") else None,
            aliases=loc_data.get("aliases", []),
            image_url=loc_data.get("image_url"),
            is_wardrobe=loc_data.get("is_wardrobe", False),
            default_clothing_category=loc_data.get("default_clothing_category"),
            device_id=loc_data.get("device_id"),
            created_at=_parse_datetime(loc_data.get("created_at")) or datetime.utcnow(),
            updated_at=_parse_datetime(loc_data.get("updated_at")) or datetime.utcnow(),
        )
        db.add(loc)
        counts["locations"] += 1
    db.flush()

    # --- Items ---
    for item_data in data.get("items", []):
        item = Item(
            id=UUID(item_data["id"]),
            name=item_data["name"],
            description=item_data.get("description"),
            quantity=item_data.get("quantity", 1),
            tags=item_data.get("tags", []),
            item_type=ItemType(item_data.get("item_type", "generic")),
            item_data=item_data.get("item_data", {}),
            image_url=item_data.get("image_url"),
            qr_code_id=item_data.get("qr_code_id"),
            current_location_id=UUID(item_data["current_location_id"]) if item_data.get("current_location_id") else None,
            permanent_location_id=UUID(item_data["permanent_location_id"]) if item_data.get("permanent_location_id") else None,
            is_temporary_placement=item_data.get("is_temporary_placement", False),
            last_moved_at=_parse_datetime(item_data.get("last_moved_at")),
            # Loan
            is_lent=item_data.get("is_lent", False),
            lent_to=item_data.get("lent_to"),
            lent_at=_parse_datetime(item_data.get("lent_at")),
            due_date=_parse_datetime(item_data.get("due_date")),
            lent_notes=item_data.get("lent_notes"),
            # Lost
            is_lost=item_data.get("is_lost", False),
            lost_at=_parse_datetime(item_data.get("lost_at")),
            lost_notes=item_data.get("lost_notes"),
            # Meta
            device_id=item_data.get("device_id"),
            created_at=_parse_datetime(item_data.get("created_at")) or datetime.utcnow(),
            updated_at=_parse_datetime(item_data.get("updated_at")) or datetime.utcnow(),
        )
        db.add(item)
        counts["items"] += 1
    db.flush()

    # --- Outfits ---
    for outfit_data in data.get("outfits", []):
        outfit = Outfit(
            id=UUID(outfit_data["id"]),
            name=outfit_data["name"],
            description=outfit_data.get("description"),
            tags=outfit_data.get("tags", []),
            item_ids=outfit_data.get("item_ids", []),
            rating=outfit_data.get("rating"),
            wear_count=outfit_data.get("wear_count", 0),
            last_worn_at=_parse_datetime(outfit_data.get("last_worn_at")),
            device_id=outfit_data.get("device_id"),
            created_at=_parse_datetime(outfit_data.get("created_at")) or datetime.utcnow(),
            updated_at=_parse_datetime(outfit_data.get("updated_at")) or datetime.utcnow(),
        )
        db.add(outfit)
        counts["outfits"] += 1
    db.flush()

    # --- Movement History ---
    for hist_data in data.get("movement_history", []):
        hist = MovementHistory(
            id=UUID(hist_data["id"]),
            item_id=UUID(hist_data["item_id"]) if hist_data.get("item_id") else None,
            from_location_id=UUID(hist_data["from_location_id"]) if hist_data.get("from_location_id") else None,
            to_location_id=UUID(hist_data["to_location_id"]) if hist_data.get("to_location_id") else None,
            action=ActionType(hist_data["action"]) if hist_data.get("action") else ActionType.PLACED,
            notes=hist_data.get("notes"),
            moved_at=_parse_datetime(hist_data.get("moved_at")) or datetime.utcnow(),
            updated_at=_parse_datetime(hist_data.get("updated_at")) or datetime.utcnow(),
            device_id=hist_data.get("device_id"),
        )
        db.add(hist)
        counts["history"] += 1
    db.flush()

    return counts


# ---------------------------------------------------------------------------
# Export Endpoints
# ---------------------------------------------------------------------------

@router.get("/full")
def export_all_data(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Export all application data as JSON.
    Use this for periodic backups or lightweight device migration (no images).
    """
    export_data = _build_export_dict(db)
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename=psms_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        },
    )


@router.get("/archive")
def export_archive(db: Session = Depends(get_db)):
    """
    Export a complete .zip archive containing:
      - data.json  (all database records)
      - uploads/   (all uploaded image files)

    This is the recommended format for full device migration.
    """
    import json

    export_data = _build_export_dict(db)
    upload_dir = _get_upload_dir()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Write data.json
        zf.writestr("data.json", json.dumps(export_data, indent=2, default=str))

        # Add every file from the uploads directory
        if upload_dir.exists():
            for file_path in upload_dir.iterdir():
                if file_path.is_file():
                    zf.write(file_path, f"uploads/{file_path.name}")

    buf.seek(0)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=psms_archive_{timestamp}.zip"
        },
    )


@router.get("/summary")
def export_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get a summary of exportable data without performing a full export."""
    locations_count = db.query(Location).count()
    items_count = db.query(Item).count()
    outfits_count = db.query(Outfit).count()

    # Count uploaded files
    upload_dir = _get_upload_dir()
    uploads_count = 0
    uploads_size_bytes = 0
    if upload_dir.exists():
        for f in upload_dir.iterdir():
            if f.is_file():
                uploads_count += 1
                uploads_size_bytes += f.stat().st_size

    return {
        "locations_count": locations_count,
        "items_count": items_count,
        "outfits_count": outfits_count,
        "uploads_count": uploads_count,
        "uploads_size_mb": round(uploads_size_bytes / (1024 * 1024), 2),
        "export_endpoint": "/api/export/full",
        "archive_endpoint": "/api/export/archive",
    }


# ---------------------------------------------------------------------------
# Import Endpoints
# ---------------------------------------------------------------------------

@router.post("/import/archive")
async def import_archive(
    file: UploadFile = File(...),
    confirm_replace: bool = Query(False, description="Must be true to confirm data replacement"),
    db: Session = Depends(get_db),
):
    """
    Import a complete .zip archive (exported via /export/archive).
    This REPLACES all existing data — intended for device migration.

    The archive must contain a `data.json` file at the root level.
    Optionally contains an `uploads/` directory with image files.

    Set `confirm_replace=true` to confirm you want to wipe existing data.
    """
    import json

    if not confirm_replace:
        raise HTTPException(
            status_code=400,
            detail="Import will replace ALL existing data. Set confirm_replace=true to confirm.",
        )

    # Read the uploaded file
    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {e}")

    # Validate it's a valid zip
    if not zipfile.is_zipfile(io.BytesIO(contents)):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid ZIP archive.")

    try:
        with zipfile.ZipFile(io.BytesIO(contents), "r") as zf:
            # Validate structure
            names = zf.namelist()
            if "data.json" not in names:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid archive: missing data.json at root level.",
                )

            # Parse data.json
            try:
                data = json.loads(zf.read("data.json"))
            except (json.JSONDecodeError, KeyError) as e:
                raise HTTPException(status_code=400, detail=f"Invalid data.json: {e}")

            # Wipe existing data and restore
            _wipe_all_tables(db)
            counts = _restore_from_dict(db, data)

            # Restore uploads
            upload_dir = _get_upload_dir()
            uploads_restored = 0
            upload_entries = [n for n in names if n.startswith("uploads/") and not n.endswith("/")]

            if upload_entries:
                # Clear existing uploads
                if upload_dir.exists():
                    shutil.rmtree(upload_dir)
                upload_dir.mkdir(parents=True, exist_ok=True)

                for entry in upload_entries:
                    filename = os.path.basename(entry)
                    if filename:
                        dest = upload_dir / filename
                        dest.write_bytes(zf.read(entry))
                        uploads_restored += 1

            db.commit()

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")

    return {
        "status": "success",
        "message": "Data restored successfully",
        "restored": {
            **counts,
            "uploads": uploads_restored,
        },
    }


@router.post("/import/json")
async def import_json(
    data: Dict[str, Any],
    confirm_replace: bool = Query(False, description="Must be true to confirm data replacement"),
    db: Session = Depends(get_db),
):
    """
    Import data from a JSON payload (same format as /export/full output).
    This REPLACES all existing database data — no file handling.

    Set `confirm_replace=true` to confirm you want to wipe existing data.
    """
    if not confirm_replace:
        raise HTTPException(
            status_code=400,
            detail="Import will replace ALL existing data. Set confirm_replace=true to confirm.",
        )

    try:
        _wipe_all_tables(db)
        counts = _restore_from_dict(db, data)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")

    return {
        "status": "success",
        "message": "Data restored successfully",
        "restored": counts,
    }
