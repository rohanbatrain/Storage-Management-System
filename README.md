# Personal Storage Management System (PSMS)

A single-user personal storage management application to digitally organize and track physical storage locations.

## Tech Stack

- **Backend**: FastAPI + PostgreSQL + SQLAlchemy
- **Web Frontend**: React + Vite
- **Mobile App**: React Native (Expo)
- **Deployment**: Docker Compose

## Quick Start

```bash
# Start all services
docker-compose up --build

# Access:
# - Web App: http://localhost:3000
# - API Docs: http://localhost:8000/docs
# - Database: localhost:5432
```

## Project Structure

```
├── backend/          # FastAPI backend
├── web/              # React web application
├── mobile/           # React Native mobile app
└── docker-compose.yml
```

## Features

- 📦 Create and manage storage locations (containers, surfaces, portable)
- 📍 Nested storage hierarchy with unlimited depth
- 🏷️ Aliases for quick location referencing
- 🔍 Full-text search for items and locations
- 📱 QR code labeling for physical storage
- 📜 Item movement history tracking
- ⏱️ Temporary vs permanent placement tracking

## Development

See individual README files in each service directory for development instructions.
