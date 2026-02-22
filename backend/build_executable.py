import PyInstaller.__main__
import os
import platform
import shutil

# backend/build_executable.py


def build():
    print("Building backend executable...")

    # Clean previous builds
    if os.path.exists("dist"):
        shutil.rmtree("dist")
    if os.path.exists("build"):
        shutil.rmtree("build")

    # Windows uses ';' as add-data separator, Unix uses ':'
    sep = ";" if platform.system() == "Windows" else ":"

    # Arguments for PyInstaller
    args = [
        "app/main.py",  # Entry point
        "--name=main",
        "--onefile",
        "--clean",
        # Hidden imports for uvicorn
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespan.on",
        "--hidden-import=sqlalchemy.sql.default_comparator",
        f"--add-data=alembic.ini{sep}.",
    ]

    PyInstaller.__main__.run(args)

    print("Build complete. Moving to electron/backend-dist...")

    # Determine executable name (main.exe on Windows, main on Unix)
    exe_name = "main.exe" if platform.system() == "Windows" else "main"
    source = os.path.join("dist", exe_name)
    destination_dir = os.path.join("..", "electron", "backend-dist")

    if not os.path.exists(destination_dir):
        os.makedirs(destination_dir)

    shutil.copy2(source, destination_dir)
    print(f"Moved executable to {destination_dir}")


if __name__ == "__main__":
    build()
