from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any

from app.services.llm_generation_service import generate_mock_report

router = APIRouter()


class GenerateReportRequest(BaseModel):
    incident: dict[str, Any] = Field(default_factory=dict)
    detection_logs: list[dict[str, Any]] = Field(default_factory=list)
    memos: list[dict[str, Any]] = Field(default_factory=list)


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "llm-server",
    }


@router.post("/llm/reports/generate")
def generate_report(request: GenerateReportRequest):
    """
    Mock LLM report generation endpoint.

    실제 로컬 LLM 모델 연결 전까지는 템플릿 기반 Mock 응답을 반환한다.
    """
    return generate_mock_report(
        incident=request.incident,
        detection_logs=request.detection_logs,
        memos=request.memos,
    )
