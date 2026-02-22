"""
Chat Router — Natural language interface to SMS.

POST /chat  { message, conversation_id? }  →  { reply, actions[] }
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.config import get_settings
from app.services.llm_service import chat as llm_chat, clear_conversation

router = APIRouter(prefix="/chat", tags=["Chat"])


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


@router.post("", response_model=ChatResponse)
async def send_message(req: ChatRequest):
    """
    Send a natural language message. The LLM will search, query,
    and perform actions on your inventory as needed.
    """
    settings = get_settings()

    # Generate conversation ID if not provided
    conv_id = req.conversation_id or str(uuid.uuid4())

    # Build the internal API URL for tool execution
    # The LLM service calls our own REST API to execute tools
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
    """Clear conversation history for a given ID."""
    clear_conversation(conversation_id)
    return {"status": "cleared", "conversation_id": conversation_id}
