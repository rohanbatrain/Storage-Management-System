import tempfile
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from openai import OpenAI
import httpx

from app.database import get_db
from app.config import get_settings
from app.services.llm_service import process_voice_command

try:
    from livekit.api import AccessToken, VideoGrants
except ImportError:
    AccessToken, VideoGrants = None, None

router = APIRouter(prefix="/api/voice", tags=["voice"])
settings = get_settings()

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Accepts a short audio recording from the mobile app (e.g. .m4a or .wav)
    and transcribes it using a fast cloud Whisper API (like Groq) or local Whisper.
    Then, it passes the text to the LLM router to execute the intelligent command.
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    _, ext = os.path.splitext(audio.filename)
    if not ext:
        ext = ".m4a" # default if missing
        
    # Read the file into a temporary file so `openai` library can read from disk
    content = await audio.read()
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # For blazing fast transcription, Groq Whisper API is highly recommended.
        # Fallback to OpenAI if Groq isn't configured.
        # Check settings for Voice API Key, fallback to standard LLM Api Key
        api_key = os.environ.get("GROQ_API_KEY") or settings.llm_api_key
        
        if not api_key:
            raise HTTPException(status_code=400, detail="No API Key configured for Voice Transcription.")

        # Determine baser_url based on key heuristcs (sk- = openai, gsk_ = groq)
        base_url = "https://api.groq.com/openai/v1" if api_key.startswith("gsk_") else "https://api.openai.com/v1"
        model = "whisper-large-v3" if api_key.startswith("gsk_") else "whisper-1"

        client = OpenAI(api_key=api_key, base_url=base_url)
        
        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model=model,
                file=audio_file,
                response_format="text"
            )
            
        transcribed_text = str(transcript).strip()
        
        if not transcribed_text:
           return {"status": "success", "transcript": "", "reply": "I couldn't hear anything."}
           
        # Pass the transcribed text to the existing intelligent LLM router!
        # `process_voice_command` should parse intents like "Pack red sweater into Trip A"
        reply = await process_voice_command(transcribed_text, db)

        return {"status": "success", "transcript": transcribed_text, "reply": reply}
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Transcription Service Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process audio: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.get("/livekit/token")
async def get_livekit_token(room: str = "sms-room", identity: str = "mobile-user"):
    """
    Generate a LiveKit Participant Token for the mobile client.
    """
    livekit_url = os.environ.get("LIVEKIT_URL")
    api_key = os.environ.get("LIVEKIT_API_KEY")
    api_secret = os.environ.get("LIVEKIT_API_SECRET")
    
    if not livekit_url or not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit credentials not configured. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env.")
        
    if not AccessToken:
         raise HTTPException(status_code=500, detail="livekit-api not installed on backend.")

    token = AccessToken(api_key, api_secret) \
        .with_identity(identity) \
        .with_name("Mobile User") \
        .with_grants(VideoGrants(
            room_join=True,
            room=room,
        ))
    
    return {"token": token.to_jwt(), "url": livekit_url}
