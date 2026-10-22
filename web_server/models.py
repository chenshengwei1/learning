# web_server/models.py
from typing import List, Dict, Any
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    reply: str
    thinking: str = ""
    tool_calls: List[Dict[str, Any]] = []
    session_id: str
    token_usage: Dict[str, int] = {}
    used_tokens: int = 0
    max_tokens: int = 1000000
    remaining_tokens: int = 1000000