"""
LLM Service — OpenAI-compatible chat completions with tool calling.

Supports OpenAI, OpenRouter, Ollama, and any compatible API.
Configure via LLM_API_KEY, LLM_BASE_URL, LLM_MODEL env vars.
"""

import httpx
import json
import logging
import re
from typing import Any, AsyncIterator, Optional
from sqlalchemy.orm import Session

from app.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are SMS Assistant — a helpful AI for the Storage Management System (SMS).

You help users find items, check laundry status, manage their wardrobe, and organize storage.

Key facts about the app:
- Items are stored in hierarchical locations (e.g., Home → Bedroom → Wardrobe)
- Clothing items track cleanliness: clean → worn → needs_wash → in_laundry
- Items can be lent to friends (tracked with due dates)
- Items can be marked as lost/found
- Visual Lens can identify items by photo

CRITICAL RULES — follow these without exception:
- Users ALWAYS refer to items and locations by NAME, never by UUID. You must NEVER ask the user for a UUID.
- Before calling any tool that requires an item_id or location_id, you MUST first resolve the name:
  - For locations: call list_locations to get the full tree, then extract the UUID that matches the name.
  - For items: call search_items with the name to find the item, then extract its UUID.
  - If multiple matches exist, pick the most likely one based on context, or ask the user to clarify (e.g. "Did you mean Bedroom in House or in Apartment?").
  - If no match is found, tell the user clearly that the location/item doesn't exist yet.
- When creating child locations (furniture, container, etc.), always resolve the parent location name to its UUID first.

When answering:
- Be concise and conversational
- When you find items, mention their location and status
- For clothing, mention cleanliness status
- If multiple results, summarize clearly
- Use emoji sparingly for readability
- If you can't find something, suggest what the user might try
- When performing actions (move, wear, wash), confirm what you did"""

# ---------------------------------------------------------------------------
# Tool Definitions (OpenAI function calling format)
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_items",
            "description": "Search for items and locations by name or description. Use this to find where something is.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search term (item name, description, or location name)"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_item_details",
            "description": "Get full details of a specific item by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {
                        "type": "string",
                        "description": "UUID of the item"
                    }
                },
                "required": ["item_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_laundry",
            "description": "List all clothing items that need washing (dirty or in laundry basket). Use when asked about laundry.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_rewearable",
            "description": "List clothing items that are safe to wear again without washing.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_lent_items",
            "description": "List all items currently lent out to someone.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_lost_items",
            "description": "List all items currently marked as lost.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "move_item",
            "description": "Move an item to a different location. You need the item ID and target location ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {
                        "type": "string",
                        "description": "UUID of the item to move"
                    },
                    "to_location_id": {
                        "type": "string",
                        "description": "UUID of the destination location"
                    },
                    "is_temporary": {
                        "type": "boolean",
                        "description": "Whether this is a temporary placement",
                        "default": False
                    }
                },
                "required": ["item_id", "to_location_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "wear_item",
            "description": "Log wearing a clothing item. Updates its cleanliness status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {
                        "type": "string",
                        "description": "UUID of the clothing item"
                    }
                },
                "required": ["item_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "wash_item",
            "description": "Mark a clothing item as washed. Resets cleanliness to clean.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {
                        "type": "string",
                        "description": "UUID of the clothing item"
                    }
                },
                "required": ["item_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_wardrobe_stats",
            "description": "Get wardrobe analytics: total items, cleanliness breakdown, most worn items.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_locations",
            "description": "List all storage locations as a tree hierarchy.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_all_items",
            "description": "List all items in the system, optionally filtered by location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_id": {
                        "type": "string",
                        "description": "Optional: filter by location UUID"
                    }
                }
            }
        }
    },
    # ---- Location Management ----
    {
        "type": "function",
        "function": {
            "name": "create_location",
            "description": "Create a new storage location. Kind must be one of: room, furniture, container, surface, portable, laundry_worn, laundry_dirty. Rooms can only be root locations (no parent). Furniture goes in rooms. Containers go in rooms, furniture, surfaces, or other containers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Name of the location (e.g. 'Bedroom', 'Wardrobe')"},
                    "kind": {"type": "string", "description": "Type of location: room, furniture, container, surface, portable, laundry_worn, laundry_dirty"},
                    "description": {"type": "string", "description": "Optional description"},
                    "parent_id": {"type": "string", "description": "Optional UUID of the parent location"},
                    "is_wardrobe": {"type": "boolean", "description": "Whether this location is a wardrobe (clothing storage)", "default": False}
                },
                "required": ["name", "kind"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_location",
            "description": "Update an existing location's name, description, or other properties.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_id": {"type": "string", "description": "UUID of the location to update"},
                    "name": {"type": "string", "description": "New name for the location"},
                    "description": {"type": "string", "description": "New description"},
                    "is_wardrobe": {"type": "boolean", "description": "Whether this is a wardrobe location"}
                },
                "required": ["location_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_location",
            "description": "Delete a location and all its children and items. Use with caution — this is irreversible.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_id": {"type": "string", "description": "UUID of the location to delete"}
                },
                "required": ["location_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_alias",
            "description": "Add an alternate name (alias) to a location so it can be found by multiple names.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_id": {"type": "string", "description": "UUID of the location"},
                    "alias": {"type": "string", "description": "The alternate name to add"}
                },
                "required": ["location_id", "alias"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "remove_alias",
            "description": "Remove an alternate name (alias) from a location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_id": {"type": "string", "description": "UUID of the location"},
                    "alias": {"type": "string", "description": "The alias to remove"}
                },
                "required": ["location_id", "alias"]
            }
        }
    },
    # ---- Item Management ----
    {
        "type": "function",
        "function": {
            "name": "create_item",
            "description": "Create a new item and place it in a location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Name of the item"},
                    "location_id": {"type": "string", "description": "UUID of the location where the item will be stored"},
                    "description": {"type": "string", "description": "Optional description of the item"},
                    "tags": {"type": "array", "items": {"type": "string"}, "description": "Optional list of tags"}
                },
                "required": ["name", "location_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_item",
            "description": "Update an item's name, description, or tags.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "string", "description": "UUID of the item to update"},
                    "name": {"type": "string", "description": "New name for the item"},
                    "description": {"type": "string", "description": "New description"},
                    "tags": {"type": "array", "items": {"type": "string"}, "description": "New list of tags"}
                },
                "required": ["item_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_item",
            "description": "Permanently delete an item from the system.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "string", "description": "UUID of the item to delete"}
                },
                "required": ["item_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_item_history",
            "description": "Get the full movement history for an item — where it has been over time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "string", "description": "UUID of the item"}
                },
                "required": ["item_id"]
            }
        }
    },
    # ---- Loan & Status Tracking ----
    {
        "type": "function",
        "function": {
            "name": "lend_item",
            "description": "Lend an item to someone. Records the borrower name, optional due date, and notes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "string", "description": "UUID of the item to lend"},
                    "borrower": {"type": "string", "description": "Name of the person borrowing the item"},
                    "due_date": {"type": "string", "description": "Optional ISO 8601 due date (e.g. '2025-03-15')"},
                    "notes": {"type": "string", "description": "Optional notes about the loan"}
                },
                "required": ["item_id", "borrower"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "return_from_loan",
            "description": "Mark a lent item as returned. Clears its loan status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "string", "description": "UUID of the item being returned"},
                    "notes": {"type": "string", "description": "Optional return notes"}
                },
                "required": ["item_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mark_lost",
            "description": "Mark an item as lost so it appears in the lost items list.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "string", "description": "UUID of the item to mark as lost"},
                    "notes": {"type": "string", "description": "Optional notes about when/where it was lost"}
                },
                "required": ["item_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mark_found",
            "description": "Mark a previously lost item as found.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "string", "description": "UUID of the item to mark as found"},
                    "notes": {"type": "string", "description": "Optional notes about where it was found"}
                },
                "required": ["item_id"]
            }
        }
    },
    # ---- Trips & Packing ----
    {
        "type": "function",
        "function": {
            "name": "list_active_trips",
            "description": "List all currently active packing trips and the items packed in them.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_trip",
            "description": "Create a new trip for packing items.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Name of the trip (e.g., 'Hawaii Vacation')"},
                    "destination": {"type": "string", "description": "Optional destination"},
                    "start_date": {"type": "string", "description": "Optional start date in YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "Optional end date in YYYY-MM-DD"}
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "pack_item_for_trip",
            "description": "Pack a specific item into a specific trip.",
            "parameters": {
                "type": "object",
                "properties": {
                    "trip_id": {"type": "string", "description": "UUID of the trip"},
                    "item_id": {"type": "string", "description": "UUID of the item to pack"}
                },
                "required": ["trip_id", "item_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "unpack_item_from_trip",
            "description": "Unpack a specific item from a trip.",
            "parameters": {
                "type": "object",
                "properties": {
                    "trip_id": {"type": "string", "description": "UUID of the trip"},
                    "item_id": {"type": "string", "description": "UUID of the item to unpack"}
                },
                "required": ["trip_id", "item_id"]
            }
        }
    },
    # ---- Analytics ----
    {
        "type": "function",
        "function": {
            "name": "get_cost_per_wear_analytics",
            "description": "Get analytics on cost-per-wear and total wardrobe value.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_declutter_suggestions",
            "description": "Get a list of items suggested for decluttering (unworn for over a year).",
            "parameters": {"type": "object", "properties": {}}
        }
    },
]

# ---------------------------------------------------------------------------
# Tool Execution
# ---------------------------------------------------------------------------

async def execute_tool(tool_name: str, arguments: dict, api_base: str) -> dict:
    """Execute a tool by calling the SMS REST API."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            if tool_name == "search_items":
                r = await client.get(f"{api_base}/search", params={"q": arguments["query"]})
            elif tool_name == "get_item_details":
                r = await client.get(f"{api_base}/items/{arguments['item_id']}")
            elif tool_name == "list_laundry":
                r = await client.get(f"{api_base}/wardrobe/laundry")
            elif tool_name == "list_rewearable":
                r = await client.get(f"{api_base}/wardrobe/rewear-safe")
            elif tool_name == "list_lent_items":
                r = await client.get(f"{api_base}/items/lent/all")
            elif tool_name == "list_lost_items":
                r = await client.get(f"{api_base}/items/lost/all")
            elif tool_name == "move_item":
                r = await client.post(
                    f"{api_base}/items/{arguments['item_id']}/move",
                    json={
                        "to_location_id": arguments["to_location_id"],
                        "is_temporary": arguments.get("is_temporary", False),
                    }
                )
            elif tool_name == "wear_item":
                r = await client.post(f"{api_base}/wardrobe/{arguments['item_id']}/wear")
            elif tool_name == "wash_item":
                r = await client.post(f"{api_base}/wardrobe/{arguments['item_id']}/wash")
            elif tool_name == "get_wardrobe_stats":
                r = await client.get(f"{api_base}/wardrobe/stats")
            elif tool_name == "list_locations":
                r = await client.get(f"{api_base}/locations/tree")
            elif tool_name == "list_all_items":
                params = {}
                if arguments.get("location_id"):
                    params["location_id"] = arguments["location_id"]
                r = await client.get(f"{api_base}/items", params=params)
            # ---- Location Management ----
            elif tool_name == "create_location":
                payload = {
                    "name": arguments["name"],
                    "kind": arguments["kind"],
                }
                if arguments.get("description"):
                    payload["description"] = arguments["description"]
                if arguments.get("parent_id"):
                    payload["parent_id"] = arguments["parent_id"]
                if arguments.get("is_wardrobe") is not None:
                    payload["is_wardrobe"] = arguments["is_wardrobe"]
                r = await client.post(f"{api_base}/locations", json=payload)
            elif tool_name == "update_location":
                payload = {}
                for field in ["name", "description", "is_wardrobe"]:
                    if arguments.get(field) is not None:
                        payload[field] = arguments[field]
                r = await client.put(f"{api_base}/locations/{arguments['location_id']}", json=payload)
            elif tool_name == "delete_location":
                r = await client.delete(f"{api_base}/locations/{arguments['location_id']}")
                if r.status_code == 204:
                    return {"success": True, "message": "Location deleted"}
                r.raise_for_status()
                return r.json()
            elif tool_name == "add_alias":
                r = await client.post(
                    f"{api_base}/locations/{arguments['location_id']}/alias",
                    json={"alias": arguments["alias"]}
                )
            elif tool_name == "remove_alias":
                r = await client.delete(
                    f"{api_base}/locations/{arguments['location_id']}/alias/{arguments['alias']}"
                )
                if r.status_code == 204:
                    return {"success": True, "message": "Alias removed"}
                r.raise_for_status()
                return r.json()
            # ---- Item Management ----
            elif tool_name == "create_item":
                payload = {
                    "name": arguments["name"],
                    "current_location_id": arguments["location_id"],
                    "permanent_location_id": arguments["location_id"],
                }
                if arguments.get("description"):
                    payload["description"] = arguments["description"]
                if arguments.get("tags"):
                    payload["tags"] = arguments["tags"]
                r = await client.post(f"{api_base}/items", json=payload)
            elif tool_name == "update_item":
                payload = {}
                for field in ["name", "description", "tags"]:
                    if arguments.get(field) is not None:
                        payload[field] = arguments[field]
                r = await client.put(f"{api_base}/items/{arguments['item_id']}", json=payload)
            elif tool_name == "delete_item":
                r = await client.delete(f"{api_base}/items/{arguments['item_id']}")
                if r.status_code == 204:
                    return {"success": True, "message": "Item deleted"}
                r.raise_for_status()
                return r.json()
            elif tool_name == "get_item_history":
                r = await client.get(f"{api_base}/items/{arguments['item_id']}/history")
            # ---- Loan & Status Tracking ----
            elif tool_name == "lend_item":
                params = {"borrower": arguments["borrower"]}
                if arguments.get("due_date"):
                    params["due_date"] = arguments["due_date"]
                if arguments.get("notes"):
                    params["notes"] = arguments["notes"]
                r = await client.post(
                    f"{api_base}/items/{arguments['item_id']}/lend",
                    params=params
                )
            elif tool_name == "return_from_loan":
                params = {}
                if arguments.get("notes"):
                    params["notes"] = arguments["notes"]
                r = await client.post(
                    f"{api_base}/items/{arguments['item_id']}/return-loan",
                    params=params
                )
            elif tool_name == "mark_lost":
                params = {}
                if arguments.get("notes"):
                    params["notes"] = arguments["notes"]
                r = await client.post(
                    f"{api_base}/items/{arguments['item_id']}/lost",
                    params=params
                )
            elif tool_name == "mark_found":
                params = {}
                if arguments.get("notes"):
                    params["notes"] = arguments["notes"]
                r = await client.post(
                    f"{api_base}/items/{arguments['item_id']}/found",
                    params=params
                )
            # ---- Trips & Packing ----
            elif tool_name == "list_active_trips":
                r = await client.get(f"{api_base}/trips", params={"active_only": "true"})
            elif tool_name == "create_trip":
                payload = {"name": arguments["name"]}
                if arguments.get("destination"): payload["destination"] = arguments["destination"]
                if arguments.get("start_date"): payload["start_date"] = arguments["start_date"]
                if arguments.get("end_date"): payload["end_date"] = arguments["end_date"]
                r = await client.post(f"{api_base}/trips", json=payload)
            elif tool_name == "pack_item_for_trip":
                r = await client.post(f"{api_base}/trips/{arguments['trip_id']}/pack/{arguments['item_id']}")
            elif tool_name == "unpack_item_from_trip":
                r = await client.post(f"{api_base}/trips/{arguments['trip_id']}/unpack/{arguments['item_id']}")
            # ---- Analytics ----
            elif tool_name == "get_cost_per_wear_analytics":
                r = await client.get(f"{api_base}/analytics/cost-per-wear")
            elif tool_name == "get_declutter_suggestions":
                r = await client.get(f"{api_base}/analytics/declutter", params={"days": 365})
            else:
                return {"error": f"Unknown tool: {tool_name}"}

            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            return {"error": f"API error {e.response.status_code}: {e.response.text[:200]}"}
        except Exception as e:
            return {"error": f"Tool execution failed: {str(e)}"}

# ---------------------------------------------------------------------------
# LLM Chat Completion with Tool Loop
# ---------------------------------------------------------------------------

# In-memory conversation store (per conversation_id)
_conversations: dict[str, list] = {}
_conversation_meta: dict[str, dict] = {}  # { id: { title, created_at, updated_at } }
MAX_HISTORY = 20  # Keep last N messages per conversation


def _get_llm_config() -> dict:
    """Load LLM settings: runtime JSON file first, then env vars."""
    from app.routers.chat import _load_llm_settings
    return _load_llm_settings()


async def chat(
    message: str,
    image_base64: Optional[str] = None,
    conversation_id: str = "default",
    api_base: str = "http://127.0.0.1:8000/api",
) -> dict:
    """
    Send a message to the LLM with tool calling support.
    Returns { reply: str, actions: [{ tool, args, result_summary }] }
    """
    llm_cfg = _get_llm_config()
    llm_base_url = llm_cfg.get("base_url", "")
    llm_api_key = llm_cfg.get("api_key", "")
    llm_model = llm_cfg.get("model", "")

    if not llm_base_url or not llm_model:
        return {
            "reply": (
                "💡 LLM is not configured yet.\n\n"
                "Go to **Settings → AI Assistant** to choose a provider "
                "(Ollama, OpenAI, or OpenRouter) and select a model."
            ),
            "actions": [],
        }

    # Get or create conversation history
    if conversation_id not in _conversations:
        _conversations[conversation_id] = []
    history = _conversations[conversation_id]

    # Add user message
    if image_base64:
        # Ensure it's formatted as a proper data URI if not already
        if not image_base64.startswith("data:"):
            # A common prefix, adjust if frontend sends raw base64 without mimetype
            clean_b64 = image_base64.replace(" ", "+")
            image_base64 = f"data:image/jpeg;base64,{clean_b64}"
            
        content = [
            {"type": "text", "text": message},
            {"type": "image_url", "image_url": {"url": image_base64}}
        ]
    else:
        content = message
        
    history.append({"role": "user", "content": content})

    # Track metadata
    import datetime
    now = datetime.datetime.utcnow().isoformat() + "Z"
    if conversation_id not in _conversation_meta:
        _conversation_meta[conversation_id] = {
            "title": (message[:60].strip() if message else "Image Search") or "New Chat",
            "created_at": now,
            "updated_at": now,
        }
    else:
        _conversation_meta[conversation_id]["updated_at"] = now

    # Truncate history to keep it manageable
    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]
        _conversations[conversation_id] = history

    # Build messages with system prompt
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

    actions = []
    max_tool_rounds = 5  # Prevent infinite loops

    async with httpx.AsyncClient(timeout=60.0) as client:
        for _ in range(max_tool_rounds):
            # Call LLM
            try:
                headers = {"Content-Type": "application/json"}
                if llm_api_key:
                    headers["Authorization"] = f"Bearer {llm_api_key}"

                response = await client.post(
                    f"{llm_base_url}/chat/completions",
                    headers=headers,
                    json={
                        "model": llm_model,
                        "messages": messages,
                        "tools": TOOLS,
                        "tool_choice": "auto",
                        "temperature": 0.3,
                        "max_tokens": 1024,
                    },
                )
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"LLM API HTTP status error: {e}")
                err_text = e.response.text.lower()
                if e.response.status_code == 404 and ("model" in err_text and "not found" in err_text):
                    msg = (
                        f"⚠️ The currently selected AI model (`{llm_model}`) is not installed on the server.\n\n"
                        "To fix this:\n"
                        "1. Go to **Settings → AI Models (Ollama)**.\n"
                        f"2. Tap the download icon next to the model name to install it."
                    )
                    return {"reply": msg, "actions": actions}
                    
                return {
                    "reply": f"Sorry, the language model returned an error ({e.response.status_code}): {e.response.text[:100]}",
                    "actions": actions,
                }
            except Exception as e:
                logger.error(f"LLM API error: {e}")
                return {
                    "reply": f"Sorry, I couldn't reach the language model. Error: {str(e)[:100]}",
                    "actions": actions,
                }

            choice = data["choices"][0]
            msg = choice["message"]

            # If the LLM wants to call tools
            if msg.get("tool_calls"):
                # Add assistant message with tool calls to history
                messages.append(msg)

                for tool_call in msg["tool_calls"]:
                    fn = tool_call["function"]
                    tool_name = fn["name"]
                    try:
                        tool_args = json.loads(fn["arguments"])
                    except json.JSONDecodeError:
                        tool_args = {}

                    logger.info(f"Tool call: {tool_name}({tool_args})")

                    # Execute the tool
                    result = await execute_tool(tool_name, tool_args, api_base)

                    # Truncate large results for the LLM context
                    result_str = json.dumps(result, default=str)
                    if len(result_str) > 3000:
                        result_str = result_str[:3000] + "... (truncated)"

                    actions.append({
                        "tool": tool_name,
                        "args": tool_args,
                        "summary": _summarize_tool_result(tool_name, result),
                    })

                    # Add tool result to messages
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": result_str,
                    })
            else:
                # LLM gave a final text response
                raw_content = msg.get("content", "I'm not sure how to help with that.")
                
                # Extract <think>...</think> blocks used by reasoning models
                thinking = ""
                think_match = re.search(r'<think>(.*?)</think>', raw_content, flags=re.DOTALL)
                if think_match:
                    thinking = think_match.group(1).strip()
                
                reply = re.sub(r'<think>.*?</think>', '', raw_content, flags=re.DOTALL).strip()
                if not reply and raw_content:
                    reply = "I've thought about it, but have nothing else to say."
                
                history.append({"role": "assistant", "content": reply})
                _conversations[conversation_id] = history
                return {"reply": reply, "actions": actions, "thinking": thinking}

    # Fell through the loop (too many tool calls)
    return {
        "reply": "I ran into a complex query. Could you try rephrasing?",
        "actions": actions,
        "thinking": "",
    }


async def chat_stream(
    message: str,
    image_base64: Optional[str] = None,
    conversation_id: str = "default",
    api_base: str = "http://127.0.0.1:8000/api",
) -> AsyncIterator[str]:
    """
    Streaming version of chat(). Yields newline-delimited JSON events:
      {"type": "tool_start", "tool": "...", "args": {...}}
      {"type": "tool_done",  "tool": "...", "args": {...}, "summary": "..."}
      {"type": "token",      "content": "..."}
      {"type": "done",       "conversation_id": "...", "thinking": "..."}
      {"type": "error",      "message": "..."}
    """
    llm_cfg = _get_llm_config()
    llm_base_url = llm_cfg.get("base_url", "")
    llm_api_key = llm_cfg.get("api_key", "")
    llm_model = llm_cfg.get("model", "")

    if not llm_base_url or not llm_model:
        msg = "💡 LLM is not configured yet.\n\nGo to **Settings → AI Assistant** to choose a provider."
        yield f'data: {json.dumps({"type": "token", "content": msg})}\n\n'
        yield f'data: {json.dumps({"type": "done", "conversation_id": conversation_id, "thinking": ""})}\n\n'
        return

    # Get or create conversation history
    if conversation_id not in _conversations:
        _conversations[conversation_id] = []
    history = _conversations[conversation_id]

    # Add user message
    if image_base64:
        if not image_base64.startswith("data:"):
            clean_b64 = image_base64.replace(" ", "+")
            image_base64 = f"data:image/jpeg;base64,{clean_b64}"
        content = [
            {"type": "text", "text": message},
            {"type": "image_url", "image_url": {"url": image_base64}}
        ]
    else:
        content = message

    history.append({"role": "user", "content": content})

    # Track metadata
    import datetime
    now = datetime.datetime.utcnow().isoformat() + "Z"
    if conversation_id not in _conversation_meta:
        _conversation_meta[conversation_id] = {
            "title": (message[:60].strip() if message else "Image Search") or "New Chat",
            "created_at": now,
            "updated_at": now,
        }
    else:
        _conversation_meta[conversation_id]["updated_at"] = now

    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]
        _conversations[conversation_id] = history

    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history
    actions = []
    max_tool_rounds = 5

    headers = {"Content-Type": "application/json"}
    if llm_api_key:
        headers["Authorization"] = f"Bearer {llm_api_key}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        for _ in range(max_tool_rounds):
            try:
                # Non-streaming call for tool-calling rounds
                response = await client.post(
                    f"{llm_base_url}/chat/completions",
                    headers=headers,
                    json={
                        "model": llm_model,
                        "messages": messages,
                        "tools": TOOLS,
                        "tool_choice": "auto",
                        "temperature": 0.3,
                        "max_tokens": 1024,
                    },
                )
                response.raise_for_status()
                data = response.json()
            except Exception as e:
                yield f'data: {json.dumps({"type": "error", "message": str(e)[:200]})}\n\n'
                return

            choice = data["choices"][0]
            msg = choice["message"]

            if msg.get("tool_calls"):
                messages.append(msg)
                for tool_call in msg["tool_calls"]:
                    fn = tool_call["function"]
                    tool_name = fn["name"]
                    try:
                        tool_args = json.loads(fn["arguments"])
                    except json.JSONDecodeError:
                        tool_args = {}

                    # Emit tool_start
                    yield f'data: {json.dumps({"type": "tool_start", "tool": tool_name, "args": tool_args})}\n\n'

                    result = await execute_tool(tool_name, tool_args, api_base)
                    result_str = json.dumps(result, default=str)
                    if len(result_str) > 3000:
                        result_str = result_str[:3000] + "... (truncated)"

                    summary = _summarize_tool_result(tool_name, result)
                    actions.append({"tool": tool_name, "args": tool_args, "summary": summary})

                    # Emit tool_done
                    yield f'data: {json.dumps({"type": "tool_done", "tool": tool_name, "args": tool_args, "summary": summary})}\n\n'

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": result_str,
                    })
            else:
                # Final reply — stream it token by token
                try:
                    async with client.stream(
                        "POST",
                        f"{llm_base_url}/chat/completions",
                        headers=headers,
                        json={
                            "model": llm_model,
                            "messages": messages,
                            "stream": True,
                            "temperature": 0.3,
                            "max_tokens": 1024,
                        },
                    ) as stream_resp:
                        full_content = ""
                        thinking_content = ""
                        reply_content = ""
                        # For non-Ollama providers: tag parsing state
                        in_think = False
                        tag_buffer = ""
                        uses_reasoning_field = False  # auto-detected

                        async for line in stream_resp.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            payload = line[6:]
                            if payload.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(payload)
                                delta = chunk["choices"][0].get("delta", {})

                                # === Mode 1: Ollama-style delta.reasoning field ===
                                reasoning = delta.get("reasoning", "")
                                if reasoning:
                                    uses_reasoning_field = True
                                    thinking_content += reasoning
                                    yield f'data: {json.dumps({"type": "thinking", "content": reasoning})}\n\n'

                                content = delta.get("content", "")
                                if not content:
                                    continue

                                full_content += content

                                # If this provider uses reasoning field, content is always reply
                                if uses_reasoning_field:
                                    reply_content += content
                                    yield f'data: {json.dumps({"type": "token", "content": content})}\n\n'
                                    continue

                                # === Mode 2: <think> tag parsing for other providers ===
                                think_batch = ""
                                reply_batch = ""

                                for ch in content:
                                    if tag_buffer:
                                        tag_buffer += ch
                                        if tag_buffer == "<think>":
                                            in_think = True
                                            tag_buffer = ""
                                        elif tag_buffer == "</think>":
                                            in_think = False
                                            tag_buffer = ""
                                        elif not "<think>"[:len(tag_buffer)].startswith(tag_buffer) and \
                                             not "</think>"[:len(tag_buffer)].startswith(tag_buffer):
                                            buf = tag_buffer
                                            tag_buffer = ""
                                            if in_think:
                                                think_batch += buf
                                            else:
                                                reply_batch += buf
                                    elif ch == '<':
                                        tag_buffer = ch
                                    else:
                                        if in_think:
                                            think_batch += ch
                                        else:
                                            reply_batch += ch

                                if think_batch:
                                    thinking_content += think_batch
                                    yield f'data: {json.dumps({"type": "thinking", "content": think_batch})}\n\n'
                                if reply_batch:
                                    reply_content += reply_batch
                                    yield f'data: {json.dumps({"type": "token", "content": reply_batch})}\n\n'

                            except (json.JSONDecodeError, KeyError, IndexError):
                                continue

                        # Flush any leftover tag buffer (non-Ollama providers only)
                        if tag_buffer:
                            if in_think:
                                thinking_content += tag_buffer
                                yield f'data: {json.dumps({"type": "thinking", "content": tag_buffer})}\n\n'
                            else:
                                reply_content += tag_buffer
                                yield f'data: {json.dumps({"type": "token", "content": tag_buffer})}\n\n'

                except Exception:
                    # Fallback: use the already-fetched non-streaming response
                    raw_content = msg.get("content", "")
                    think_match = re.search(r'<think>(.*?)</think>', raw_content, flags=re.DOTALL)
                    if think_match:
                        thinking_content = think_match.group(1).strip()
                        if thinking_content:
                            yield f'data: {json.dumps({"type": "thinking", "content": thinking_content})}\n\n'
                    reply = re.sub(r'<think>.*?</think>', '', raw_content, flags=re.DOTALL).strip()
                    if reply:
                        yield f'data: {json.dumps({"type": "token", "content": reply})}\n\n'
                    reply_content = reply

                clean_reply = reply_content.strip() if reply_content else ""
                if not clean_reply and full_content:
                    clean_reply = "I've thought about it, but have nothing else to say."

                history.append({"role": "assistant", "content": clean_reply})
                _conversations[conversation_id] = history

                yield f'data: {json.dumps({"type": "done", "conversation_id": conversation_id, "thinking": thinking_content.strip()})}\n\n'
                return

    yield f'data: {json.dumps({"type": "token", "content": "I ran into a complex query. Could you try rephrasing?"})}\n\n'
    yield f'data: {json.dumps({"type": "done", "conversation_id": conversation_id, "thinking": ""})}\n\n'


def _summarize_tool_result(tool_name: str, result: Any) -> str:
    """Create a short human-readable summary of what a tool returned."""
    if isinstance(result, dict) and "error" in result:
        return f"❌ {result['error'][:80]}"

    summaries = {
        "search_items": lambda r: f"Found {r.get('total_count', 0)} results",
        "list_laundry": lambda r: f"{len(r) if isinstance(r, list) else 0} items in laundry",
        "list_rewearable": lambda r: f"{len(r) if isinstance(r, list) else 0} rewearable items",
        "list_lent_items": lambda r: f"{len(r) if isinstance(r, list) else 0} lent items",
        "list_lost_items": lambda r: f"{len(r) if isinstance(r, list) else 0} lost items",
        "get_wardrobe_stats": lambda r: "Fetched wardrobe stats",
        "list_locations": lambda r: "Fetched location tree",
        "list_all_items": lambda r: f"{len(r) if isinstance(r, list) else 0} items",
        "get_item_details": lambda r: f"Got details for {r.get('name', 'item')}",
        "move_item": lambda r: f"Moved {r.get('name', 'item')}",
        "wear_item": lambda r: f"Logged wear for {r.get('name', 'item')}",
        "wash_item": lambda r: f"Washed {r.get('name', 'item')}",
        # Location management
        "create_location": lambda r: f"Created location '{r.get('name', 'location')}'",
        "update_location": lambda r: f"Updated location '{r.get('name', 'location')}'",
        "delete_location": lambda r: "Location deleted",
        "add_alias": lambda r: f"Added alias to '{r.get('name', 'location')}'",
        "remove_alias": lambda r: "Alias removed",
        # Item management
        "create_item": lambda r: f"Created item '{r.get('name', 'item')}'",
        "update_item": lambda r: f"Updated item '{r.get('name', 'item')}'",
        "delete_item": lambda r: "Item deleted",
        "get_item_history": lambda r: f"{len(r) if isinstance(r, list) else 0} history entries",
        # Loan & status tracking
        "lend_item": lambda r: f"Lent '{r.get('name', 'item')}' to {r.get('borrower_name', 'someone')}",
        "return_from_loan": lambda r: f"'{r.get('name', 'item')}' marked as returned",
        "mark_lost": lambda r: f"'{r.get('name', 'item')}' marked as lost",
        "mark_found": lambda r: f"'{r.get('name', 'item')}' marked as found",
    }
    try:
        return summaries.get(tool_name, lambda r: "Done")(result)
    except Exception:
        return "Done"


def clear_conversation(conversation_id: str = "default"):
    """Clear conversation history."""
    _conversations.pop(conversation_id, None)
    _conversation_meta.pop(conversation_id, None)


def list_conversations() -> list:
    """List all conversations with metadata."""
    result = []
    for cid, meta in _conversation_meta.items():
        msgs = _conversations.get(cid, [])
        result.append({
            "id": cid,
            "title": meta.get("title", "Untitled"),
            "created_at": meta.get("created_at", ""),
            "updated_at": meta.get("updated_at", ""),
            "message_count": len(msgs),
        })
    # Sort by updated_at descending
    result.sort(key=lambda x: x["updated_at"], reverse=True)
    return result


def get_conversation_messages(conversation_id: str) -> list:
    """Get full message history for a conversation."""
    return _conversations.get(conversation_id, [])
