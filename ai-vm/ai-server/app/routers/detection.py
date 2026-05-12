from fastapi import APIRouter
from app.schemas.detection_schema import AnalyzeRequest, AnalyzeResponse
from app.services.mock_detection_service import analyze_mock

router = APIRouter(prefix="/internal/ai", tags=["AI Detection"])


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    return analyze_mock(request)
