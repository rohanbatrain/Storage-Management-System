"""
LLM Service — OpenAI-compatible chat completions with tool calling.

Supports OpenAI, OpenRouter, Ollama, and any compatible API.
Configure via LLM_API_KEY, LLM_BASE_URL, LLM_MODEL env vars.
"""

import httpx
import json
import logging
import re
from typing import Any

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
                r = await client.get(f"{api_base}/items/lent")
            elif tool_name == "list_lost_items":
                r = await client.get(f"{api_base}/items/lost")
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
    history.append({"role": "user", "content": message})

    # Track metadata
    import datetime
    now = datetime.datetime.utcnow().isoformat() + "Z"
    if conversation_id not in _conversation_meta:
        _conversation_meta[conversation_id] = {
            "title": message[:60].strip() or "New Chat",
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
