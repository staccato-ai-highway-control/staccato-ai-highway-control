from fastapi import FastAPI

from app.config import settings
from app.routers.health_router import router as health_router


app = FastAPI(
    title="STACCATO ITS Server",
    description="ITS integration server for traffic, weather, road, and route data",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "service": settings.SERVICE_NAME,
        "status": "running",
    }


@app.get("/constraints")
def get_its_constraints():
    return {
        "max_processing_time_seconds": settings.ITS_MAX_PROCESSING_TIME_SECONDS,
        "request_batch_size": settings.ITS_REQUEST_BATCH_SIZE,
        "max_processing_count": settings.ITS_MAX_PROCESSING_COUNT,
    }


app.include_router(health_router)
