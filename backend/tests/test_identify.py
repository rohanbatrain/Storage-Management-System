import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from uuid import uuid4
import io
from PIL import Image

from app.database import Base, get_db
from app.main import app
from app.models.item import Item
from app.models.location import Location
from app.models.item_embedding import ItemEmbedding


DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///file::memory:?cache=shared")
engine = create_engine(DATABASE_URL)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def identify_setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def identify_db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSession(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def identify_client(identify_db_session):
    def override_get_db():
        try:
            yield identify_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# Add a dummy image generator for testing
def create_dummy_image(color="red") -> bytes:
    img = Image.new("RGB", (224, 224), color=color)
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    return img_byte_arr.getvalue()


@pytest.fixture
def test_location(identify_db_session: Session):
    loc = Location(name="Test Visual Location", parent_id=None, kind="storage")
    identify_db_session.add(loc)
    identify_db_session.commit()
    return loc


@pytest.fixture
def test_item(identify_db_session: Session, test_location: Location):
    item = Item(
        name="Test Visual Item", 
        current_location_id=test_location.id,
        quantity=1
    )
    identify_db_session.add(item)
    identify_db_session.commit()
    return item


@pytest.fixture
def enrolled_item(identify_db_session: Session, test_item: Item):
    """An item that has already been enrolled with a dummy vector."""
    # Create a dummy 1280-d vector
    dummy_vector = [0.01] * 1280
    
    embedding = ItemEmbedding(
        item_id=test_item.id,
        image_url="/static/uploads/dummy.jpg",
        embedding=dummy_vector
    )
    identify_db_session.add(embedding)
    identify_db_session.commit()
    return test_item, embedding


def test_identify_status(identify_client: TestClient):
    response = identify_client.get("/api/v1/identify/status")
    assert response.status_code == 200
    data = response.json()
    assert "model_ready" in data
    assert "enrolled_items" in data
    assert "total_reference_images" in data


def test_enroll_item(identify_client: TestClient, test_item: Item, identify_db_session: Session):
    # Create a dummy image file
    img_bytes = create_dummy_image()
    files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
    
    response = identify_client.post(f"/api/v1/identify/enroll/{test_item.id}", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "enrollment_id" in data
    assert "image_url" in data
    
    # Verify in DB
    embeddings = identify_db_session.query(ItemEmbedding).filter(ItemEmbedding.item_id == test_item.id).all()
    assert len(embeddings) == 1
    assert embeddings[0].image_url == data["image_url"]
    assert len(embeddings[0].embedding) > 0


def test_identify_no_enrollments(identify_client: TestClient):
    # Test identifying when DB is empty
    img_bytes = create_dummy_image()
    files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
    
    response = identify_client.post("/api/v1/identify", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "matches" in data
    assert len(data["matches"]) == 0
    assert "message" in data


def test_unenroll_item(identify_client: TestClient, enrolled_item: tuple[Item, ItemEmbedding], identify_db_session: Session):
    item, _ = enrolled_item
    
    response = identify_client.delete(f"/api/v1/identify/enroll/{item.id}")
    assert response.status_code == 200
    
    # Verify removed from DB
    embeddings = identify_db_session.query(ItemEmbedding).filter(ItemEmbedding.item_id == item.id).all()
    assert len(embeddings) == 0


def test_unenroll_nonexistent(identify_client: TestClient):
    response = identify_client.delete(f"/api/v1/identify/enroll/{uuid4()}")
    assert response.status_code == 404
