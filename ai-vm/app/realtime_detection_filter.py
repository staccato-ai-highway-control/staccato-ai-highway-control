from __future__ import annotations

import os

from .detector import Detection


def _env_bool(key: str, default: str = "true") -> bool:
    return os.getenv(key, default).lower() in {"1", "true", "yes", "on"}


REALTIME_ROAD_ROI_FILTER_ENABLED = _env_bool(
    "REALTIME_ROAD_ROI_FILTER_ENABLED",
    "true",
)

REALTIME_DISPLAY_MIN_CONFIDENCE = float(
    os.getenv("REALTIME_DISPLAY_MIN_CONFIDENCE", "0.25")
)
REALTIME_DISPLAY_FAR_MIN_CONFIDENCE = float(
    os.getenv("REALTIME_DISPLAY_FAR_MIN_CONFIDENCE", "0.25")
)
REALTIME_DISPLAY_MIN_BOX_WIDTH = float(
    os.getenv("REALTIME_DISPLAY_MIN_BOX_WIDTH", "8")
)
REALTIME_DISPLAY_MIN_BOX_HEIGHT = float(
    os.getenv("REALTIME_DISPLAY_MIN_BOX_HEIGHT", "8")
)

# Display-only road ROI.
# This is not the event ROI. Event ROI is handled by event_detector/roi_config.
DEFAULT_ROAD_ROI_RATIOS: dict[str, list[tuple[float, float]]] = {
    "camera-1": [
        (0.42, 0.28),
        (0.72, 0.16),
        (1.00, 0.16),
        (1.00, 1.00),
        (0.12, 1.00),
        (0.35, 0.72),
    ],
}

# Display-only ignore rectangles for fixed CCTV overlays/captions.
# Format: x1_ratio, y1_ratio, x2_ratio, y2_ratio
DEFAULT_IGNORE_RECT_RATIOS: dict[str, list[tuple[float, float, float, float]]] = {
    "camera-1": [
        (0.00, 0.00, 1.00, 0.13),  # top CCTV caption/warning band
        (0.00, 0.38, 0.18, 0.72),  # left arrow/road text area
        (0.18, 0.72, 0.70, 0.95),  # bottom center road-name caption area
        (0.78, 0.42, 1.00, 0.74),  # right direction/caption area
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


def _parse_ignore_rects(raw_value: str | None) -> list[tuple[float, float, float, float]]:
    if not raw_value:
        return []

    rects: list[tuple[float, float, float, float]] = []
    for token in raw_value.split(";"):
        token = token.strip()
        if not token:
            continue

        try:
            x1_text, y1_text, x2_text, y2_text = token.split(",", 3)
            x1 = min(max(float(x1_text.strip()), 0.0), 1.0)
            y1 = min(max(float(y1_text.strip()), 0.0), 1.0)
            x2 = min(max(float(x2_text.strip()), 0.0), 1.0)
            y2 = min(max(float(y2_text.strip()), 0.0), 1.0)
        except ValueError:
            continue

        left, right = sorted((x1, x2))
        top, bottom = sorted((y1, y2))
        if right > left and bottom > top:
            rects.append((left, top, right, bottom))

    return rects


def _road_roi_ratio_polygon(camera_id: str) -> list[tuple[float, float]]:
    env_key = f"REALTIME_ROAD_ROI_{_env_key_for_camera(camera_id)}"
    configured = _parse_roi_ratio_polygon(os.getenv(env_key))
    if configured:
        return configured

    return DEFAULT_ROAD_ROI_RATIOS.get(camera_id, [])


def _ignore_rect_ratios(camera_id: str) -> list[tuple[float, float, float, float]]:
    env_key = f"REALTIME_IGNORE_RECTS_{_env_key_for_camera(camera_id)}"
    configured = _parse_ignore_rects(os.getenv(env_key))
    if configured:
        return configured

    return DEFAULT_IGNORE_RECT_RATIOS.get(camera_id, [])


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


def _point_in_rect(point: tuple[float, float], rect: tuple[float, float, float, float]) -> bool:
    x, y = point
    left, top, right, bottom = rect
    return left <= x <= right and top <= y <= bottom


def _passes_display_confidence(detection: Detection) -> bool:
    try:
        confidence = float(detection.confidence)
    except (TypeError, ValueError):
        return False

    source = str(getattr(detection, "source", "") or "")
    threshold = (
        REALTIME_DISPLAY_FAR_MIN_CONFIDENCE
        if source == "far_crop"
        else REALTIME_DISPLAY_MIN_CONFIDENCE
    )

    return confidence >= threshold


def filter_realtime_display_detections(
    *,
    camera_id: str,
    detections: list[Detection],
    frame_shape: tuple[int, ...],
) -> list[Detection]:
    """Filter detections for realtime bbox display only.

    Event detection should use raw detector output and its own event ROI rules.
    This filter removes CCTV fixed overlays/captions and weak text-like boxes
    before sending bbox metadata to the frontend.
    """
    if not REALTIME_ROAD_ROI_FILTER_ENABLED:
        return detections

    height, width = frame_shape[:2]
    if width <= 0 or height <= 0:
        return detections

    ratio_polygon = _road_roi_ratio_polygon(camera_id)
    road_polygon = (
        [(x_ratio * width, y_ratio * height) for x_ratio, y_ratio in ratio_polygon]
        if len(ratio_polygon) >= 3
        else []
    )

    ignore_rects = [
        (x1 * width, y1 * height, x2 * width, y2 * height)
        for x1, y1, x2, y2 in _ignore_rect_ratios(camera_id)
    ]

    filtered: list[Detection] = []
    for detection in detections:
        bbox = detection.bbox
        if len(bbox) < 4:
            continue

        x1, y1, x2, y2 = [float(value) for value in bbox[:4]]
        box_width = max(0.0, x2 - x1)
        box_height = max(0.0, y2 - y1)

        if box_width < REALTIME_DISPLAY_MIN_BOX_WIDTH:
            continue
        if box_height < REALTIME_DISPLAY_MIN_BOX_HEIGHT:
            continue
        if not _passes_display_confidence(detection):
            continue

        bottom_center = ((x1 + x2) / 2.0, y2)
        center = ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

        if road_polygon and not _point_in_polygon(bottom_center, road_polygon):
            continue

        if any(
            _point_in_rect(bottom_center, rect) or _point_in_rect(center, rect)
            for rect in ignore_rects
        ):
            continue

        filtered.append(detection)

    return filtered


def filter_detections_by_road_roi(
    *,
    camera_id: str,
    detections: list[Detection],
    frame_shape: tuple[int, ...],
) -> list[Detection]:
    # Backward-compatible alias. Prefer filter_realtime_display_detections
    # for realtime bbox/display paths.
    return filter_realtime_display_detections(
        camera_id=camera_id,
        detections=detections,
        frame_shape=frame_shape,
    )
