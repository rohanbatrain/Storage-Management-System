from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.routers import locations, items, search, qr, wardrobe, export, identify

settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="API for managing personal storage locations and items",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files — uploads directory
from fastapi.staticfiles import StaticFiles
from pathlib import Path

if settings.is_frozen:
    _upload_dir = Path(settings.data_dir) / "uploads"
else:
    _upload_dir = Path("backend/static/uploads")
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(_upload_dir)), name="uploads")

# Create database tables if using SQLite (likely first run in Electron)
if "sqlite" in settings.database_url:
    Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(locations.router, prefix=settings.api_v1_prefix)
app.include_router(items.router, prefix=settings.api_v1_prefix)
app.include_router(search.router, prefix=settings.api_v1_prefix)
app.include_router(qr.router, prefix=settings.api_v1_prefix)
app.include_router(wardrobe.router, prefix=settings.api_v1_prefix)
app.include_router(export.router, prefix=settings.api_v1_prefix)
app.include_router(identify.router, prefix=settings.api_v1_prefix)
from app.routers import upload
app.include_router(upload.router, prefix=settings.api_v1_prefix)
from app.routers import sync as sync_router
app.include_router(sync_router.router, prefix=settings.api_v1_prefix)


@app.get("/")
def root():
    """Root endpoint with API info."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "api_prefix": settings.api_v1_prefix
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    import os
    
    # Get port from environment variable or default to 8000
    port = int(os.environ.get("PORT", 8000))
    
    # Bind to 0.0.0.0 in frozen/Electron mode so LAN peers can sync
    host = "0.0.0.0" if getattr(settings, 'is_frozen', False) else "127.0.0.1"
    uvicorn.run(app, host=host, port=port, log_level="info")
