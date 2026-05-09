from fastapi import APIRouter

router = APIRouter(prefix="/internal/llm", tags=["LLM Risk Summary"])

@router.post("/risk-summary")
def risk_summary():
    return {
        "success": True,
        "message": "Mock risk summary generated",
        "data": {
            "risk_level": "HIGH",
            "risk_reason": "주행 차로 내부 정차, 정차 지속 시간 10초 이상, 높은 AI confidence로 인해 위험도가 HIGH로 판단됩니다."
        }
    }
