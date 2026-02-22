"""
Conftest for local development with PostgreSQL.

This file is ONLY used when running tests locally against a real database.
CI runs use --noconftest and each test file is self-contained with in-memory SQLite.

To use this locally:
    docker-compose up -d db
    cd backend && python -m pytest tests/ -v
"""
import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Only connect to PostgreSQL if DATABASE_URL points to postgres (not SQLite)
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://psms_user:psms_password@localhost:5432/psms_test",
)

if DATABASE_URL.startswith("postgresql"):
    from app.main import app
    from app.database import Base, get_db

    engine = create_engine(DATABASE_URL)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    @pytest.fixture(scope="session", autouse=True)
    def setup_test_db():
        Base.metadata.create_all(bind=engine)
        yield
        Base.metadata.drop_all(bind=engine)

    @pytest.fixture(scope="function")
    def db_session():
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
        with TestClient(app) as test_client:
            yield test_client
        app.dependency_overrides.clear()
