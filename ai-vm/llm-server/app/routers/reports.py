from fastapi import APIRouter

router = APIRouter(prefix="/internal/llm/reports", tags=["LLM Reports"])

@router.post("/generate")
def generate_report():
    return {
        "success": True,
        "message": "Mock LLM report generated",
        "data": {
            "report_title": "도로 위 정차 사고 보고서 초안",
            "summary": "주행 차로 내 차량 정차가 감지되었습니다.",
            "report_content": "AI 분석 결과, 주행 차로 ROI 내부에서 차량이 일정 시간 이상 정차한 것으로 판단됩니다. 관제자는 CCTV 원본 확인 후 사고 상태를 검토해야 합니다.",
            "llm_provider": "MOCK",
            "llm_model": "mock-llm",
            "prompt_version": "v1"
        }
    }
