from fastapi import APIRouter

from app.schemas.chatbot_schema import ChatbotAnswerRequest
from app.services.llm_service import generate_chatbot_answer

router = APIRouter()


@router.post("/internal/llm/chatbot/answer")
def chatbot_answer(request: ChatbotAnswerRequest):
    return generate_chatbot_answer(request.model_dump())
