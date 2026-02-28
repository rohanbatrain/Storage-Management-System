"""
Chat Router — Natural language interface to SMS.

POST /chat           { message, conversation_id? }  →  { reply, actions[] }
GET  /chat/settings  →  current LLM configuration
PUT  /chat/settings  { provider, base_url, api_key, model }  →  updated config
POST /chat/test      →  test LLM connection
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import uuid
import json
import logging
from pathlib import Path

from app.config import get_settings
from app.services.llm_service import chat as llm_chat, chat_stream as llm_chat_stream, clear_conversation, list_conversations, get_conversation_messages

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
        "stt_provider": "browser",
        "tts_provider": "pyttsx3",
        "livekit_url": getattr(s, "livekit_url", ""),
        "livekit_api_key": getattr(s, "livekit_api_key", ""),
        "livekit_api_secret": getattr(s, "livekit_api_secret", ""),
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
    image_base64: Optional[str] = None


class ToolAction(BaseModel):
    tool: str
    args: dict
    summary: str


class ChatResponse(BaseModel):
    reply: str
    actions: List[ToolAction]
    conversation_id: str
    thinking: Optional[str] = None


class LLMSettingsRequest(BaseModel):
    provider: str = "ollama"
    base_url: str = "http://localhost:11434/v1"
    api_key: str = ""
    model: str = "qwen3:8b"
    stt_provider: str = "browser"
    tts_provider: str = "pyttsx3"
    livekit_url: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""


class LLMSettingsResponse(BaseModel):
    provider: str
    base_url: str
    api_key: str  # masked in response
    model: str
    providers: dict
    stt_provider: str
    tts_provider: str
    livekit_url: str
    livekit_api_key: str # masked
    livekit_api_secret: str # masked


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
    
    lk_key = data.get("livekit_api_key", "")
    lk_key_masked = (lk_key[:4] + "..." + lk_key[-4:]) if len(lk_key) > 8 else ("***" if lk_key else "")
    
    lk_secret = data.get("livekit_api_secret", "")
    lk_secret_masked = (lk_secret[:4] + "..." + lk_secret[-4:]) if len(lk_secret) > 8 else ("***" if lk_secret else "")
    
    return LLMSettingsResponse(
        provider=data.get("provider", "ollama"),
        base_url=data.get("base_url", ""),
        api_key=masked,
        model=data.get("model", ""),
        providers=PROVIDER_PRESETS,
        stt_provider=data.get("stt_provider", "browser"),
        tts_provider=data.get("tts_provider", "pyttsx3"),
        livekit_url=data.get("livekit_url", ""),
        livekit_api_key=lk_key_masked,
        livekit_api_secret=lk_secret_masked,
    )

@router.get("/ollama/presets")
def get_ollama_presets():
    """Return a curated list of Ollama models for easy downloading."""
    return {
        "Vision & Multimodal": [
            {"id": "llama3.2-vision", "name": "Llama 3.2 Vision (11B)", "desc": "Great for image understanding and auto-tagging"},
            {"id": "llava:7b", "name": "LLaVA 7B", "desc": "Fast, basic multimodal model"},
            {"id": "qwen2.5-vl", "name": "Qwen 2.5 VL", "desc": "Advanced multimodal from Alibaba"}
        ],
        "General Text": [
            {"id": "llama3.2", "name": "Llama 3.2 (3B)", "desc": "Fast text model suitable for memory-constrained devices"},
            {"id": "qwen3:8b", "name": "Qwen 2.5 (8B)", "desc": "Default robust text model"}
        ]
    }

class OllamaPullRequest(BaseModel):
    model: str

@router.post("/ollama/pull")
async def pull_ollama_model(req: OllamaPullRequest):
    """Trigger a download of a model in the local Ollama daemon."""
    import httpx
    settings = _load_llm_settings()
    
    if settings.get("provider") != "ollama":
        raise HTTPException(status_code=400, detail="Current LLM Provider is not Ollama.")
        
    base_url = settings.get("base_url", "http://localhost:11434/v1")
    # Convert OpenAI-compatible /v1 url to native Ollama API
    ollama_api = base_url.replace("/v1", "/api") if base_url.endswith("/v1") else f"{base_url}/api"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Check if model already exists
            tags_resp = await client.get(f"{ollama_api}/tags")
            if tags_resp.status_code == 200:
                models = [m.get("name") for m in tags_resp.json().get("models", [])]
                if req.model in models or f"{req.model}:latest" in models:
                    return {"status": "already_installed", "model": req.model}
            
            request = client.build_request("POST", f"{ollama_api}/pull", json={"model": req.model, "stream": False})
            response = await client.send(request, stream=True)
            
            if response.status_code == 200:
                pass
            
            return {"status": "pulling", "model": req.model, "message": "Model download started in background"}
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Cannot connect to Ollama daemon.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


@router.get("/ollama/models")
async def list_ollama_models():
    """List all models currently installed in the local Ollama daemon."""
    import httpx
    settings = _load_llm_settings()
    base_url = settings.get("base_url", "http://localhost:11434/v1")
    ollama_api = base_url.replace("/v1", "/api") if base_url.endswith("/v1") else f"{base_url}/api"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{ollama_api}/tags")
            if resp.status_code != 200:
                return {"models": [], "active": settings.get("model", "")}
            raw_models = resp.json().get("models", [])
            models = []
            for m in raw_models:
                name = m.get("name", "")
                size_gb = round(m.get("size", 0) / (1024**3), 1)
                models.append({"id": name, "size_gb": size_gb})
            return {"models": models, "active": settings.get("model", "")}
    except httpx.ConnectError:
        return {"models": [], "active": settings.get("model", ""), "error": "Ollama not running"}
    except Exception as e:
        return {"models": [], "active": settings.get("model", ""), "error": str(e)[:100]}


class ModelSwitchRequest(BaseModel):
    model: str

@router.patch("/model")
def switch_model(req: ModelSwitchRequest):
    """Quick-switch the active model without changing other settings."""
    data = _load_llm_settings()
    data["model"] = req.model
    _save_llm_settings(data)
    return {"model": req.model, "status": "switched"}



@router.put("/settings")
def update_llm_settings(req: LLMSettingsRequest):
    """Update LLM configuration. Persists across restarts."""
    data = {
        "provider": req.provider,
        "base_url": req.base_url,
        "api_key": req.api_key,
        "model": req.model,
        "stt_provider": req.stt_provider,
        "tts_provider": req.tts_provider,
        "livekit_url": req.livekit_url,
        "livekit_api_key": req.livekit_api_key,
        "livekit_api_secret": req.livekit_api_secret,
    }
    
    # Do not overwrite with masked values if the user submitted masked values
    existing = _load_llm_settings()
    if "***" in req.api_key or "..." in req.api_key:
        data["api_key"] = existing.get("api_key", "")
    if "***" in req.livekit_api_key or "..." in req.livekit_api_key:
        data["livekit_api_key"] = existing.get("livekit_api_key", "")
    if "***" in req.livekit_api_secret or "..." in req.livekit_api_secret:
        data["livekit_api_secret"] = existing.get("livekit_api_secret", "")
    
    _save_llm_settings(data)
    
    # Return masked values
    safe_data = {**data}
    if safe_data.get("api_key"): safe_data["api_key"] = "***"
    if safe_data.get("livekit_api_key"): safe_data["livekit_api_key"] = "***"
    if safe_data.get("livekit_api_secret"): safe_data["livekit_api_secret"] = "***"
    
    return {"status": "updated", **safe_data}


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
        err_text = e.response.text.lower()
        if e.response.status_code == 404 and ("model" in err_text and "not found" in err_text):
            raise HTTPException(status_code=404, detail=f"Model '{model}' is not installed. Please download it first.")
        raise HTTPException(status_code=502, detail=f"LLM error {e.response.status_code}: {e.response.text[:200]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


@router.post("/stream")
async def stream_message(req: ChatRequest):
    """Stream a chat response via SSE (newline-delimited JSON)."""
    settings = get_settings()
    conv_id = req.conversation_id or str(uuid.uuid4())
    port = 8000
    api_base = f"http://127.0.0.1:{port}{settings.api_v1_prefix}"

    async def event_generator():
        async for event in llm_chat_stream(
            message=req.message,
            image_base64=req.image_base64,
            conversation_id=conv_id,
            api_base=api_base,
        ):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("", response_model=ChatResponse)
async def send_message(req: ChatRequest):
    """Send a natural language message."""
    settings = get_settings()
    conv_id = req.conversation_id or str(uuid.uuid4())

    port = 8000
    api_base = f"http://127.0.0.1:{port}{settings.api_v1_prefix}"

    result = await llm_chat(
        message=req.message,
        image_base64=req.image_base64,
        conversation_id=conv_id,
        api_base=api_base,
    )

    return ChatResponse(
        reply=result["reply"],
        actions=[ToolAction(**a) for a in result["actions"]],
        conversation_id=conv_id,
        thinking=result.get("thinking", ""),
    )


@router.delete("/history/{conversation_id}")
def delete_conversation(conversation_id: str):
    """Clear conversation history."""
    clear_conversation(conversation_id)
    return {"status": "cleared", "conversation_id": conversation_id}


@router.get("/conversations")
def get_conversations():
    """List all conversations with metadata."""
    return list_conversations()


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str):
    """Get full message history for a conversation."""
    messages = get_conversation_messages(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}


@router.delete("/conversations/{conversation_id}")
def delete_conversation_by_id(conversation_id: str):
    """Delete a specific conversation."""
    clear_conversation(conversation_id)
    return {"status": "deleted", "conversation_id": conversation_id}
