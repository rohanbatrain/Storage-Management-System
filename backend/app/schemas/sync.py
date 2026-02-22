"""Schemas for cross-device LAN synchronization."""
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime


class SyncStatus(BaseModel):
    """Status response for this device's sync state."""
    device_id: str
    device_name: str
    last_modified: Optional[datetime] = None
    record_counts: Dict[str, int] = {}


class SyncRecordBase(BaseModel):
    """A single record transported during sync, table-agnostic."""
    table: str
    id: str  # UUID as string
    data: Dict[str, Any]
    updated_at: datetime
    device_id: Optional[str] = None


class SyncPullRequest(BaseModel):
    """Request to pull changes since a given timestamp."""
    since: Optional[datetime] = None  # None = full sync
    device_id: str  # Requesting device


class SyncPullResponse(BaseModel):
    """Response containing records modified since the requested timestamp."""
    device_id: str
    records: List[SyncRecordBase] = []
    sync_timestamp: datetime  # Server time at the moment of this response
    has_more: bool = False


class SyncPushRequest(BaseModel):
    """Request to push changes from a peer device."""
    device_id: str  # Sending device
    records: List[SyncRecordBase] = []


class SyncPushResponse(BaseModel):
    """Response after merging pushed records."""
    accepted: int = 0
    rejected: int = 0
    conflicts: int = 0  # Resolved via last-write-wins
    sync_timestamp: datetime
