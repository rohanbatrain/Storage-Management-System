from minio import Minio
from minio.error import S3Error
from fastapi import UploadFile, HTTPException
import uuid
import os
from datetime import timedelta

from app.config import get_settings

settings = get_settings()

class MinioClient:
    def __init__(self):
        try:
            self.client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure
            )
        except Exception as e:
            print(f"Error connecting to MinIO: {e}")
            self.client = None

    def ensure_bucket(self):
        if not self.client:
            return
        try:
            if not self.client.bucket_exists(settings.minio_bucket_name):
                self.client.make_bucket(settings.minio_bucket_name)
                # Set public policy for read access
                policy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}' % settings.minio_bucket_name
                self.client.set_bucket_policy(settings.minio_bucket_name, policy)
        except Exception as e:
            print(f"Error checking/creating bucket: {e}")
            # Do not re-raise, allow startup without MinIO
            pass

    async def upload_file(self, file: UploadFile) -> str:
        if not self.client:
            raise HTTPException(status_code=503, detail="Storage service unavailable")
        
        try:
            # Generate unique filename
            ext = os.path.splitext(file.filename)[1]
            filename = f"{uuid.uuid4()}{ext}"
            
            # Read file content
            content = await file.read()
            import io
            file_data = io.BytesIO(content)
            
            # Upload
            self.client.put_object(
                settings.minio_bucket_name,
                filename,
                file_data,
                length=len(content),
                content_type=file.content_type
            )
            
            # Return URL
            protocol = "https" if settings.minio_secure else "http"
            return f"{protocol}://{settings.minio_public_endpoint}/{settings.minio_bucket_name}/{filename}"

        except S3Error as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
        finally:
            await file.seek(0)

minio_client = MinioClient()
