from fastapi import FastAPI
from app.routers import detection

app = FastAPI(
    title="STACCATO AI Server",
    description="YOLO/OpenCV based vehicle stop detection server",
    version="0.1.0",
)

app.include_router(detection.router)


@app.get("/internal/ai/health")
def health_check():
    return {
        "success": True,
        "service": "ai-server",
        "status": "ok",
    }
