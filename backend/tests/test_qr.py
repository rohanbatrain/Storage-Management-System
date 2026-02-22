"""Tests for QR code PDF generation endpoint with customization options.

Uses SQLite in-memory DB for self-contained testing (no PostgreSQL required).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

# Import ALL models so Base.metadata knows about them
from app.models.location import Location  # noqa: F401
from app.models.item import Item  # noqa: F401
from app.models.history import MovementHistory  # noqa: F401
from app.models.outfit import Outfit  # noqa: F401


# SQLite in-memory engine (shared across threads via same connection)
engine = create_engine(
    "sqlite:///file:testqr?mode=memory&cache=shared&uri=true",
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    """Create all tables once for this module."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(setup_db):
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------- Helpers ----------


def _create_location(client, name="Test Location"):
    resp = client.post(
        "/api/locations/",
        json={"name": name, "description": "Test", "kind": "room"},
    )
    assert resp.status_code == 201, f"Failed to create location: {resp.text}"
    return resp.json()["id"]


def _create_item(client, location_id, name="Test Item"):
    resp = client.post(
        "/api/items/",
        json={
            "name": name,
            "description": "Test item",
            "quantity": 1,
            "current_location_id": location_id,
            "permanent_location_id": location_id,
        },
    )
    assert resp.status_code == 201, f"Failed to create item: {resp.text}"
    return resp.json()["id"]


# ==================== Locations PDF ====================


def test_bulk_pdf_default_params(client):
    """Generate PDF with default parameters."""
    loc_id = _create_location(client)
    resp = client.get(f"/api/qr/bulk-pdf?type=locations&ids={loc_id}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert len(resp.content) > 100


def test_bulk_pdf_custom_qr_size(client):
    """Generate PDF with custom QR size (65mm)."""
    loc_id = _create_location(client, "Size Test")
    resp = client.get(f"/api/qr/bulk-pdf?type=locations&ids={loc_id}&qr_size=65")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"


def test_bulk_pdf_a4_landscape(client):
    """Generate PDF with A4 page in landscape orientation."""
    loc_id = _create_location(client, "A4 Test")
    resp = client.get(
        f"/api/qr/bulk-pdf?type=locations&ids={loc_id}&page_size=a4&orientation=landscape"
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"


def test_bulk_pdf_custom_columns(client):
    """Generate PDF with 2 columns."""
    loc_id = _create_location(client, "Column Test")
    resp = client.get(f"/api/qr/bulk-pdf?type=locations&ids={loc_id}&columns=2")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"


def test_bulk_pdf_no_labels(client):
    """Generate PDF without labels."""
    loc_id = _create_location(client, "No Label")
    resp = client.get(
        f"/api/qr/bulk-pdf?type=locations&ids={loc_id}&show_labels=false"
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"


def test_bulk_pdf_with_border_and_id(client):
    """Generate PDF with borders and ID text."""
    loc_id = _create_location(client, "Border Test")
    resp = client.get(
        f"/api/qr/bulk-pdf?type=locations&ids={loc_id}&include_border=true&include_id=true"
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"


def test_bulk_pdf_all_options(client):
    """Generate PDF with all options set to non-default values."""
    loc_id = _create_location(client, "All Options")
    resp = client.get(
        f"/api/qr/bulk-pdf?type=locations&ids={loc_id}"
        f"&qr_size=40&page_size=a4&orientation=landscape"
        f"&columns=4&show_labels=true&label_font_size=12"
        f"&include_border=true&include_id=true"
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"


def test_bulk_pdf_large_label_font(client):
    """Generate PDF with large label font size."""
    loc_id = _create_location(client, "Big Label")
    resp = client.get(
        f"/api/qr/bulk-pdf?type=locations&ids={loc_id}&label_font_size=14"
    )
    assert resp.status_code == 200


def test_bulk_pdf_small_qr_many_columns(client):
    """Generate PDF with small QR and 6 columns."""
    loc_id = _create_location(client, "Tiny QR")
    resp = client.get(
        f"/api/qr/bulk-pdf?type=locations&ids={loc_id}&qr_size=25&columns=6"
    )
    assert resp.status_code == 200


# ==================== Items PDF ====================


def test_bulk_pdf_items_type(client):
    """Generate PDF for items."""
    loc_id = _create_location(client, "Item Loc")
    item_id = _create_item(client, loc_id, "My Item")
    resp = client.get(f"/api/qr/bulk-pdf?type=items&ids={item_id}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"


def test_bulk_pdf_multiple_items(client):
    """Generate PDF with multiple items."""
    loc_id = _create_location(client, "Multi Loc")
    ids = [_create_item(client, loc_id, f"Item {i}") for i in range(3)]
    ids_str = ",".join(ids)
    resp = client.get(f"/api/qr/bulk-pdf?type=items&ids={ids_str}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"


def test_bulk_pdf_multiple_locations(client):
    """Generate PDF with multiple locations (tests multi-page pagination)."""
    ids = [_create_location(client, f"Loc {i}") for i in range(5)]
    ids_str = ",".join(ids)
    resp = client.get(f"/api/qr/bulk-pdf?type=locations&ids={ids_str}&columns=2")
    assert resp.status_code == 200


# ==================== Error cases ====================


def test_bulk_pdf_invalid_type(client):
    """Invalid type should return 400."""
    resp = client.get("/api/qr/bulk-pdf?type=invalid&ids=abc")
    assert resp.status_code == 400


def test_bulk_pdf_no_ids(client):
    """Empty IDs should return 400."""
    resp = client.get("/api/qr/bulk-pdf?type=locations&ids=")
    assert resp.status_code == 400


def test_bulk_pdf_nonexistent_ids(client):
    """Non-existent UUIDs should return 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = client.get(f"/api/qr/bulk-pdf?type=locations&ids={fake_id}")
    assert resp.status_code == 404


def test_bulk_pdf_invalid_page_size(client):
    """Invalid page_size should return 400."""
    loc_id = _create_location(client, "Bad Page")
    resp = client.get(
        f"/api/qr/bulk-pdf?type=locations&ids={loc_id}&page_size=tabloid"
    )
    assert resp.status_code == 400


def test_bulk_pdf_invalid_orientation(client):
    """Invalid orientation should return 400."""
    loc_id = _create_location(client, "Bad Orient")
    resp = client.get(
        f"/api/qr/bulk-pdf?type=locations&ids={loc_id}&orientation=diagonal"
    )
    assert resp.status_code == 400
