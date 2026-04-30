from fastapi import FastAPI

from app.config import settings
from app.routers.health_router import router as health_router


app = FastAPI(
    title="STACCATO AI Server",
    description="AI-X video analysis server for stopped vehicle detection",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "service": settings.SERVICE_NAME,
        "status": "running",
    }


app.include_router(health_router)
