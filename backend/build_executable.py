import PyInstaller.__main__
import os
import shutil

# backend/build_executable.py

def build():
    print("Building backend executable...")
    
    # Clean previous builds
    if os.path.exists("dist"):
        shutil.rmtree("dist")
    if os.path.exists("build"):
        shutil.rmtree("build")

    # Arguments for PyInstaller
    args = [
        'app/main.py',  # Entry point
        '--name=main',
        '--onefile',
        '--clean',
        # Add hidden imports if necessary (e.g., uvicorn.lifespan.on, etc.)
        '--hidden-import=uvicorn.logging',
        '--hidden-import=uvicorn.loops',
        '--hidden-import=uvicorn.loops.auto',
        '--hidden-import=uvicorn.protocols',
        '--hidden-import=uvicorn.protocols.http',
        '--hidden-import=uvicorn.protocols.http.auto',
        '--hidden-import=uvicorn.protocols.websockets',
        '--hidden-import=uvicorn.protocols.websockets.auto',
        '--hidden-import=uvicorn.lifespan.on',
        '--hidden-import=sqlalchemy.sql.default_comparator',
        # Add any other hidden imports here
        '--add-data=alembic.ini:.', # Include alembic.ini if needed, though we might not run migrations in the built app
        # We might need to handle database creation/migration on startup in the app code
    ]

    PyInstaller.__main__.run(args)

    print("Build complete. Moving to electron/backend-dist...")
    
    # Move the executable to electron/backend-dist
    source = os.path.join("dist", "main") # or main.exe
    destination_dir = os.path.join("..", "electron", "backend-dist")
    
    if not os.path.exists(destination_dir):
        os.makedirs(destination_dir)
        
    shutil.copy2(source, destination_dir)
    print(f"Moved executable to {destination_dir}")

if __name__ == "__main__":
    build()
