import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
import tempfile
import uuid

try:
    from livekit.api import AccessToken, VideoGrants
except ImportError:
    AccessToken, VideoGrants = None, None

# In a real-world scenario, you would use an external service like Groq, OpenAI Whisper API, or a local Whisper model.
# For demonstration purposes, and without an API key, we will simulate the transcription if you don't have Groq installed.
try:
    from groq import Groq
    # Initialize Groq client if the token exists
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
except ImportError:
    client = None

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Receives an audio file from the mobile app, saves it temporarily, and sends it 
    to a fast Whisper endpoint (like Groq) for transcription.
    """
    if not file.filename.endswith(('.m4a', '.mp3', '.wav', '.ogg', '.flac', '.opus')):
         raise HTTPException(status_code=400, detail="Invalid audio format. Please use m4a, wav, or mp3.")

    # Create a temporary file to store the upload
    suffix = f".{file.filename.split('.')[-1]}" if '.' in file.filename else ".m4a"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_audio:
        content = await file.read()
        temp_audio.write(content)
        temp_audio_path = temp_audio.name
        
    try:
        # If we have Groq configured, use it for blazing-fast transcription
        if client:
            with open(temp_audio_path, "rb") as f:
                transcription = client.audio.transcriptions.create(
                    file=(os.path.basename(temp_audio_path), f.read()),
                    model="whisper-large-v3",
                    prompt="The user is organizing their house, storage, and wardrobe.",
                    response_format="json",
                    language="en",
                    temperature=0.0
                )
            text = transcription.text
        else:
             # Fallback: We don't have Groq set up or the package is missing.
             # Normally, you would pipe this to a local whisper.cpp instance
             # For the sake of this feature scaffolding, we will simulate a response.
             print("Warning: Groq client not initialized to transcribe audio. Returning mock text.")
             text = "Add two blue winter jackets to the top shelf in the garage."

        return {"text": text}
    
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
        
    finally:
        # Clean up the temp file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

@router.get("/livekit-token")
async def get_livekit_token(room: str = "sms-room", identity: str = "web-user"):
    """
    Generate a LiveKit Participant Token for the web/mobile client.
    """
    from app.config import get_settings
    settings = get_settings()

    livekit_url = settings.livekit_url or os.environ.get("LIVEKIT_URL")
    api_key = settings.livekit_api_key or os.environ.get("LIVEKIT_API_KEY")
    api_secret = settings.livekit_api_secret or os.environ.get("LIVEKIT_API_SECRET")
    
    if not livekit_url or not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit credentials not configured. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env.")
        
    if not AccessToken:
         raise HTTPException(status_code=500, detail="livekit-api not installed on backend.")

    token = AccessToken(api_key, api_secret) \
        .with_identity(identity) \
        .with_name("Web User") \
        .with_grants(VideoGrants(
            room_join=True,
            room=room,
        ))
    
    return {"token": token.to_jwt(), "url": livekit_url}
