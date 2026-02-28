import os
import json
import logging
import asyncio
from typing import Any
from pathlib import Path
from dotenv import load_dotenv

from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli, rtc, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, silero

from app.services.llm_service import TOOLS, execute_tool

load_dotenv()
logger = logging.getLogger("sms-livekit-agent")
logger.setLevel(logging.INFO)

def _load_llm_settings() -> dict:
    # Try to load from data/llm_settings.json
    path = Path("backend/data/llm_settings.json")
    if not path.exists():
        path = Path("data/llm_settings.json")
        
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception as e:
            logger.error(f"Failed to parse llm_settings.json: {e}")
    
    # Fallback to env vars
    return {
        "provider": os.getenv("LLM_PROVIDER", "ollama"),
        "base_url": os.getenv("LLM_BASE_URL", "http://localhost:11434/v1"),
        "api_key": os.getenv("LLM_API_KEY", ""),
        "model": os.getenv("LLM_MODEL", "qwen3:8b"),
    }

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    settings = _load_llm_settings()
    provider = settings.get("provider", "ollama")
    base_url = settings.get("base_url", "http://localhost:11434/v1")
    api_key = settings.get("api_key", "")
    model = settings.get("model", "qwen3:8b")

    logger.info(f"Starting LiveKit Agent with provider {provider}, model {model} at {base_url}")

    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are SMS Assistant, a helpful AI for a Storage Management System. "
            "You keep your responses concise and conversational. "
            "You can help users find items, manage wardrobe, and organize storage."
            "CRITICAL: Always search for locations and items by name to get their UUIDs before trying to use them in tools."
        ),
    )

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # We use livekit-plugins-openai which requires a base_url parameter for OpenAI compatible APIs like Ollama
    # If the provider is openai, we just use the default OpenAI client, but with the openai plugin

    # --- Tool Calling Integration ---
    # Create a wrapper class that exposes all our existing REST-based tools to the LLM
    class SMSToolWrapper(llm.FunctionContext):
        pass

    # Dynamically bind all tools from llm_service.py's TOOLS list to the wrapper
    wrapper_instance = SMSToolWrapper()
    
    # We dynamically create methods on the wrapper instance so @llm.ai_callable can register them
    for tool_def in TOOLS:
        func_name = tool_def["function"]["name"]
        func_desc = tool_def["function"]["description"]
        
        # We need to capture func_name in the closure
        def make_tool_func(name):
            @llm.ai_callable(name=name, description=func_desc)
            async def dynamic_tool(self, **kwargs):
                logger.info(f"[Voice Agent Tool Call] {name}({kwargs})")
                try:
                    # Execute the existing llm_service logic
                    # Using default local API base since this is running on the same server
                    result = await execute_tool(name, kwargs, "http://127.0.0.1:8000/api")
                    # Return compact JSON representation
                    return json.dumps(result)[:2000] # Truncate to avoid context limit overflow
                except Exception as e:
                    logger.error(f"Voice Agent Tool Error ({name}): {e}")
                    return json.dumps({"error": str(e)})
            
            # Need to define arguments from schema dynamically
            # (LiveKit inspects the function signature or we can let it accept **kwargs
            # Since LiveKit 0.8+, **kwargs is supported for ai_callable if we rely on the schema.)
            # If strictly needed, we could build a dynamic signature, but LLM usually passes kwargs fine.
            return dynamic_tool
            
        # Bind the generated method to our class
        setattr(SMSToolWrapper, func_name, make_tool_func(func_name))

    # Re-instantiate now that the class has methods
    fnc_ctx = SMSToolWrapper()
    
    # We need to initialize the LLM. 
    llm_instance = openai.LLM(
        base_url=base_url,
        api_key=api_key or "sk-dummy",  # openai requires an api_key even if it's dummy for ollama
        model=model,
    )

    # Note: If generating speech (TTS), we also need a TTS provider. 
    # Usually OpenAI's TTS is used. Cartesia/ElevenLabs are alternatives.
    # If using Ollama, it only supports text. We might not have a local TTS out of the box.
    # We'll use openai TTS / STT if OPENAI_API_KEY is in env, else it'll try to use the base_url, 
    # which will fail if the local server doesn't support audio endings.
    
    # Determine STT/TTS 
    # By default, use OpenAI STT/TTS if standard OpenAI is configured or if OPENAI_API_KEY env is set.
    has_openai_key = bool(os.getenv("OPENAI_API_KEY"))
    stt_instance = openai.STT() if has_openai_key else openai.STT(base_url=base_url, api_key=api_key or "sk-dummy")
    tts_instance = openai.TTS() if has_openai_key else openai.TTS(base_url=base_url, api_key=api_key or "sk-dummy")

    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=stt_instance,
        llm=llm_instance,
        tts=tts_instance,
        chat_ctx=initial_ctx,
        fnc_ctx=fnc_ctx,
    )

    agent.start(ctx.room)

    await agent.say("Hi there! I am your SMS Assistant. How can I help you organize today?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
