from fastapi import APIRouter

from app.services.llm_service import get_llm_health

router = APIRouter()


@router.get("/internal/llm/health")
def llm_health():
    return get_llm_health()
