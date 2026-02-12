from fastapi import APIRouter, UploadFile, File, HTTPException
from app.utils.minio_client import minio_client

router = APIRouter(prefix="/images", tags=["Images"])

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image file and return its URL.
    """
    # Basic validation
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Check bucket existence on first upload (lazy init)
        # In production, this should be done at startup
        # minio_client.ensure_bucket() 
        # For now, let's assume createbuckets container did its job or we do it here
        # But ensure_bucket is synchronous and might block loop if not careful, 
        # though minio library is thread-safe.
        # Let's just try upload.
        
        url = await minio_client.upload_file(file)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
