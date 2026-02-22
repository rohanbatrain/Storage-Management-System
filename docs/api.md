# API Reference

## Base URL

| Mode | URL |
|------|-----|
| Desktop (Electron) | `http://localhost:<dynamic-port>/api` |
| Docker | `http://localhost:8000/api` |
| Development | `http://localhost:8000/api` |

Interactive Swagger docs are always available at `/docs`.

---

## Locations

### `GET /api/locations`
List all root locations (with nested children tree).

### `POST /api/locations`
Create a new location.

```json
{
  "name": "Living Room",
  "kind": "room",
  "parent_id": "uuid-of-parent",
  "description": "Main living area",
  "image_url": "/static/uploads/photo.jpg"
}
```

**Location kinds:** `room`, `container`, `closet`, `laundry_dirty`, `laundry_worn`

### `GET /api/locations/{id}`
Get a location with its items and children.

### `PUT /api/locations/{id}`
Update a location.

### `DELETE /api/locations/{id}`
Delete a location and all its descendants (cascades items and history).

---

## Items

### `GET /api/items`
List all items. Optional query params: `location_id`, `temporary_only`.

### `POST /api/items`
Create a new item.

```json
{
  "name": "Laptop Charger",
  "description": "MacBook Pro 96W",
  "current_location_id": "uuid",
  "tags": ["electronics", "charger"],
  "quantity": 1
}
```

### `GET /api/items/{id}`
Get an item with its full location path.

### `PUT /api/items/{id}`
Update item details.

### `DELETE /api/items/{id}`
Delete an item (also cleans up uploaded image).

### `POST /api/items/{id}/move`
Move an item to a new location.

```json
{
  "to_location_id": "uuid",
  "is_temporary": false,
  "notes": "Moved for cleaning"
}
```

### `POST /api/items/{id}/return`
Return an item to its permanent location.

### `POST /api/items/{id}/lend`
Lend an item. Query params: `borrower` (required), `due_date`, `notes`.

### `POST /api/items/{id}/return-loan`
Return a lent item.

### `POST /api/items/{id}/lost`
Mark an item as lost.

### `POST /api/items/{id}/found`
Mark a lost item as found.

### `GET /api/items/{id}/history`
Get movement history for an item.

---

## Search

### `GET /api/search?q={query}`
Full-text search across items and locations.

### `GET /api/search/alias/{alias}`
Look up by alias/QR code ID.

---

## QR Codes

### `GET /api/qr/{location_id}?size=200`
Generate a QR code PNG for a location.

### `GET /api/qr/item/{item_id}?size=200`
Generate a QR code PNG for an item.

### `GET /api/qr/bulk-pdf?type=location&ids=id1,id2`
Generate a PDF with multiple QR codes for printing.

---

## Upload

### `POST /api/upload`
Upload an image (multipart/form-data, max 10 MB, images only).

Returns: `{ "url": "/static/uploads/<uuid>.jpg" }`

---

## Wardrobe

### `GET /api/wardrobe/items`
List clothing items. Optional: `category`, `cleanliness`, `location_id`.

### `POST /api/wardrobe/items`
Create a clothing item with metadata (category, brand, color, season).

### `POST /api/wardrobe/items/{id}/wear`
Log wearing an item (increments wear count).

### `POST /api/wardrobe/items/{id}/wash`
Mark as washed (resets to clean, returns to permanent location).

### `POST /api/wardrobe/items/{id}/to-laundry`
Move a dirty item to the laundry basket.

### `GET /api/wardrobe/laundry`
Get all items that need washing.

### `GET /api/wardrobe/rewear-safe`
Get items safe to rewear.

### Outfits

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/wardrobe/outfits` | List all outfits |
| `POST` | `/api/wardrobe/outfits` | Create an outfit |
| `GET` | `/api/wardrobe/outfits/{id}` | Get outfit with items |
| `PUT` | `/api/wardrobe/outfits/{id}` | Update an outfit |
| `DELETE` | `/api/wardrobe/outfits/{id}` | Delete an outfit |
| `POST` | `/api/wardrobe/outfits/{id}/wear` | Wear outfit (logs all items) |

### `GET /api/wardrobe/stats`
Wardrobe analytics (clean/dirty counts, items by category, most/least worn).

---

## Export

### `GET /api/export/json`
Export all data as JSON.

### `GET /api/export/csv`
Export items as CSV.
