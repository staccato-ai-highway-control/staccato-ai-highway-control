from __future__ import annotations

from collections import deque
from copy import deepcopy
from datetime import datetime
from threading import Lock
from typing import Any

from .config import ANALYZED_CAMERA_IDS, BBOX_HISTORY_MAX_ITEMS


STREAM_ONLY_BBOX_MESSAGE = (
    "camera is stream-only; bbox metadata is available only for camera-1 and camera-2"
)

_latest_bbox_metadata: dict[str, dict[str, Any]] = {}
_latest_bbox_metadata_lock = Lock()
_bbox_metadata_history: dict[str, deque[dict[str, Any]]] = {}


def is_analyzed_camera(camera_id: str) -> bool:
    return camera_id in ANALYZED_CAMERA_IDS


def build_bbox_metadata(
    *,
    camera_id: str,
    frame_id: int,
    timestamp: datetime,
    frame_shape: tuple[int, ...],
    detections: list[dict[str, Any]],
) -> dict[str, Any]:
    height, width = frame_shape[:2]

    return {
        "camera_id": camera_id,
        "frame_id": frame_id,
        "timestamp": timestamp.isoformat(),
        "frame_width": width,
        "frame_height": height,
        "bbox_format": "xyxy",
        "detections": [_normalize_detection(detection) for detection in detections],
    }


def set_latest_bbox_metadata(camera_id: str, metadata: dict[str, Any]) -> None:
    if not is_analyzed_camera(camera_id):
        return

    with _latest_bbox_metadata_lock:
        copied = deepcopy(metadata)
        _latest_bbox_metadata[camera_id] = copied

        history = _bbox_metadata_history.setdefault(
            camera_id,
            deque(maxlen=max(1, BBOX_HISTORY_MAX_ITEMS)),
        )
        latest_frame_id = copied.get("frame_id")
        if history and history[-1].get("frame_id") == latest_frame_id:
            history[-1] = copied
        else:
            history.append(copied)


def get_latest_bbox_metadata(camera_id: str) -> dict[str, Any] | None:
    if not is_analyzed_camera(camera_id):
        return None

    with _latest_bbox_metadata_lock:
        metadata = _latest_bbox_metadata.get(camera_id)
        return deepcopy(metadata) if metadata is not None else None


def get_bbox_metadata_history(
    camera_id: str,
    *,
    start: datetime | None = None,
    end: datetime | None = None,
) -> list[dict[str, Any]]:
    if not is_analyzed_camera(camera_id):
        return []

    with _latest_bbox_metadata_lock:
        history = list(_bbox_metadata_history.get(camera_id, ()))

    if start is None and end is None:
        return [deepcopy(item) for item in history]

    filtered: list[dict[str, Any]] = []
    for item in history:
        timestamp = _parse_timestamp(item.get("timestamp"))
        if timestamp is None:
            continue
        if start is not None and timestamp < start:
            continue
        if end is not None and timestamp > end:
            continue
        filtered.append(deepcopy(item))

    return filtered


def clear_latest_bbox_metadata(camera_id: str) -> None:
    with _latest_bbox_metadata_lock:
        _latest_bbox_metadata.pop(camera_id, None)
        _bbox_metadata_history.pop(camera_id, None)


def _normalize_detection(detection: dict[str, Any]) -> dict[str, Any]:
    bbox = detection.get("bbox") or [0.0, 0.0, 0.0, 0.0]
    return {
        "track_id": detection.get("track_id"),
        "class_name": str(detection.get("class_name") or "object"),
        "confidence": float(detection.get("confidence") or 0.0),
        "bbox": [float(value) for value in bbox[:4]],
        "roi_id": detection.get("roi_id"),
        "status": str(detection.get("status") or "TRACKING"),
    }


def _parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None

    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None
