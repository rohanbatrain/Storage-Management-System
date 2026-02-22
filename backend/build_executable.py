import PyInstaller.__main__
import os
import platform
import shutil

# backend/build_executable.py
# Builds the PSMS backend into a single branded executable.

APP_NAME = "psms-server"
ICON_PATH = os.path.join("..", "electron", "build", "icon.ico")
VERSION_FILE = "version_info.txt"


def build():
    print(f"Building {APP_NAME} executable for {platform.system()}...")

    # Clean previous builds
    for d in ("dist", "build"):
        if os.path.exists(d):
            shutil.rmtree(d)

    # Windows uses ';' as add-data separator, Unix uses ':'
    sep = ";" if platform.system() == "Windows" else ":"

    # Core PyInstaller arguments
    args = [
        "app/main.py",
        f"--name={APP_NAME}",
        "--onefile",
        "--clean",
        # ── Hidden imports required by uvicorn / sqlalchemy ──
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
        # ── Bundled data files ──
        f"--add-data=alembic.ini{sep}.",
    ]

    # Platform-specific branding
    if platform.system() == "Windows":
        if os.path.exists(ICON_PATH):
            args.append(f"--icon={ICON_PATH}")
        if os.path.exists(VERSION_FILE):
            args.append(f"--version-file={VERSION_FILE}")
    elif platform.system() == "Darwin":
        # macOS: .ico works for PyInstaller on mac too
        if os.path.exists(ICON_PATH):
            args.append(f"--icon={ICON_PATH}")

    PyInstaller.__main__.run(args)

    print("Build complete. Moving to electron/backend-dist...")

    # Determine the output filename (platform-dependent)
    exe_name = APP_NAME + (".exe" if platform.system() == "Windows" else "")
    source = os.path.join("dist", exe_name)
    destination_dir = os.path.join("..", "electron", "backend-dist")

    if not os.path.exists(destination_dir):
        os.makedirs(destination_dir)

    shutil.copy2(source, destination_dir)
    print(f"✅ {exe_name} → {destination_dir}")


if __name__ == "__main__":
    build()
