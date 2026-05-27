from fastapi import APIRouter, HTTPException, Query

from app.cameras import camera_registry
from app.config import (
    MANUAL_EVENT_CLIP_POST_SECONDS,
    MANUAL_EVENT_CLIP_PRE_SECONDS,
)
from app.detector import detector
from app.roi_config import get_camera_rois, save_camera_rois
from app.schemas.camera_schema import (
    CameraStartPayload,
    ManualEventPayload,
    RoiSettingsPayload,
)


YOLO_ENABLED_CAMERA_IDS = {"camera-1", "camera-2"}

router = APIRouter(prefix="/internal/cameras", tags=["AI Cameras"])


@router.get("")
def internal_cameras():
    return {
        "success": True,
        "data": camera_registry.list_statuses(),
    }


@router.post("/{camera_id}/start")
def internal_camera_start(camera_id: str, payload: CameraStartPayload):
    source_url = payload.source_url.strip()
    if not source_url:
        raise HTTPException(status_code=400, detail="source_url is required.")

    worker = camera_registry.start_camera(
        camera_id=camera_id,
        source_url=source_url,
        name=payload.name,
        target_fps=payload.target_fps,
        analysis_fps=_effective_analysis_fps(camera_id, payload.analysis_fps),
        analysis_queue_size=payload.analysis_queue_size,
        buffer_seconds=payload.buffer_seconds,
        stale_timeout_seconds=payload.stale_timeout_seconds,
        reconnect_backoff_seconds=payload.reconnect_backoff_seconds,
    )

    return {
        "success": True,
        "data": worker.to_status_payload(),
    }


@router.post("/{camera_id}/stop")
def internal_camera_stop(camera_id: str):
    worker = camera_registry.stop_camera(camera_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Camera worker not found.")

    return {
        "success": True,
        "data": worker.to_status_payload(),
    }


@router.get("/{camera_id}/rois")
def internal_camera_rois(camera_id: str):
    return {
        "success": True,
        "data": {
            "camera_id": camera_id,
            "rois": get_camera_rois(camera_id),
        },
    }


@router.put("/{camera_id}/rois")
def internal_camera_rois_update(camera_id: str, payload: RoiSettingsPayload):
    try:
        rois = save_camera_rois(camera_id, payload.rois)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {
        "success": True,
        "data": {
            "camera_id": camera_id,
            "rois": rois,
        },
    }


@router.post("/{camera_id}/manual-event")
def internal_camera_manual_event(camera_id: str, payload: ManualEventPayload):
    worker = camera_registry.get_camera(camera_id)
    if worker is None:
        if not payload.source_url:
            raise HTTPException(
                status_code=404,
                detail="Camera worker not found. Pass source_url or open the ITS stream first.",
            )

        worker = camera_registry.start_camera(
            camera_id=camera_id,
            source_url=payload.source_url.strip(),
            name=payload.name,
            target_fps=payload.target_fps,
            analysis_fps=_effective_analysis_fps(camera_id, payload.analysis_fps),
            buffer_seconds=max(
                (payload.pre_seconds or MANUAL_EVENT_CLIP_PRE_SECONDS)
                + (payload.post_seconds or MANUAL_EVENT_CLIP_POST_SECONDS)
                + 2.0,
                12.0,
            ),
        )

    event = worker.trigger_manual_event(
        event_type=payload.event_type,
        severity=payload.severity,
        message=payload.message,
        pre_seconds=payload.pre_seconds or MANUAL_EVENT_CLIP_PRE_SECONDS,
        post_seconds=payload.post_seconds or MANUAL_EVENT_CLIP_POST_SECONDS,
    )

    return {
        "success": True,
        "message": "Manual event clip queued. The replay video is available after post frames are collected.",
        "data": event,
        "clip": worker.event_clip_worker.to_status_payload(),
    }


@router.get("/{camera_id}/detections")
def internal_camera_detections(
    camera_id: str,
    refresh: bool = Query(default=False),
    confidence: float | None = Query(default=None, gt=0, le=1),
    imgsz: int | None = Query(default=None, ge=128, le=1920),
):
    worker = camera_registry.get_camera(camera_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Camera worker not found.")

    if not refresh:
        result = worker.get_latest_detection_result()
        if result is not None:
            return {
                "success": True,
                "data": result,
            }

    frame = worker.get_latest_frame()
    if frame is None:
        raise HTTPException(status_code=404, detail="No frame available yet.")

    try:
        detections = detector.detect(frame, confidence=confidence, imgsz=imgsz)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return {
        "success": True,
        "data": {
            "camera_id": camera_id,
            "model": detector.model_name,
            "detections": [item.to_dict() for item in detections],
            "count": len(detections),
            "source": "refresh",
        },
    }


def _effective_analysis_fps(camera_id: str, requested_analysis_fps: float) -> float:
    if camera_id.startswith("camera-") and camera_id not in YOLO_ENABLED_CAMERA_IDS:
        return 0.0
    return requested_analysis_fps
