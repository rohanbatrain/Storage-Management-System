import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

def test_upload_image_success(client):
    # Mock minio client
    with patch("app.routers.images.minio_client") as mock_minio:
        mock_minio.upload_file.return_value = "http://localhost:9000/psms-images/test.jpg"
        
        # Create dummy file
        files = {"file": ("test.jpg", b"fake image content", "image/jpeg")}
        
        response = client.post("/api/images/upload", files=files)
        
        assert response.status_code == 200
        assert response.json() == {"url": "http://localhost:9000/psms-images/test.jpg"}

def test_upload_invalid_file_type(client):
    files = {"file": ("test.txt", b"text content", "text/plain")}
    response = client.post("/api/images/upload", files=files)
    assert response.status_code == 400
