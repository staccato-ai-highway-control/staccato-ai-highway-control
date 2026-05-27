from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response, StreamingResponse

from app.cameras import camera_registry
from app.config import EVENT_MEDIA_DIR
from app.routers.cameras import _effective_analysis_fps
from app.stream_server import BOUNDARY, claim_stream_slot, mjpeg_generator


router = APIRouter(tags=["AI Media"])


@router.get("/streams/{camera_id}.mjpeg")
def camera_mjpeg_stream(
    camera_id: str,
    source_url: str | None = Query(default=None),
    name: str | None = Query(default=None),
    target_fps: float = Query(default=10.0, gt=0, le=60),
    analysis_fps: float = Query(default=0.2, ge=0, le=30),
    quality: int = Query(default=80, ge=1, le=100),
):
    worker = camera_registry.get_camera(camera_id)
    clean_source_url = source_url.strip() if source_url else None
    clean_name = name.strip() if name else None
    source_changed = bool(
        clean_source_url
        and worker is not None
        and worker.source_url != clean_source_url
        and not worker.matches_source_identity(name=clean_name, source_url=clean_source_url)
    )

    if clean_source_url and (worker is None or not worker.is_running() or source_changed):
        worker = camera_registry.start_camera(
            camera_id=camera_id,
            source_url=clean_source_url,
            name=clean_name,
            target_fps=target_fps,
            analysis_fps=_effective_analysis_fps(camera_id, analysis_fps),
        )

    if worker is None:
        raise HTTPException(
            status_code=404,
            detail="Camera worker not found. Start it first or pass source_url.",
        )

    slot = claim_stream_slot(camera_id)
    if slot is None:
        raise HTTPException(
            status_code=429,
            detail="Too many MJPEG stream clients. Close another viewer and retry.",
        )

    return StreamingResponse(
        mjpeg_generator(worker, quality=quality, slot=slot),
        media_type=f"multipart/x-mixed-replace; boundary={BOUNDARY}",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/snapshots/{camera_id}/latest.jpg")
def camera_latest_snapshot(
    camera_id: str,
    quality: int = Query(default=90, ge=1, le=100),
):
    worker = camera_registry.get_camera(camera_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Camera worker not found.")

    jpeg = worker.get_latest_jpeg(quality=quality)
    if jpeg is None:
        raise HTTPException(status_code=404, detail="No frame available yet.")

    return Response(
        content=jpeg,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/events/{event_id}.jpg")
def event_snapshot(event_id: str):
    path = EVENT_MEDIA_DIR / "snapshots" / f"{_safe_event_id(event_id)}.jpg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Event snapshot not found.")
    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/events/{event_id}.mp4")
def event_video(event_id: str):
    path = EVENT_MEDIA_DIR / "videos" / f"{_safe_event_id(event_id)}.mp4"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Event video not found.")
    return FileResponse(
        path,
        media_type="video/mp4",
        headers={"Cache-Control": "no-store"},
    )


def _safe_event_id(event_id: str) -> str:
    safe_id = "".join(char for char in event_id if char.isalnum() or char in {"_", "-"})
    if not safe_id:
        raise HTTPException(status_code=400, detail="Invalid event_id.")
    return safe_id
