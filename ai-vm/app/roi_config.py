from __future__ import annotations
# 역할: 카메라별 갓길/중앙분리대 ROI 설정을 기본값 또는 JSON 파일에서 읽고 저장합니다.

import json
import math
from threading import Lock
from typing import Any

from .config import DEFAULT_ROIS, ROI_BASE_HEIGHT, ROI_BASE_WIDTH, ROI_SETTINGS_PATH


ROI_IDS = ("LEFT_SHOULDER", "MEDIAN", "RIGHT_SHOULDER")
ROI_CAMERA_IDS = {"camera-1", "camera-2"}
CANONICAL_ROI_TYPES = {
    "DRIVING_LANE",
    "SHOULDER",
    "EMERGENCY_BAY",
    "MEDIAN",
    "IGNORE_ZONE",
}
LEGACY_ROI_TYPE_MAP = {
    "LEFT_SHOULDER": "SHOULDER",
    "RIGHT_SHOULDER": "SHOULDER",
}
BBOX_ROI_BOTTOM_RATIO = 0.25

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


# resolve_camera_roi_regions 기능을 수행하는 함수입니다.
def resolve_camera_roi_regions(
    camera_id: str | None,
    override_rois: Any | None = None,
) -> list[dict[str, Any]]:
    """Return ROI regions for new analysis code without changing legacy ROI APIs."""
    if override_rois is not None:
        regions = _normalize_roi_regions(override_rois)
        if not regions:
            raise ValueError("override rois must include at least one valid polygon region.")
        return regions

    if camera_id:
        settings = _load_settings()
        camera_rois = settings.get(camera_id)
        if isinstance(camera_rois, dict):
            try:
                regions = _normalize_roi_regions(camera_rois)
            except ValueError:
                regions = []
            if regions:
                return regions

    return _normalize_roi_regions(get_default_rois())


# calculate_bbox_roi_overlaps 기능을 수행하는 함수입니다.
def calculate_bbox_roi_overlaps(
    *,
    bbox: list[float],
    frame_shape: tuple[int, ...],
    camera_id: str | None,
    override_rois: Any | None = None,
    bottom_ratio: float = BBOX_ROI_BOTTOM_RATIO,
) -> list[dict[str, Any]]:
    import cv2
    import numpy as np

    height, width = _frame_size(frame_shape)
    if width <= 0 or height <= 0:
        return []

    bottom_rect = _bbox_bottom_rect(
        bbox=bbox,
        frame_width=width,
        frame_height=height,
        bottom_ratio=bottom_ratio,
    )
    if bottom_rect is None:
        return []

    x1, y1, x2, y2 = bottom_rect
    bbox_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.rectangle(bbox_mask, (x1, y1), (x2, y2), 1, thickness=-1)
    bbox_area = int(np.count_nonzero(bbox_mask))
    if bbox_area <= 0:
        return []

    try:
        regions = resolve_camera_roi_regions(camera_id, override_rois=override_rois)
    except ValueError:
        if override_rois is not None:
            raise
        return []

    matches: list[dict[str, Any]] = []
    x_scale = width / float(ROI_BASE_WIDTH or width)
    y_scale = height / float(ROI_BASE_HEIGHT or height)

    for region in regions:
        points = region.get("points")
        if not isinstance(points, list) or len(points) < 3:
            continue

        scaled_points = []
        for point in points:
            try:
                x, y = point
                scaled_points.append(
                    [
                        int(round(float(x) * x_scale)),
                        int(round(float(y) * y_scale)),
                    ]
                )
            except (TypeError, ValueError):
                continue

        if len(scaled_points) < 3:
            continue

        roi_mask = np.zeros((height, width), dtype=np.uint8)
        polygon = np.array(scaled_points, dtype=np.int32)
        cv2.fillPoly(roi_mask, [polygon], 1)

        overlap_area = int(np.count_nonzero(cv2.bitwise_and(bbox_mask, roi_mask)))
        overlap_ratio = overlap_area / float(bbox_area)
        if overlap_ratio <= 0:
            continue

        matches.append(
            {
                "roi_id": str(region.get("id") or region.get("type") or "ROI"),
                "roi_type": str(region.get("type") or "DRIVING_LANE"),
                "roi_overlap_ratio": float(overlap_ratio),
                "roi_overlap_area": overlap_area,
            }
        )

    matches.sort(key=lambda item: item["roi_overlap_ratio"], reverse=True)
    return matches


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


# _normalize_roi_regions 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _normalize_roi_regions(raw_rois: Any) -> list[dict[str, Any]]:
    raw_rois = _unwrap_roi_payload(raw_rois)
    regions: list[dict[str, Any]] = []

    if isinstance(raw_rois, dict):
        for key, value in raw_rois.items():
            regions.extend(_normalize_roi_entry(key, value))
    elif isinstance(raw_rois, list):
        for index, value in enumerate(raw_rois):
            regions.extend(_normalize_roi_entry(f"ROI_{index + 1}", value))
    else:
        raise ValueError("rois must be an object or an array.")

    return regions


# _unwrap_roi_payload 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _unwrap_roi_payload(raw_rois: Any) -> Any:
    if not isinstance(raw_rois, dict):
        return raw_rois

    for key in ("rois", "regions", "items", "data"):
        nested = raw_rois.get(key)
        if isinstance(nested, (dict, list)):
            return nested

    return raw_rois


# _normalize_roi_entry 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _normalize_roi_entry(key: Any, value: Any) -> list[dict[str, Any]]:
    if isinstance(value, dict):
        roi_id = _first_text(
            value.get("id"),
            value.get("roi_id"),
            value.get("roiId"),
            key,
        )
        roi_type = normalize_roi_type(
            _first_text(
                value.get("type"),
                value.get("roi_type"),
                value.get("roiType"),
                value.get("zone_type"),
                value.get("zoneType"),
            ),
            roi_id=roi_id,
        )
        points = (
            value.get("points")
            or value.get("polygon")
            or value.get("vertices")
            or value.get("coordinates")
            or value.get("polygon_points")
            or value.get("polygon_json")
        )
        if points is None:
            return []
        return [
            {
                "id": roi_id or roi_type,
                "type": roi_type,
                "points": _normalize_polygon(points, roi_id or roi_type),
            }
        ]

    roi_id = _first_text(key)
    roi_type = normalize_roi_type(None, roi_id=roi_id)

    if _looks_like_polygon(value):
        return [
            {
                "id": roi_id or roi_type,
                "type": roi_type,
                "points": _normalize_polygon(value, roi_id or roi_type),
            }
        ]

    if isinstance(value, list):
        regions: list[dict[str, Any]] = []
        for index, polygon in enumerate(value):
            if not _looks_like_polygon(polygon):
                continue
            region_id = roi_id or f"{roi_type}_{index + 1}"
            if len(value) > 1:
                region_id = f"{region_id}_{index + 1}"
            regions.append(
                {
                    "id": region_id,
                    "type": roi_type,
                    "points": _normalize_polygon(polygon, region_id),
                }
            )
        return regions

    return []


# normalize_roi_type 기능을 수행하는 함수입니다.
def normalize_roi_type(value: str | None, *, roi_id: str | None = None) -> str:
    raw_value = _normalize_roi_text(value)
    raw_id = _normalize_roi_text(roi_id)

    for candidate in (raw_value, raw_id):
        if not candidate:
            continue
        mapped = LEGACY_ROI_TYPE_MAP.get(candidate, candidate)
        if mapped in CANONICAL_ROI_TYPES:
            return mapped

    return "UNKNOWN"


# _normalize_point 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _normalize_point(point: Any, roi_id: str) -> list[int]:
    if not isinstance(point, list | tuple) or len(point) != 2:
        raise ValueError(f"{roi_id} point must be [x, y].")

    x, y = point
    if not isinstance(x, int | float) or not isinstance(y, int | float):
        raise ValueError(f"{roi_id} point values must be numbers.")

    return [int(round(x)), int(round(y))]


# _normalize_polygon 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _normalize_polygon(points: Any, roi_id: str) -> list[list[int]]:
    if isinstance(points, str):
        try:
            points = json.loads(points)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{roi_id} polygon_json must be valid JSON.") from exc

    if not isinstance(points, list) or len(points) < 3:
        raise ValueError(f"{roi_id} must have at least 3 points.")
    return [_normalize_point(point, roi_id) for point in points]


# _looks_like_polygon 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _looks_like_polygon(value: Any) -> bool:
    if not isinstance(value, list) or len(value) < 3:
        return False

    first = value[0]
    if not isinstance(first, list | tuple) or len(first) != 2:
        return False

    return all(isinstance(item, int | float) for item in first)


# _first_text 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _first_text(*values: Any) -> str | None:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


# _normalize_roi_text 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _normalize_roi_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip().upper().replace("-", "_").replace(" ", "_")
    return text or None


# _frame_size 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _frame_size(frame_shape: tuple[int, ...]) -> tuple[int, int]:
    try:
        height, width = frame_shape[:2]
    except (TypeError, ValueError):
        return 0, 0
    return max(0, int(height)), max(0, int(width))


# _bbox_bottom_rect 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _bbox_bottom_rect(
    *,
    bbox: list[float],
    frame_width: int,
    frame_height: int,
    bottom_ratio: float,
) -> tuple[int, int, int, int] | None:
    try:
        x1, y1, x2, y2 = [float(value) for value in bbox]
    except (TypeError, ValueError):
        return None

    left = max(0, min(frame_width - 1, int(math.floor(min(x1, x2)))))
    right = max(0, min(frame_width - 1, int(math.ceil(max(x1, x2)))))
    top = max(0, min(frame_height - 1, int(math.floor(min(y1, y2)))))
    bottom = max(0, min(frame_height - 1, int(math.ceil(max(y1, y2)))))

    if right <= left or bottom <= top:
        return None

    box_height = bottom - top
    ratio = min(1.0, max(0.01, float(bottom_ratio or BBOX_ROI_BOTTOM_RATIO)))
    bottom_top = max(top, int(round(bottom - box_height * ratio)))

    if bottom <= bottom_top:
        return None

    return left, bottom_top, right, bottom
