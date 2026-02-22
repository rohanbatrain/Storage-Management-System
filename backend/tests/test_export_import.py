"""
Tests for Export / Import endpoints.

Uses an in-memory SQLite database so no external services are needed.
Run with:
    cd backend && python -m pytest tests/test_export_import.py -v --noconftest
"""
import io
import json
import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ---------------------------------------------------------------------------
# Bootstrap in-memory SQLite before importing app (to override config)
# ---------------------------------------------------------------------------
_tmp_dir = tempfile.mkdtemp()
_upload_dir = os.path.join(_tmp_dir, "uploads")
os.makedirs(_upload_dir, exist_ok=True)

os.environ["DATABASE_URL"] = "sqlite:///file::memory:?cache=shared"
os.environ["UPLOAD_DIR"] = _upload_dir

# Clear cached settings so our env overrides take effect
from app.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.database import Base, engine, get_db  # noqa: E402
from app.main import app  # noqa: E402

TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)


@pytest.fixture(autouse=True)
def db_session():
    """Provide a clean DB session per test by rolling back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSession(bind=connection)

    def _override():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    yield session
    session.close()
    transaction.rollback()
    connection.close()
    app.dependency_overrides.clear()


@pytest.fixture
def client(db_session):
    return TestClient(app)


# ---------------------------------------------------------------------------
# Helper: seed sample data
# ---------------------------------------------------------------------------
def _seed_data(client: TestClient):
    """Create a small dataset: 2 locations (parent/child), 1 item, 1 outfit."""
    # Parent location
    parent = client.post(
        "/api/locations/",
        json={"name": "Bedroom", "kind": "room", "description": "Main bedroom"},
    )
    assert parent.status_code == 201, parent.text
    parent_id = parent.json()["id"]

    # Child location
    child = client.post(
        "/api/locations/",
        json={"name": "Wardrobe", "kind": "furniture", "parent_id": parent_id},
    )
    assert child.status_code == 201, child.text
    child_id = child.json()["id"]

    # Item
    item = client.post(
        "/api/items/",
        json={
            "name": "Blue Shirt",
            "description": "Favourite shirt",
            "quantity": 1,
            "current_location_id": child_id,
        },
    )
    assert item.status_code == 201, item.text
    item_id = item.json()["id"]

    return {"parent_id": parent_id, "child_id": child_id, "item_id": item_id}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestExportFull:
    def test_export_all_fields(self, client):
        """Export JSON includes all model fields."""
        ids = _seed_data(client)
        resp = client.get("/api/export/full")
        assert resp.status_code == 200
        data = resp.json()

        assert data["export_version"] == "2.0"
        assert data["statistics"]["locations_count"] == 2
        assert data["statistics"]["items_count"] == 1

        # Check that serialized location has all fields
        loc_fields = set(data["locations"][0].keys())
        expected_loc = {
            "id", "name", "kind", "description", "qr_code_id",
            "parent_id", "aliases", "image_url", "is_wardrobe",
            "default_clothing_category", "device_id", "created_at", "updated_at",
        }
        assert expected_loc.issubset(loc_fields), f"Missing: {expected_loc - loc_fields}"

        # Check item fields
        item_fields = set(data["items"][0].keys())
        expected_item = {
            "id", "name", "description", "quantity", "tags", "item_type",
            "item_data", "image_url", "qr_code_id",
            "current_location_id", "permanent_location_id",
            "is_temporary_placement", "last_moved_at",
            "is_lent", "lent_to", "lent_at", "due_date", "lent_notes",
            "is_lost", "lost_at", "lost_notes",
            "device_id", "created_at", "updated_at",
        }
        assert expected_item.issubset(item_fields), f"Missing: {expected_item - item_fields}"


class TestExportArchive:
    def test_archive_structure(self, client):
        """Archive contains data.json and is a valid zip."""
        _seed_data(client)
        resp = client.get("/api/export/archive")
        assert resp.status_code == 200
        assert "application/zip" in resp.headers["content-type"]

        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        assert "data.json" in zf.namelist()

        data = json.loads(zf.read("data.json"))
        assert data["statistics"]["locations_count"] == 2

    def test_archive_includes_uploads(self, client):
        """Archive bundles uploaded images."""
        _seed_data(client)

        # Place a fake file in uploads dir
        upload_dir = Path(_upload_dir)
        (upload_dir / "test_image.jpg").write_bytes(b"fake-image-data")

        resp = client.get("/api/export/archive")
        assert resp.status_code == 200

        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        assert "uploads/test_image.jpg" in zf.namelist()
        assert zf.read("uploads/test_image.jpg") == b"fake-image-data"

        # Cleanup
        (upload_dir / "test_image.jpg").unlink(missing_ok=True)


class TestImportArchive:
    def test_requires_confirmation(self, client):
        """Import without confirm_replace returns 400."""
        # Create a minimal valid archive
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("data.json", json.dumps({"locations": [], "items": [], "outfits": [], "movement_history": []}))
        buf.seek(0)

        resp = client.post(
            "/api/export/import/archive",
            files={"file": ("backup.zip", buf, "application/zip")},
        )
        assert resp.status_code == 400
        assert "confirm_replace" in resp.json()["detail"]

    def test_invalid_file_rejected(self, client):
        """Non-zip file is rejected."""
        resp = client.post(
            "/api/export/import/archive?confirm_replace=true",
            files={"file": ("backup.txt", io.BytesIO(b"not a zip"), "text/plain")},
        )
        assert resp.status_code == 400
        assert "not a valid ZIP" in resp.json()["detail"]

    def test_missing_data_json_rejected(self, client):
        """Zip without data.json is rejected."""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("readme.txt", "hello")
        buf.seek(0)

        resp = client.post(
            "/api/export/import/archive?confirm_replace=true",
            files={"file": ("backup.zip", buf, "application/zip")},
        )
        assert resp.status_code == 400
        assert "missing data.json" in resp.json()["detail"]

    def test_round_trip(self, client):
        """Export archive → import archive → data matches."""
        _seed_data(client)

        # Export
        export_resp = client.get("/api/export/archive")
        assert export_resp.status_code == 200
        archive_bytes = export_resp.content

        # Import (this wipes then restores)
        resp = client.post(
            "/api/export/import/archive?confirm_replace=true",
            files={"file": ("backup.zip", io.BytesIO(archive_bytes), "application/zip")},
        )
        assert resp.status_code == 200
        result = resp.json()
        assert result["status"] == "success"
        assert result["restored"]["locations"] == 2
        assert result["restored"]["items"] == 1


class TestImportJson:
    def test_json_round_trip(self, client):
        """Export JSON → import JSON → counts match."""
        _seed_data(client)

        # Export
        export_resp = client.get("/api/export/full")
        assert export_resp.status_code == 200
        export_data = export_resp.json()

        # Import
        resp = client.post(
            "/api/export/import/json?confirm_replace=true",
            json=export_data,
        )
        assert resp.status_code == 200
        result = resp.json()
        assert result["status"] == "success"
        assert result["restored"]["locations"] == 2
        assert result["restored"]["items"] == 1

    def test_requires_confirmation(self, client):
        """Import JSON without confirm_replace returns 400."""
        resp = client.post(
            "/api/export/import/json",
            json={"locations": [], "items": [], "outfits": [], "movement_history": []},
        )
        assert resp.status_code == 400


class TestExportSummary:
    def test_summary_includes_upload_info(self, client):
        """Summary endpoint now includes upload stats."""
        _seed_data(client)
        resp = client.get("/api/export/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "uploads_count" in data
        assert "uploads_size_mb" in data
        assert "archive_endpoint" in data
