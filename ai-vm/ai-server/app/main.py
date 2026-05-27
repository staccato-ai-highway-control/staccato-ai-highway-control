from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.cameras import camera_registry
from app.config import CORS_ORIGINS
from app.routers import cameras, detection, media, traffic
from app.stream_server import active_stream_counts

app = FastAPI(
    title="STACCATO AI Server",
    description="YOLO/OpenCV based vehicle stop detection server",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection.router)
app.include_router(traffic.router)
app.include_router(cameras.router)
app.include_router(media.router)


@app.get("/")
def index():
    return {
        "success": True,
        "service": "ai-server",
        "runtime": "FastAPI",
        "message": "STACCATO AI Server is running",
        "endpoints": [
            "/internal/ai/health",
            "/internal/ai/analyze",
            "/traffic/api/cctv",
            "/internal/cameras",
            "/internal/cameras/{camera_id}/start",
            "/internal/cameras/{camera_id}/stop",
            "/internal/cameras/{camera_id}/detections",
            "/internal/cameras/{camera_id}/rois",
            "/internal/cameras/{camera_id}/manual-event",
            "/streams/{camera_id}.mjpeg",
            "/snapshots/{camera_id}/latest.jpg",
            "/events/{event_id}.jpg",
            "/events/{event_id}.mp4",
        ],
    }


@app.get("/internal/ai/health")
def health_check():
    return {
        "success": True,
        "service": "ai-server",
        "status": "ok",
        "cameras": camera_registry.list_statuses(),
        "streams": active_stream_counts(),
    }


@app.on_event("shutdown")
def shutdown_camera_workers():
    camera_registry.stop_all()
