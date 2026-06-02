from __future__ import annotations

import os

from .detector import Detection


REALTIME_ROAD_ROI_FILTER_ENABLED = os.getenv(
    "REALTIME_ROAD_ROI_FILTER_ENABLED",
    "true",
).lower() in {"1", "true", "yes", "on"}


DEFAULT_ROAD_ROI_RATIOS: dict[str, list[tuple[float, float]]] = {
    # camera-1 판교분기점 기준 임시 도로 영역.
    # 좌측 표지판/글자/교각 영역 오탐을 제외하고 실제 주행 차로 위주로 통과시킵니다.
    "camera-1": [
        (0.42, 0.28),
        (0.72, 0.16),
        (1.00, 0.16),
        (1.00, 1.00),
        (0.12, 1.00),
        (0.35, 0.72),
    ],
}


def _env_key_for_camera(camera_id: str) -> str:
    return camera_id.upper().replace("-", "_")


def _parse_roi_ratio_polygon(raw_value: str | None) -> list[tuple[float, float]]:
    if not raw_value:
        return []

    points: list[tuple[float, float]] = []
    for token in raw_value.split(";"):
        token = token.strip()
        if not token:
            continue

        try:
            x_text, y_text = token.split(",", 1)
            x = float(x_text.strip())
            y = float(y_text.strip())
        except ValueError:
            continue

        points.append((min(max(x, 0.0), 1.0), min(max(y, 0.0), 1.0)))

    return points if len(points) >= 3 else []


def _road_roi_ratio_polygon(camera_id: str) -> list[tuple[float, float]]:
    env_key = f"REALTIME_ROAD_ROI_{_env_key_for_camera(camera_id)}"
    configured = _parse_roi_ratio_polygon(os.getenv(env_key))
    if configured:
        return configured

    return DEFAULT_ROAD_ROI_RATIOS.get(camera_id, [])


def _point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    x, y = point
    inside = False
    j = len(polygon) - 1

    for i in range(len(polygon)):
        xi, yi = polygon[i]
        xj, yj = polygon[j]

        intersects = (yi > y) != (yj > y)
        if intersects:
            denominator = yj - yi
            if denominator == 0:
                j = i
                continue

            x_intersection = ((xj - xi) * (y - yi) / denominator) + xi
            if x < x_intersection:
                inside = not inside

        j = i

    return inside


def filter_detections_by_road_roi(
    *,
    camera_id: str,
    detections: list[Detection],
    frame_shape: tuple[int, ...],
) -> list[Detection]:
    if not REALTIME_ROAD_ROI_FILTER_ENABLED:
        return detections

    ratio_polygon = _road_roi_ratio_polygon(camera_id)
    if len(ratio_polygon) < 3:
        return detections

    height, width = frame_shape[:2]
    if width <= 0 or height <= 0:
        return detections

    polygon = [(x_ratio * width, y_ratio * height) for x_ratio, y_ratio in ratio_polygon]

    filtered: list[Detection] = []
    for detection in detections:
        bbox = detection.bbox
        if len(bbox) < 4:
            continue

        x1, _y1, x2, y2 = [float(value) for value in bbox[:4]]
        bottom_center = ((x1 + x2) / 2.0, y2)

        if _point_in_polygon(bottom_center, polygon):
            filtered.append(detection)

    return filtered
