"""
Basic API endpoint tests — self-contained with in-memory SQLite.

Run with:
    cd backend && python -m pytest tests/test_api.py -v --noconftest
"""
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

# ---------------------------------------------------------------------------
# Bootstrap in-memory SQLite BEFORE importing app (overrides config)
# ---------------------------------------------------------------------------
_tmp_dir = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = "sqlite:///file::memory:?cache=shared"
os.environ["UPLOAD_DIR"] = os.path.join(_tmp_dir, "uploads")
os.makedirs(os.environ["UPLOAD_DIR"], exist_ok=True)

from app.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.database import Base, engine, get_db  # noqa: E402
from app.main import app  # noqa: E402

TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


@pytest.fixture(autouse=True)
def db_session():
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
# Tests
# ---------------------------------------------------------------------------

def test_read_main(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "version" in response.json()


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_create_location(client):
    response = client.post(
        "/api/locations/",
        json={"name": "Test Location", "description": "A test location", "kind": "room"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Location"
    assert "id" in data

    loc_id = data["id"]
    response = client.delete(f"/api/locations/{loc_id}")
    assert response.status_code == 204


def test_create_item(client):
    loc_resp = client.post(
        "/api/locations/", json={"name": "Item Location", "kind": "room"}
    )
    assert loc_resp.status_code == 201
    loc_id = loc_resp.json()["id"]

    response = client.post(
        "/api/items/",
        json={
            "name": "Test Item",
            "description": "A test item",
            "quantity": 1,
            "current_location_id": loc_id,
            "permanent_location_id": loc_id,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Item"
    assert data["permanent_location_id"] == loc_id
