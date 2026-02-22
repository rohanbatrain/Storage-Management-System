from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "postgresql://psms_user:psms_password@localhost:5432/psms"
    
    # Application
    app_name: str = "Personal Storage Management System"
    debug: bool = False
    secret_key: str = "dev-secret-key-change-in-production"
    
    # API
    api_v1_prefix: str = "/api"
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Upload directory (can be overridden via env var UPLOAD_DIR)
    upload_dir: str = ""
    
    # Internal settings that are computed post-init
    is_frozen: bool = False
    data_dir: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        import sys
        import os
        from pathlib import Path
        
        # Check if running as PyInstaller bundle
        self.is_frozen = getattr(sys, 'frozen', False)
        
        if self.is_frozen:
            # Electron / packaged mode
            home = Path.home()
            app_data = home / ".psms"
            app_data.mkdir(parents=True, exist_ok=True)
            self.data_dir = str(app_data)
            
            # Override database URL to use SQLite
            db_path = app_data / "psms.db"
            self.database_url = f"sqlite:///{db_path}"
            
            # Set upload dir inside app data
            if not self.upload_dir:
                self.upload_dir = str(app_data / "uploads")
        else:
            # Docker or direct uvicorn mode
            if not self.upload_dir:
                # Resolve relative to this file's location (backend/app/config.py)
                # -> backend/data/uploads (always correct regardless of CWD)
                backend_dir = Path(__file__).resolve().parent.parent
                self.upload_dir = str(backend_dir / "data" / "uploads")
        
        # Ensure upload dir exists
        Path(self.upload_dir).mkdir(parents=True, exist_ok=True)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
