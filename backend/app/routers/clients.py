from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
import time

router = APIRouter(prefix="/clients", tags=["clients"])

# In-memory dictionary to track active clients
# Key: IP address (string)
# Value: dict with keys: 'device_name', 'last_seen' (Unix timestamp), 'user_agent'
active_clients: Dict[str, dict] = {}

# Timeout for considering a client as disconnected (2 minutes)
CLIENT_TIMEOUT_SECONDS = 120

class ClientInfo(BaseModel):
    ip: str
    device_name: str
    last_seen: float
    user_agent: str

@router.get("", response_model=List[ClientInfo])
def get_active_clients():
    """Get a list of all currently active clients."""
    current_time = time.time()
    
    # Clean up stale clients
    stale_ips = [
        ip for ip, data in active_clients.items() 
        if current_time - data["last_seen"] > CLIENT_TIMEOUT_SECONDS
    ]
    for ip in stale_ips:
        del active_clients[ip]
        
    # Return formatted list
    return [
        ClientInfo(
            ip=ip, 
            device_name=data["device_name"], 
            last_seen=data["last_seen"],
            user_agent=data["user_agent"]
        )
        for ip, data in active_clients.items()
    ]

def track_client_request(ip: str, device_name: str, user_agent: str):
    """Update the last_seen timestamp and info for a client."""
    if not ip or ip == "127.0.0.1": 
        # Don't track localhost (the Electron app itself) unless we want to for debugging.
        # But we do want to track it if someone connects to localhost from emulator.
        # So we'll track it if it has an X-Device-Name.
        if not device_name:
            return
            
    active_clients[ip] = {
        "device_name": device_name or "Unknown Device",
        "last_seen": time.time(),
        "user_agent": user_agent or ""
    }
