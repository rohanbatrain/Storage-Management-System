from pydantic_settings import BaseSettings
from functools import lru_cache


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
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
