from __future__ import annotations
# 역할: 카메라별 갓길/중앙분리대 ROI 설정을 기본값 또는 JSON 파일에서 읽고 저장합니다.

import json
from threading import Lock
from typing import Any

from .config import DEFAULT_ROIS, ROI_SETTINGS_PATH


ROI_IDS = ("LEFT_SHOULDER", "MEDIAN", "RIGHT_SHOULDER")
ROI_CAMERA_IDS = {"camera-1", "camera-2"}

_lock = Lock()


# get_default_rois 기능을 수행하는 함수입니다.
def get_default_rois() -> dict[str, list[list[int]]]:
    return {
        roi_id: [list(point) for point in DEFAULT_ROIS[roi_id]]
        for roi_id in ROI_IDS
    }


# get_camera_rois 기능을 수행하는 함수입니다.
def get_camera_rois(camera_id: str) -> dict[str, list[list[int]]]:
    settings = _load_settings()
    camera_rois = settings.get(camera_id)
    if not isinstance(camera_rois, dict):
        return get_default_rois()
    return _normalize_rois(camera_rois)


# save_camera_rois 기능을 수행하는 함수입니다.
def save_camera_rois(camera_id: str, rois: dict[str, Any]) -> dict[str, list[list[int]]]:
    if camera_id not in ROI_CAMERA_IDS:
        raise ValueError("ROI settings are only supported for camera-1 and camera-2.")

    normalized_rois = _normalize_rois(rois)
    with _lock:
        settings = _load_settings_unlocked()
        settings[camera_id] = normalized_rois
        ROI_SETTINGS_PATH.write_text(
            json.dumps(settings, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    return normalized_rois


# _load_settings 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _load_settings() -> dict[str, Any]:
    with _lock:
        return _load_settings_unlocked()


# _load_settings_unlocked 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _load_settings_unlocked() -> dict[str, Any]:
    if not ROI_SETTINGS_PATH.exists():
        return {}

    try:
        loaded = json.loads(ROI_SETTINGS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}

    return loaded if isinstance(loaded, dict) else {}


# _normalize_rois 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _normalize_rois(rois: dict[str, Any]) -> dict[str, list[list[int]]]:
    normalized = get_default_rois()
    for roi_id in ROI_IDS:
        if roi_id not in rois:
            continue

        points = rois[roi_id]
        if not isinstance(points, list) or len(points) < 3:
            raise ValueError(f"{roi_id} must have at least 3 points.")

        normalized[roi_id] = [_normalize_point(point, roi_id) for point in points]

    return normalized


# _normalize_point 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _normalize_point(point: Any, roi_id: str) -> list[int]:
    if not isinstance(point, list | tuple) or len(point) != 2:
        raise ValueError(f"{roi_id} point must be [x, y].")

    x, y = point
    if not isinstance(x, int | float) or not isinstance(y, int | float):
        raise ValueError(f"{roi_id} point values must be numbers.")

    return [int(round(x)), int(round(y))]
