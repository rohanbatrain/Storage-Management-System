from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import uuid
from pathlib import Path

from app.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("", response_model=dict)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload an image file to local storage.
    Returns the URL to access the file.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")
    await file.seek(0)  # Reset for saving

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / filename

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    finally:
        file.file.close()

    return {"url": f"/static/uploads/{filename}"}


def cleanup_image(image_url: str | None):
    """Delete an uploaded image file if it's a local upload."""
    if image_url and image_url.startswith("/static/uploads/"):
        filename = image_url.split("/")[-1]
        file_path = UPLOAD_DIR / filename
        file_path.unlink(missing_ok=True)
