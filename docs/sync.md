# Multi-Device Sync

PSMS supports connecting your mobile phone to the desktop app over your local WiFi network.

## How It Works

```
┌─────────────────┐    WiFi     ┌─────────────────┐
│  Desktop App    │◄───────────►│  Mobile App      │
│  (Electron)     │   REST API  │  (Expo)          │
│  SQLite DB      │             │                  │
└─────────────────┘             └─────────────────┘
```

The desktop app runs a local HTTP server. The mobile app connects to it via your LAN IP address. Both devices must be on the **same WiFi network**.

## Setup

### 1. Start the Desktop App
Open the Electron app. The backend server starts automatically on a random available port.

### 2. Connect Mobile
1. Click **Connect Mobile** in the desktop sidebar
2. A QR code appears with the local server URL (e.g., `http://192.168.1.42:8123`)
3. Open the PSMS mobile app on your phone
4. Tap **Scan** and point at the QR code

### 3. Use
Once connected, you can:
- Browse locations and items from your phone
- Scan QR labels on shelves and boxes
- Move items between locations
- Add new items with photos

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Can't connect | Ensure both devices are on the same WiFi |
| Timeout | Check firewall isn't blocking the port |
| QR doesn't scan | Manually enter the URL shown below the QR code |

## Docker Mode

When running via Docker, the API is already accessible at `http://<host-ip>:8000`. Point the mobile app at this URL directly.
