<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Electron-28-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/Expo-SDK-000020?logo=expo&logoColor=white" alt="Expo">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
</p>

# 📦 Personal Storage Management System (PSMS)

**Stop losing things.** PSMS is a full-stack personal storage management app that lets you digitally organize, search, and track every physical item you own — from bedroom drawers to travel bags.

> A single-user, self-hosted system with a web dashboard, Electron desktop app, and React Native mobile app — all syncing over your local network.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗂️ **Location Hierarchy** | Unlimited nesting — `Home → Bedroom → Wardrobe → Top Shelf → Blue Box` |
| 📱 **QR Code Labels** | Generate & print QR codes. Scan from mobile to instantly find items |
| 🔍 **Full-Text Search** | Search items and locations by name, description, or tags |
| 👕 **Wardrobe Module** | Catalog clothing with photos, brands, sizes. Plan outfits |
| 🧺 **Laundry Tracking** | Track clothes through Worn → Hamper → Wash → Put Away |
| 🤝 **Lend Tracking** | Record who you lent items to, set due dates, mark returns |
| ⚠️ **Lost & Found** | Mark items as lost, add notes, restore when found |
| 📜 **Movement History** | Full audit trail of every item move with timestamps |
| 🔄 **Multi-Device Sync** | Mac ↔ Windows auto-sync over LAN via mDNS discovery |
| 🖥️ **Desktop App** | Electron wrapper — runs standalone with embedded SQLite |
| 📲 **Mobile App** | React Native (Expo) app for scanning and quick lookups |

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                     PSMS Stack                         │
├──────────┬──────────┬───────────┬──────────────────────┤
│ Web UI   │ Desktop  │ Mobile    │ API Docs             │
│ React    │ Electron │ Expo RN   │ Swagger UI           │
│ :3000    │          │           │ :8000/docs           │
├──────────┴──────────┴───────────┴──────────────────────┤
│                  FastAPI Backend (:8000)                │
├────────────────────────┬───────────────────────────────┤
│   PostgreSQL (Docker)  │  SQLite (Desktop/standalone)  │
├────────────────────────┼───────────────────────────────┤
│   Local FS (uploads)   │  Local FS (~/.psms/uploads)   │
└────────────────────────┴───────────────────────────────┘
```

## 🚀 Quick Start

### Option 1: Docker Compose (recommended)

```bash
git clone https://github.com/rohanbatrain/Storage-Management-System.git
cd personal-storage-management

# Copy and configure environment
cp .env.example .env

# Start all services
docker-compose up -d --build

# Open the app
open http://localhost:3000
```

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:8000/docs |

### Option 2: Desktop App (Electron)

No Docker needed — the desktop app bundles everything.

```bash
# Build the backend executable
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python build_executable.py

# Build the web UI into Electron renderer
cd ../web
npm install && npm run build
cp -r dist/* ../electron/renderer/

# Package the Electron app
cd ../electron
npm install
npm run dist
```

The desktop app uses **SQLite** and stores data at `~/.psms/`.

### Option 3: Development Mode

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2 — Frontend
cd web
npm install
npm run dev

# Terminal 3 — Mobile (optional)
cd mobile
npm install
npx expo start
```

## 📁 Project Structure

```
personal-storage-management/
├── backend/                # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── models/         # Location, Item, Outfit, History
│   │   ├── routers/        # REST endpoints
│   │   ├── schemas/        # Pydantic request/response models
│   │   └── main.py         # App entrypoint
│   ├── alembic/            # Database migrations
│   ├── tests/              # Pytest suite
│   └── requirements.txt
├── web/                    # React + Vite frontend
│   └── src/
│       ├── components/     # UI components
│       ├── pages/          # Route pages
│       └── services/       # API client
├── mobile/                 # React Native (Expo)
│   └── src/
│       ├── screens/        # App screens
│       └── context/        # React contexts
├── electron/               # Desktop wrapper
│   ├── main.js             # Electron main process
│   ├── sync.js             # LAN sync (mDNS + REST)
│   └── preload.js          # Context bridge
├── docs/                   # MkDocs documentation
├── docker-compose.yml      # Full stack deployment
└── mkdocs.yml              # Docs site config
```

## 🔄 Multi-Device Sync

When running as a desktop app, PSMS instances on the same LAN automatically discover each other via **mDNS** (Bonjour/Zeroconf) and sync every 30 seconds:

- ✅ **Zero configuration** — devices find each other automatically
- ✅ **Offline-first** — each machine works independently
- ✅ **Last-write-wins** — simple conflict resolution for single-user

The sync indicator in the sidebar shows the current state:
- ⚪ **Standalone** — no peer found
- 🟡 **Syncing** — sync in progress
- 🟢 **Synced** — connected to peer

## 🧪 API Overview

The backend exposes a RESTful API at `/api`. Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/locations/tree` | Full location hierarchy |
| `POST` | `/api/locations/` | Create a location |
| `GET` | `/api/items/` | List items (with filters) |
| `POST` | `/api/items/` | Create an item |
| `PUT` | `/api/items/{id}/move` | Move item to new location |
| `GET` | `/api/search/?q=...` | Full-text search |
| `GET` | `/api/qr/{id}` | Generate QR code image |
| `GET` | `/api/wardrobe/items` | List clothing items |
| `POST` | `/api/outfits/` | Create an outfit |
| `GET` | `/api/sync/status` | Sync peer status |
| `POST` | `/api/sync/pull` | Pull changes from peer |
| `POST` | `/api/sync/push` | Push changes to peer |

Full interactive docs at **http://localhost:8000/docs**.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL 15 (Docker) / SQLite (Desktop) |
| Image Storage | Local filesystem (Docker volume / Desktop `~/.psms/uploads/`) |
| Web Frontend | React 18, Vite 5, Lucide Icons |
| Desktop | Electron 28, bonjour-service (mDNS) |
| Mobile | React Native, Expo, expo-camera |
| DevOps | Docker Compose, PyInstaller |

## 🧑‍💻 Development

### Running Tests

```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -v
```

### Database Migrations

```bash
cd backend
source venv/bin/activate

# Create a new migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Building Documentation

```bash
pip install mkdocs-material
mkdocs serve    # Preview at http://localhost:8000
mkdocs build    # Build static site
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
