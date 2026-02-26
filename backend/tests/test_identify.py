"""Tests for Visual Lens identify endpoints.

Self-contained — works with both SQLite (in-memory) and PostgreSQL.
Mocks the feature extractor so no ONNX model download is required.

Run with:
    # SQLite (no DB needed):
    # PostgreSQL (Docker):
    docker compose exec backend pytest tests/test_identify.py -v
"""

import os
import io
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from uuid import uuid4
from PIL import Image

# 1. Force environment variables so any generic code sees test DB
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["POSTGRES_USER"] = "test"
os.environ["POSTGRES_PASSWORD"] = "test"
os.environ["POSTGRES_DB"] = "test"

# 2. Setup SQLite Engine
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Import app modules, patching `create_engine` just in case `app.database` tries to connect
with patch("app.database.create_engine", return_value=engine), patch("app.database.SessionLocal", TestSession):
    from app.database import Base, get_db
    from app.main import app
    from app.models.item import Item
    from app.models.location import Location
    from app.models.item_embedding import ItemEmbedding
    from app.models.history import MovementHistory  # noqa: F401
    from app.models.outfit import Outfit  # noqa: F401


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------
DUMMY_VECTOR = [0.01] * 512  # CLIP vit-b-32 outputs 512-d embeddings


def _mock_extract_features(image_file):
    """Return a deterministic dummy vector instead of running ONNX."""
    return DUMMY_VECTOR


def _mock_initialize_model():
    """No-op model init for tests."""
    pass


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module", autouse=True)
def _setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSession(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    def _override():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _dummy_image(color="red") -> bytes:
    img = Image.new("RGB", (224, 224), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _create_location(client: TestClient, name="Test Loc"):
    resp = client.post("/api/locations/", json={"name": name, "kind": "room"})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _create_item(client: TestClient, loc_id: str, name="Test Item"):
    resp = client.post(
        "/api/items/",
        json={
            "name": name,
            "quantity": 1,
            "current_location_id": loc_id,
            "permanent_location_id": loc_id,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
@patch("app.routers.identify.initialize_model", _mock_initialize_model)
def test_identify_status(client):
    """GET /api/identify/status should return model readiness info."""
    resp = client.get("/api/identify/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "model_ready" in data
    assert "enrolled_items" in data
    assert "total_reference_images" in data


@patch("app.routers.identify.extract_features", _mock_extract_features)
def test_identify_no_enrollments(client):
    """POST /api/identify with empty DB should return no matches."""
    img = _dummy_image()
    resp = client.post(
        "/api/identify",
        files={"file": ("test.jpg", img, "image/jpeg")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "matches" in data
    assert len(data["matches"]) == 0


@patch("app.routers.identify.extract_features", _mock_extract_features)
def test_enroll_item(client):
    """POST /api/identify/enroll/{item_id} should store an embedding."""
    loc_id = _create_location(client, "Enroll Loc")
    item_id = _create_item(client, loc_id, "Enroll Item")

    img = _dummy_image("blue")
    resp = client.post(
        f"/api/identify/enroll/{item_id}",
        files={"file": ("ref.jpg", img, "image/jpeg")},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "enrollment_id" in data
    assert "image_url" in data


@patch("app.routers.identify.extract_features", _mock_extract_features)
def test_unenroll_item(client):
    """DELETE /api/identify/enroll/{item_id} should remove enrollments."""
    loc_id = _create_location(client, "Unenroll Loc")
    item_id = _create_item(client, loc_id, "Unenroll Item")

    # Enroll first
    img = _dummy_image("green")
    enroll_resp = client.post(
        f"/api/identify/enroll/{item_id}",
        files={"file": ("ref.jpg", img, "image/jpeg")},
    )
    assert enroll_resp.status_code == 200

    # Now unenroll
    resp = client.delete(f"/api/identify/enroll/{item_id}")
    assert resp.status_code == 200


def test_unenroll_nonexistent(client):
    """DELETE /api/identify/enroll/{random_id} should return 404."""
    resp = client.delete(f"/api/identify/enroll/{uuid4()}")
    assert resp.status_code == 404
