# Personal Storage Management System (PSMS)

Welcome to the documentation for the **Personal Storage Management System**. PSMS is a comprehensive solution designed to help you track your personal belongings, manage your wardrobe, and keep tabs on your laundry and borrowed items.

## Key Features

### 📦 Item Tracking
- **Location Hierarchy**: Organize items into a tree of locations (e.g., House -> Room -> Closet -> Box).
- **QR Code Scanning**: Print and scan QR codes for quick item lookup and movement.
- **Movement History**: detailed logs of where items have been and when they were moved.

### 👕 Wardrobe Management
- **Digital Wardrobe**: Catalog your clothing with photos (via URL) and metadata.
- **Outfit Planning**: Create and save outfits from your wardrobe items.
- **Laundry Tracking**: Track items through "Worn", "In Hamper", "Washed", and "Returned" states.

### 🤝 Social Features
- **Lend to Friend**: Track items you've lent out, set due dates, and mark returns.
- **Lost & Found**: Mark items as lost to keep them separate from your active inventory, and restore them when found.

## getting Started

To get up and running quickly, check out the [Installation Guide](installation.md).

## Technology Stack

- **Backend**: Python (FastAPI), SQLAlchemy, PostgreSQL
- **Frontend**: React (Vite), Tailwind CSS (conceptual)
- **Mobile**: React Native (Expo)
- **Deployment**: Docker Compose
