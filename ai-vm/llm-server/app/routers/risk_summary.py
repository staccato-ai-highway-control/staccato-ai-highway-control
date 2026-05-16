from fastapi import APIRouter

from app.schemas.risk_schema import RiskSummaryRequest
from app.services.llm_service import generate_risk_summary

router = APIRouter()


@router.post("/internal/llm/risk-summary")
def risk_summary(request: RiskSummaryRequest):
    return generate_risk_summary(request.model_dump())
