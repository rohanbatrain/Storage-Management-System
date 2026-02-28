import os
import json
import logging
import asyncio
from typing import Any
from pathlib import Path
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli, llm, tts, stt
from livekit.agents.voice import Agent
from livekit.plugins import openai, silero
from livekit import rtc

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

import numpy as np
import io
import wave
from faster_whisper import WhisperModel
from livekit.agents.stt import STT, SpeechEvent, SpeechEventType, SpeechData, STTCapabilities
import pyttsx3
from livekit.agents.tts import TTS, SynthesizeStream, SynthesizedAudio
from livekit.agents import utils
from livekit import rtc

# --- Custom Local STT Adapter using Faster-Whisper ---
class LocalWhisperSTT(STT):
    def __init__(self, model_size="tiny.en"):
        super().__init__(capabilities=STTCapabilities(streaming=False))
        # Keep model on CPU to avoid complex CUDA/MPS setups for cross-platform
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")

    async def _recognize_impl(
        self,
        buffer: rtc.AudioBuffer,
        *,
        language: str | None = None,
        conn_options = None,
    ) -> SpeechEvent:
        # Buffer is rtc.AudioBuffer. We extract PCM bytes.
        frames = buffer.frames if hasattr(buffer, 'frames') else [buffer]
        audio_data = bytearray()
        for f in frames:
            audio_data.extend(f.data)
            
        # Convert PCM 16-bit to float32 normalizes between -1.0 and 1.0 (expected by whisper)
        audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
        
        # Transcribe in background thread
        def _do_transcribe():
            segments, _ = self.model.transcribe(audio_np, beam_size=1)
            return " ".join([s.text for s in segments]).strip()
            
        text = await asyncio.to_thread(_do_transcribe)
        
        return SpeechEvent(
            type=SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[SpeechData(text=text, language="en")]
        )


class LocalChunkedStream(tts.ChunkedStream):
    def __init__(self, *, tts_instance: "LocalTTS", input_text: str, conn_options: Any) -> None:
        super().__init__(tts=tts_instance, input_text=input_text, conn_options=conn_options)
        self._tts = tts_instance

    async def _run(self, output_emitter: Any) -> None:
        import tempfile
        import wave
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            
        def _run_tts():
            self._tts.engine.save_to_file(self.input_text, temp_path)
            self._tts.engine.runAndWait()
        
        await asyncio.to_thread(_run_tts)
        
        try:
            with wave.open(temp_path, 'rb') as wf:
                sample_rate = wf.getframerate()
                num_channels = wf.getnchannels()
                audio_data = wf.readframes(wf.getnframes())
                
                output_emitter.initialize(
                    request_id=utils.shortuuid(),
                    sample_rate=sample_rate,
                    num_channels=num_channels,
                    mime_type="audio/pcm"
                )
                output_emitter.push(audio_data)
                
            output_emitter.flush()
        finally:
            import os
            if os.path.exists(temp_path):
                os.remove(temp_path)

# --- Custom Local TTS Adapter using pyttsx3 ---
class LocalTTS(tts.TTS):
    def __init__(self):
        super().__init__(capabilities=tts.TTSCapabilities(streaming=False), sample_rate=16000, num_channels=1)
        self.engine = pyttsx3.init()
        # Optimize voice rate for assistant
        self.engine.setProperty('rate', 160)
        
    def synthesize(self, text: str, *, conn_options: getattr(tts, "APIConnectOptions", Any) = getattr(tts, "DEFAULT_API_CONNECT_OPTIONS", None)) -> getattr(tts, "ChunkedStream", Any):
        return LocalChunkedStream(tts_instance=self, input_text=text, conn_options=conn_options)

async def entrypoint(ctx: JobContext):
    settings = _load_llm_settings()
    provider = settings.get("provider", "ollama")
    base_url = settings.get("base_url", "http://localhost:11434/v1")
    model = settings.get("model", "llama3.1")
    api_key = settings.get("api_key", "sk-dummy")
    stt_provider = settings.get("stt_provider", "browser")
    tts_provider = settings.get("tts_provider", "pyttsx3")

    logger.info(f"Starting Local LiveKit Agent [LLM={provider}, STT={stt_provider}, TTS={tts_provider}]")

    initial_ctx = llm.ChatContext()

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # --- Tool Wrapper ---
    tools_list = []
    
    for tool_def in TOOLS:
        func_name = tool_def["function"]["name"]
        func_desc = tool_def["function"]["description"]
        
        def make_tool_func(name, schema):
            @llm.function_tool(name=name, description=func_desc, raw_schema=schema)
            async def dynamic_tool(**kwargs):
                logger.info(f"[Voice Agent Tool Call] {name}({kwargs})")
                try:
                    result = await execute_tool(name, kwargs, "http://127.0.0.1:8000/api")
                    return json.dumps(result)[:2000] 
                except Exception as e:
                    logger.error(f"Voice Agent Tool Error ({name}): {e}")
                    return json.dumps({"error": str(e)})
            return dynamic_tool
            
        tools_list.append(make_tool_func(func_name, tool_def["function"]))

    # Brain: Ollama or OpenAI
    if provider == "ollama":
        llm_instance = openai.LLM.with_ollama(
            base_url=base_url.replace("/v1", ""), # Ollama plugin expects raw URL (it will append /v1/chat/completions)
            model=model,
        )
    else:
        llm_instance = openai.LLM(
            base_url=base_url,
            api_key=api_key or "sk-dummy",
            model=model,
        )

    # -------------------------------------------------------------
    # Mouth (TTS) Switch
    # -------------------------------------------------------------
    if tts_provider == "openai":
         tts_instance = openai.TTS(api_key=api_key)
    else:
         tts_instance = LocalTTS()
    
    # -------------------------------------------------------------
    # Ear (STT) Switch
    # -------------------------------------------------------------
    if stt_provider == "openai":
        stt_instance = openai.STT(api_key=api_key)
    elif stt_provider == "whisper":
        stt_instance = LocalWhisperSTT()
    else:
        # Browser Native STT (works from Chrome client natively sending speech chunks)
        try:
             from livekit.plugins.browser import STT as BrowserSTT
             stt_instance = BrowserSTT()
        except ImportError:
             logger.warning("Browser STT plugin not installed, falling back to Whisper")
             stt_instance = LocalWhisperSTT()

    vad_instance = silero.VAD.load()

    if getattr(stt_instance.capabilities, "streaming", True) is False:
        logger.info(f"Wrapping {stt_provider} in StreamAdapter for real-time inference")
        stt_instance = stt.StreamAdapter(stt=stt_instance, vad=vad_instance)

    agent = Agent(
        instructions=(
            "You are SMS Assistant, a helpful AI for a Storage Management System. "
            "You keep your responses concisely to 1 or 2 sentences and highly conversational. "
            "You can help users find items, manage wardrobe, and organize storage."
            "CRITICAL: Always search for locations and items by name to get their UUIDs before trying to use them in tools."
        ),
        vad=vad_instance,
        stt=stt_instance,
        llm=llm_instance,
        tts=tts_instance,
        chat_ctx=initial_ctx,
        tools=tools_list,
    )

    agent.start(ctx.room)

    await agent.say("Hi there! I am your local SMS Assistant. How can I help you organize today?", allow_interruptions=True)

if __name__ == "__main__":
    settings = _load_llm_settings()
    if settings.get("livekit_url"): os.environ["LIVEKIT_URL"] = settings["livekit_url"]
    if settings.get("livekit_api_key"): os.environ["LIVEKIT_API_KEY"] = settings["livekit_api_key"]
    if settings.get("livekit_api_secret"): os.environ["LIVEKIT_API_SECRET"] = settings["livekit_api_secret"]
    
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        ),
    )
