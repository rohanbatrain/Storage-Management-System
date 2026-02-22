# Personal Storage Management System (SMS)

Welcome to the documentation for the **Personal Storage Management System**. SMS is a comprehensive, self-hosted solution to digitally organize, track, and search every physical item you own — from wardrobe clothing to stored electronics to borrowed items.

## Key Features

### 📦 Item & Location Tracking
- **Location Hierarchy**: Unlimited nesting — `Home → Bedroom → Wardrobe → Top Shelf → Blue Box`
- **QR Code Labels**: Generate and print QR codes for your storage containers. Scan from mobile for instant lookup
- **Movement History**: Full audit trail of where items have been and when they were moved
- **Full-Text Search**: Find anything across items, locations, descriptions, and tags

### 👕 Wardrobe Management
- **Digital Wardrobe**: Catalog clothing with images, brands, sizes, colors, and materials
- **Outfit Planning**: Create and save outfit combinations from your wardrobe
- **Laundry Tracking**: Track items through Worn → Hamper → Washed → Put Away states

### 🤝 Social & Recovery
- **Lend to Friend**: Track loans with borrower name, due dates, and return status
- **Lost & Found**: Mark items as lost, add notes about where they were last seen, restore when found

### 🔄 Multi-Device Sync
- **LAN Sync**: Mac ↔ Windows desktop apps auto-discover each other and sync over your local network
- **Offline-First**: Each device works independently. Data merges when both are online

## Getting Started

→ [Installation Guide](installation.md) — Docker, Desktop App, or Development setup

→ [Usage Guide](usage.md) — Core concepts, features, and workflows

→ [API Reference](api.md) — REST API endpoints

→ [Development Guide](development.md) — Contributing and local development

→ [Multi-Device Sync](sync.md) — How LAN sync works

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python (FastAPI), SQLAlchemy, PostgreSQL / SQLite |
| Web Frontend | React 18, Vite 5 |
| Mobile | React Native, Expo |
| Desktop | Electron 28, mDNS (Bonjour) |
| Infrastructure | Docker Compose, PyInstaller |
