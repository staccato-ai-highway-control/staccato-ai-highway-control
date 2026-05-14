from fastapi import APIRouter

from app.schemas.report_schema import ReportGenerateRequest
from app.services.llm_service import generate_report

router = APIRouter()


@router.post("/internal/llm/reports/generate")
def report_generate(request: ReportGenerateRequest):
    return generate_report(request.model_dump())
