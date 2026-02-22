#!/usr/bin/env python3
"""
MCP Server for Storage Management System (SMS).

Standalone stdio-based JSON-RPC server implementing the Model Context Protocol.
Connect from Claude Desktop, Cursor, or any MCP-compatible client.

Usage:
    python mcp_server.py

Environment:
    SMS_API_URL  - Base URL of the SMS API (default: http://localhost:8000/api)
"""

import sys
import json
import os
import httpx
import asyncio
import logging

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("mcp-sms")

API_BASE = os.environ.get("SMS_API_URL", "http://localhost:8000/api")

# ---------------------------------------------------------------------------
# MCP Tool Definitions
# ---------------------------------------------------------------------------

MCP_TOOLS = [
    {
        "name": "search_items",
        "description": "Search for items and locations by name or description.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search term"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_item_details",
        "description": "Get full details of a specific item by its ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "string", "description": "Item UUID"}
            },
            "required": ["item_id"]
        }
    },
    {
        "name": "list_laundry",
        "description": "List all clothing items that need washing.",
        "inputSchema": {"type": "object", "properties": {}}
    },
    {
        "name": "list_rewearable",
        "description": "List clothing safe to wear again.",
        "inputSchema": {"type": "object", "properties": {}}
    },
    {
        "name": "list_lent_items",
        "description": "List items currently lent out.",
        "inputSchema": {"type": "object", "properties": {}}
    },
    {
        "name": "list_lost_items",
        "description": "List items currently marked as lost.",
        "inputSchema": {"type": "object", "properties": {}}
    },
    {
        "name": "move_item",
        "description": "Move an item to a different location.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "string", "description": "Item UUID"},
                "to_location_id": {"type": "string", "description": "Destination location UUID"},
                "is_temporary": {"type": "boolean", "description": "Temporary placement?", "default": False}
            },
            "required": ["item_id", "to_location_id"]
        }
    },
    {
        "name": "wear_item",
        "description": "Log wearing a clothing item.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "string", "description": "Clothing item UUID"}
            },
            "required": ["item_id"]
        }
    },
    {
        "name": "wash_item",
        "description": "Mark a clothing item as washed.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "string", "description": "Clothing item UUID"}
            },
            "required": ["item_id"]
        }
    },
    {
        "name": "get_wardrobe_stats",
        "description": "Get wardrobe analytics.",
        "inputSchema": {"type": "object", "properties": {}}
    },
    {
        "name": "list_locations",
        "description": "List all storage locations as a tree.",
        "inputSchema": {"type": "object", "properties": {}}
    },
    {
        "name": "list_all_items",
        "description": "List all items, optionally filtered by location.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "location_id": {"type": "string", "description": "Optional location UUID filter"}
            }
        }
    },
]

# ---------------------------------------------------------------------------
# Tool Execution
# ---------------------------------------------------------------------------

async def execute_tool(name: str, args: dict) -> str:
    """Execute a tool by calling the SMS REST API and return JSON string."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            if name == "search_items":
                r = await client.get(f"{API_BASE}/search", params={"q": args["query"]})
            elif name == "get_item_details":
                r = await client.get(f"{API_BASE}/items/{args['item_id']}")
            elif name == "list_laundry":
                r = await client.get(f"{API_BASE}/wardrobe/laundry")
            elif name == "list_rewearable":
                r = await client.get(f"{API_BASE}/wardrobe/rewear-safe")
            elif name == "list_lent_items":
                r = await client.get(f"{API_BASE}/items/lent")
            elif name == "list_lost_items":
                r = await client.get(f"{API_BASE}/items/lost")
            elif name == "move_item":
                r = await client.post(
                    f"{API_BASE}/items/{args['item_id']}/move",
                    json={"to_location_id": args["to_location_id"], "is_temporary": args.get("is_temporary", False)}
                )
            elif name == "wear_item":
                r = await client.post(f"{API_BASE}/wardrobe/{args['item_id']}/wear")
            elif name == "wash_item":
                r = await client.post(f"{API_BASE}/wardrobe/{args['item_id']}/wash")
            elif name == "get_wardrobe_stats":
                r = await client.get(f"{API_BASE}/wardrobe/stats")
            elif name == "list_locations":
                r = await client.get(f"{API_BASE}/locations/tree")
            elif name == "list_all_items":
                params = {}
                if args.get("location_id"):
                    params["location_id"] = args["location_id"]
                r = await client.get(f"{API_BASE}/items", params=params)
            else:
                return json.dumps({"error": f"Unknown tool: {name}"})

            r.raise_for_status()
            return json.dumps(r.json(), default=str)
        except Exception as e:
            return json.dumps({"error": str(e)})

# ---------------------------------------------------------------------------
# MCP Protocol Handler
# ---------------------------------------------------------------------------

def make_response(id, result):
    return {"jsonrpc": "2.0", "id": id, "result": result}


def make_error(id, code, message):
    return {"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}}


async def handle_request(request: dict) -> dict:
    """Handle a single MCP JSON-RPC request."""
    method = request.get("method", "")
    id = request.get("id")
    params = request.get("params", {})

    if method == "initialize":
        return make_response(id, {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {
                "name": "sms-mcp-server",
                "version": "0.0.1",
            }
        })

    elif method == "notifications/initialized":
        return None  # No response needed for notifications

    elif method == "tools/list":
        return make_response(id, {"tools": MCP_TOOLS})

    elif method == "tools/call":
        tool_name = params.get("name", "")
        tool_args = params.get("arguments", {})
        logger.info(f"Tool call: {tool_name}({tool_args})")

        result_text = await execute_tool(tool_name, tool_args)

        return make_response(id, {
            "content": [{"type": "text", "text": result_text}],
            "isError": False,
        })

    elif method == "ping":
        return make_response(id, {})

    else:
        return make_error(id, -32601, f"Method not found: {method}")

# ---------------------------------------------------------------------------
# Main Loop (stdio)
# ---------------------------------------------------------------------------

async def main():
    logger.info(f"SMS MCP Server started. API: {API_BASE}")

    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await asyncio.get_event_loop().connect_read_pipe(lambda: protocol, sys.stdin)

    writer_transport, writer_protocol = await asyncio.get_event_loop().connect_write_pipe(
        asyncio.streams.FlowControlMixin, sys.stdout
    )
    writer = asyncio.StreamWriter(writer_transport, writer_protocol, None, asyncio.get_event_loop())

    while True:
        try:
            line = await reader.readline()
            if not line:
                break

            line = line.decode("utf-8").strip()
            if not line:
                continue

            request = json.loads(line)
            response = await handle_request(request)

            if response is not None:
                out = json.dumps(response) + "\n"
                writer.write(out.encode("utf-8"))
                await writer.drain()

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON: {e}")
        except Exception as e:
            logger.error(f"Error: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("MCP Server stopped.")
