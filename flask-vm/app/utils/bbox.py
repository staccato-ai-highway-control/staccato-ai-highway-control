from __future__ import annotations

from typing import Any


def build_bbox_metadata(
    bbox: Any,
    *,
    coordinate_space: str | None = None,
    frame_width: int | None = None,
    frame_height: int | None = None,
) -> dict:
    normalized = _normalize_bbox(bbox)
    present = bbox not in (None, "", [], {})
    return {
        "present": present,
        "valid": normalized is not None,
        "format": "xyxy" if normalized is not None else None,
        "coordinate_space": coordinate_space or "PIXEL",
        "frame_width": frame_width,
        "frame_height": frame_height,
        "coordinates": normalized,
        "error": "INVALID_BBOX_FORMAT" if present and normalized is None else None,
    }


def _normalize_bbox(value: Any) -> dict[str, float] | None:
    if isinstance(value, dict):
        keys = ("x1", "y1", "x2", "y2")
        if not all(key in value for key in keys):
            return None
        raw_values = [value[key] for key in keys]
    elif isinstance(value, (list, tuple)) and len(value) == 4:
        keys = ("x1", "y1", "x2", "y2")
        raw_values = list(value)
    else:
        return None

    try:
        coordinates = {
            key: float(raw_value)
            for key, raw_value in zip(keys, raw_values)
        }
    except (TypeError, ValueError):
        return None

    if coordinates["x2"] <= coordinates["x1"] or coordinates["y2"] <= coordinates["y1"]:
        return None

    return coordinates
