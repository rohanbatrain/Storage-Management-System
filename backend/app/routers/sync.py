"""
Sync router for cross-device LAN synchronization.

Provides endpoints for peer discovery, pulling changes, and pushing changes.
Uses last-write-wins conflict resolution based on the updated_at timestamp.
"""
import platform
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.location import Location
from app.models.item import Item
from app.models.history import MovementHistory
from app.models.outfit import Outfit
from app.schemas.sync import (
    SyncStatus,
    SyncPullRequest,
    SyncPullResponse,
    SyncPushRequest,
    SyncPushResponse,
    SyncRecordBase,
)

router = APIRouter(prefix="/sync", tags=["sync"])

# Persistent device ID — generated once per install, stored in the DB dir
_device_id: Optional[str] = None


def _get_device_id() -> str:
    """Return a stable device ID for this installation."""
    global _device_id
    if _device_id:
        return _device_id

    from app.config import get_settings

    settings = get_settings()
    import os
    from pathlib import Path

    # Store device ID next to the database
    if settings.data_dir:
        id_file = Path(settings.data_dir) / ".device_id"
    else:
        id_file = Path.home() / ".sms" / ".device_id"

    id_file.parent.mkdir(parents=True, exist_ok=True)

    if id_file.exists():
        _device_id = id_file.read_text().strip()
    else:
        _device_id = str(uuid.uuid4())
        id_file.write_text(_device_id)

    return _device_id


# ── Table registry ──────────────────────────────────────────────────────────
# Maps table name → SQLAlchemy model class for generic sync operations
TABLE_MODELS = {
    "locations": Location,
    "items": Item,
    "movement_history": MovementHistory,
    "outfits": Outfit,
}

# Columns to skip when serialising (relationships, not real columns)
_SKIP_COLUMNS = {"parent", "children", "items", "permanent_items",
                  "current_location", "permanent_location",
                  "movement_history", "item", "from_location", "to_location"}


def _row_to_dict(row) -> dict:
    """Convert a SQLAlchemy model instance to a plain dict (columns only)."""
    d = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, datetime):
            d[col.name] = val.isoformat()
        elif isinstance(val, uuid.UUID):
            d[col.name] = str(val)
        elif hasattr(val, "value"):  # Enum
            d[col.name] = val.value
        else:
            d[col.name] = val
    return d


def _parse_value(col, raw):
    """Coerce a raw JSON value back to the type expected by the column."""
    import enum as _enum
    from app.models.compatibility import GUID

    if raw is None:
        return None

    col_type = type(col.type)

    # UUID / GUID columns
    if col_type is GUID:
        return uuid.UUID(raw) if raw else None

    # DateTime columns
    from sqlalchemy import DateTime
    if isinstance(col.type, DateTime):
        if isinstance(raw, str):
            return datetime.fromisoformat(raw)
        return raw

    # Enum columns
    from sqlalchemy import Enum as SQLEnum
    if isinstance(col.type, SQLEnum):
        enum_class = col.type.enum_class
        if enum_class and raw:
            return enum_class(raw)
        return raw

    return raw


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/status", response_model=SyncStatus)
def sync_status(db: Session = Depends(get_db)):
    """Return this device's sync status for peer discovery."""
    device_id = _get_device_id()

    # Find the latest updated_at across all tables
    latest = None
    counts = {}
    for table_name, model in TABLE_MODELS.items():
        count = db.query(func.count(model.id)).scalar() or 0
        counts[table_name] = count

        if hasattr(model, "updated_at"):
            ts = db.query(func.max(model.updated_at)).scalar()
            if ts and (latest is None or ts > latest):
                latest = ts

    return SyncStatus(
        device_id=device_id,
        device_name=platform.node(),
        last_modified=latest,
        record_counts=counts,
    )


@router.post("/pull", response_model=SyncPullResponse)
def sync_pull(req: SyncPullRequest, db: Session = Depends(get_db)):
    """
    Return all records modified after `since`.
    If `since` is None, return everything (full sync).
    Order: locations first (so peer can insert parents before children).
    """
    device_id = _get_device_id()
    records = []

    # Process tables in dependency order
    ordered_tables = ["locations", "items", "movement_history", "outfits"]

    for table_name in ordered_tables:
        model = TABLE_MODELS[table_name]
        query = db.query(model)

        if req.since and hasattr(model, "updated_at"):
            query = query.filter(model.updated_at > req.since)

        for row in query.all():
            data = _row_to_dict(row)
            records.append(SyncRecordBase(
                table=table_name,
                id=str(data.get("id", "")),
                data=data,
                updated_at=datetime.fromisoformat(data["updated_at"]) if "updated_at" in data else datetime.utcnow(),
                device_id=data.get("device_id"),
            ))

    return SyncPullResponse(
        device_id=device_id,
        records=records,
        sync_timestamp=datetime.utcnow(),
    )


@router.post("/push", response_model=SyncPushResponse)
def sync_push(req: SyncPushRequest, db: Session = Depends(get_db)):
    """
    Accept records from a peer device and merge them.
    
    Conflict resolution: last-write-wins based on updated_at.
    - If record doesn't exist locally → INSERT
    - If record exists and peer's updated_at > local → UPDATE
    - If record exists and local is newer → SKIP (conflict resolved, local wins)
    """
    device_id = _get_device_id()
    accepted = 0
    rejected = 0
    conflicts = 0

    for rec in req.records:
        model = TABLE_MODELS.get(rec.table)
        if model is None:
            rejected += 1
            continue

        record_id = rec.data.get("id")
        if not record_id:
            rejected += 1
            continue

        # Try to find existing record
        try:
            parsed_id = uuid.UUID(record_id)
        except (ValueError, TypeError):
            rejected += 1
            continue

        existing = db.query(model).filter(model.id == parsed_id).first()

        if existing is None:
            # INSERT — new record from peer
            try:
                new_row = model()
                for col in model.__table__.columns:
                    if col.name in rec.data:
                        setattr(new_row, col.name, _parse_value(col, rec.data[col.name]))
                db.add(new_row)
                db.flush()
                accepted += 1
            except Exception:
                db.rollback()
                rejected += 1
        else:
            # MERGE — compare timestamps
            local_ts = getattr(existing, "updated_at", None)
            peer_ts = rec.updated_at

            # Normalise to naive UTC for comparison
            if local_ts and local_ts.tzinfo:
                local_ts = local_ts.replace(tzinfo=None)
            if peer_ts and peer_ts.tzinfo:
                peer_ts = peer_ts.replace(tzinfo=None)

            if local_ts and peer_ts and local_ts >= peer_ts:
                # Local is newer or same — skip
                conflicts += 1
                continue

            # Peer is newer — update
            try:
                for col in model.__table__.columns:
                    if col.name == "id":
                        continue  # Don't overwrite PK
                    if col.name in rec.data:
                        setattr(existing, col.name, _parse_value(col, rec.data[col.name]))
                db.flush()
                accepted += 1
                conflicts += 1  # Count as conflict resolved
            except Exception:
                db.rollback()
                rejected += 1

    db.commit()

    return SyncPushResponse(
        accepted=accepted,
        rejected=rejected,
        conflicts=conflicts,
        sync_timestamp=datetime.utcnow(),
    )
