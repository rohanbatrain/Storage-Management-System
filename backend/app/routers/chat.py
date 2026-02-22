"""
Chat Router — Natural language interface to SMS.

POST /chat           { message, conversation_id? }  →  { reply, actions[] }
GET  /chat/settings  →  current LLM configuration
PUT  /chat/settings  { provider, base_url, api_key, model }  →  updated config
POST /chat/test      →  test LLM connection
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid
import json
import logging
from pathlib import Path

from app.config import get_settings
from app.services.llm_service import chat as llm_chat, clear_conversation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])

# ---------------------------------------------------------------------------
# Settings persistence (JSON file in data dir)
# ---------------------------------------------------------------------------

PROVIDER_PRESETS = {
    "ollama": {
        "base_url": "http://localhost:11434/v1",
        "default_model": "qwen3:8b",
        "needs_key": False,
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
        "needs_key": True,
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "meta-llama/llama-3.1-8b-instruct:free",
        "needs_key": True,
    },
    "custom": {
        "base_url": "",
        "default_model": "",
        "needs_key": True,
    },
}


def _settings_path() -> Path:
    settings = get_settings()
    if settings.is_frozen:
        return Path(settings.data_dir) / "llm_settings.json"
    return Path("backend/data/llm_settings.json")


def _load_llm_settings() -> dict:
    """Load LLM settings from file, falling back to env-var config."""
    path = _settings_path()
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            pass
    # Fall back to env vars
    s = get_settings()
    return {
        "provider": "ollama" if "11434" in s.llm_base_url else (
            "openai" if "openai" in s.llm_base_url else "custom"
        ),
        "base_url": s.llm_base_url,
        "api_key": s.llm_api_key,
        "model": s.llm_model,
    }


def _save_llm_settings(data: dict):
    path = _settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ToolAction(BaseModel):
    tool: str
    args: dict
    summary: str


class ChatResponse(BaseModel):
    reply: str
    actions: List[ToolAction]
    conversation_id: str


class LLMSettingsRequest(BaseModel):
    provider: str = "ollama"
    base_url: str = "http://localhost:11434/v1"
    api_key: str = ""
    model: str = "qwen3:8b"


class LLMSettingsResponse(BaseModel):
    provider: str
    base_url: str
    api_key: str  # masked in response
    model: str
    providers: dict


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/settings", response_model=LLMSettingsResponse)
def get_llm_settings():
    """Get current LLM configuration."""
    data = _load_llm_settings()
    # Mask API key for display
    key = data.get("api_key", "")
    masked = (key[:4] + "..." + key[-4:]) if len(key) > 8 else ("***" if key else "")
    return LLMSettingsResponse(
        provider=data.get("provider", "ollama"),
        base_url=data.get("base_url", ""),
        api_key=masked,
        model=data.get("model", ""),
        providers=PROVIDER_PRESETS,
    )


@router.put("/settings")
def update_llm_settings(req: LLMSettingsRequest):
    """Update LLM configuration. Persists across restarts."""
    data = {
        "provider": req.provider,
        "base_url": req.base_url,
        "api_key": req.api_key,
        "model": req.model,
    }
    _save_llm_settings(data)
    return {"status": "updated", **{k: v for k, v in data.items() if k != "api_key"}}


@router.post("/test")
async def test_llm_connection():
    """Test the current LLM connection with a simple ping."""
    import httpx
    data = _load_llm_settings()
    base_url = data.get("base_url", "")
    api_key = data.get("api_key", "")
    model = data.get("model", "")

    if not base_url or not model:
        raise HTTPException(status_code=400, detail="No LLM configured. Set provider in Settings.")

    try:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Say 'hello' in one word."}],
                    "max_tokens": 10,
                },
            )
            r.raise_for_status()
            reply = r.json()["choices"][0]["message"]["content"]
            return {"status": "connected", "model": model, "reply": reply.strip()}
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail=f"Cannot connect to {base_url}. Is the LLM server running?")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"LLM error {e.response.status_code}: {e.response.text[:200]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


@router.post("", response_model=ChatResponse)
async def send_message(req: ChatRequest):
    """Send a natural language message."""
    settings = get_settings()
    conv_id = req.conversation_id or str(uuid.uuid4())

    port = 8000
    api_base = f"http://127.0.0.1:{port}{settings.api_v1_prefix}"

    result = await llm_chat(
        message=req.message,
        conversation_id=conv_id,
        api_base=api_base,
    )

    return ChatResponse(
        reply=result["reply"],
        actions=[ToolAction(**a) for a in result["actions"]],
        conversation_id=conv_id,
    )


@router.delete("/history/{conversation_id}")
def delete_conversation(conversation_id: str):
    """Clear conversation history."""
    clear_conversation(conversation_id)
    return {"status": "cleared", "conversation_id": conversation_id}
