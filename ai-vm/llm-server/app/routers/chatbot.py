from fastapi import APIRouter

router = APIRouter(prefix="/internal/llm/chatbot", tags=["LLM Chatbot"])

@router.post("/answer")
def answer_chatbot():
    return {
        "success": True,
        "message": "Mock chatbot answer generated",
        "data": {
            "answer": "이 사고는 주행 차로 내 정차로 판단되어 위험도가 높습니다. 정차 지속 시간과 ROI 위치를 확인해야 합니다.",
            "llm_provider": "MOCK",
            "llm_model": "mock-llm",
            "prompt_version": "v1"
        }
    }
