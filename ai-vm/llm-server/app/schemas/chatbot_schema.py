from typing import Any

from pydantic import BaseModel, Field


class ChatbotAnswerRequest(BaseModel):
    message: str = Field(..., description="사용자 질문")
    incident_context: dict[str, Any] = Field(default_factory=dict)
