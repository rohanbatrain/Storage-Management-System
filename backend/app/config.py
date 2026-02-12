from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "postgresql://psms_user:psms_password@localhost:5432/psms"
    
    # Application
    app_name: str = "Personal Storage Management System"
    debug: bool = True
    secret_key: str = "dev-secret-key-change-in-production"
    
    # API
    api_v1_prefix: str = "/api"
    cors_origins: List[str] = ["*"]

    # MinIO
    minio_endpoint: str = "minio:9000"
    minio_public_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket_name: str = "psms-images"
    minio_secure: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
