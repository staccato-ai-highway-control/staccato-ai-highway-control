from fastapi import APIRouter

router = APIRouter(prefix="/internal/llm", tags=["LLM Health"])

@router.get("/health")
def health_check():
    return {
        "success": True,
        "service": "llm-server",
        "status": "ok"
    }
