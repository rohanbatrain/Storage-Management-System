# Development Guide

## Project Structure

```
personal-storage-management/
├── backend/          # FastAPI + SQLAlchemy
├── web/              # React + Vite frontend
├── electron/         # Electron desktop wrapper
├── mobile/           # React Native (Expo)
├── docs/             # MkDocs documentation
├── landing/          # GitHub Pages landing page
└── .github/workflows # CI/CD pipelines
```

## Local Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be at `http://localhost:8000` with Swagger docs at `/docs`.

### Web Frontend

```bash
cd web
npm install
npm run dev
```

Runs at `http://localhost:5173` with hot reload. Proxies API requests to `:8000`.

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

### Electron (Desktop)

```bash
# Build backend executable first
cd backend && python build_executable.py

# Run Electron in dev mode
cd electron && npm install && npm start
```

## Building for Release

### Backend Executable

```bash
cd backend
python build_executable.py
# Output: electron/backend-dist/main
```

### Full Electron Package

```bash
cd web
npm run electron:build
# Output: web/dist/*.dmg / *.exe / *.AppImage
```

### Docker

```bash
docker-compose up -d --build
```

## Database

| Mode | Engine | Location |
|------|--------|----------|
| Electron | SQLite | `~/.psms/psms.db` |
| Docker | PostgreSQL | Docker volume |
| Dev | Either | Configurable via `DATABASE_URL` |

Tables are auto-created on first startup. For PostgreSQL migrations, use Alembic:

```bash
cd backend
alembic upgrade head
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | SQLite (desktop) | Database connection string |
| `SECRET_KEY` | `dev-secret-key` | JWT signing key |
| `DEBUG` | `false` | Enable debug mode |
| `UPLOAD_DIR` | Auto-detected | Image upload directory |
| `PORT` | `8000` | Backend server port |

## CI/CD

Two GitHub Actions workflows:

1. **`release.yml`** — Triggered by `v*` tags → builds backend on 3 OS → packages Electron → publishes Expo update → creates GitHub Release
2. **`pages.yml`** — Triggered by `main` push → builds landing page + MkDocs → deploys to GitHub Pages

### Creating a Release

```bash
# 1. Bump version in electron/package.json & web/package.json
# 2. Commit, tag, push
git add -A && git commit -m "Release v1.1.0"
git tag v1.1.0
git push && git push --tags
```

## Testing

```bash
cd backend
pytest tests/ -v
```

## Code Style

- **Python**: PEP 8, type hints encouraged
- **JavaScript/React**: ESLint with default Vite config
- **TypeScript (mobile)**: Strict mode
