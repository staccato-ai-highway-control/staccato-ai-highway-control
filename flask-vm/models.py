"""Flask-VM Relay data normalization helpers."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any


KST = timezone(timedelta(hours=9))
EVENT_SEVERITIES = {"INFO", "WARNING", "CRITICAL"}
EVENT_STATUSES = {"NEW", "ACKNOWLEDGED", "RESOLVED", "IGNORED"}


class ValidationError(ValueError):
    """Raised when an incoming relay payload is not usable."""


def now_iso() -> str:
    return datetime.now(KST).isoformat(timespec="seconds")


def generate_event_id() -> str:
    stamp = datetime.now(KST).strftime("%Y%m%d_%H%M%S")
    return f"evt_{stamp}_{uuid.uuid4().hex[:8]}"


def _clean_optional_string(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalize_bbox(value: Any) -> list[float] | None:
    if value is None:
        return None
    if not isinstance(value, list) or len(value) != 4:
        raise ValidationError("bbox must be a list of four numbers")
    try:
        return [float(item) for item in value]
    except (TypeError, ValueError) as exc:
        raise ValidationError("bbox must contain only numbers") from exc


def _normalize_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError("estimated_speed_kmh must be a number") from exc


def _normalize_track_id(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError("track_id must be an integer") from exc


def normalize_event_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValidationError("event payload must be a JSON object")

    camera_id = _clean_optional_string(payload.get("camera_id"))
    event_type = _clean_optional_string(payload.get("event_type"))
    if not camera_id:
        raise ValidationError("camera_id is required")
    if not event_type:
        raise ValidationError("event_type is required")

    severity = _clean_optional_string(payload.get("severity")) or "INFO"
    severity = severity.upper()
    if severity not in EVENT_SEVERITIES:
        raise ValidationError(f"severity must be one of {sorted(EVENT_SEVERITIES)}")

    status = _clean_optional_string(payload.get("status")) or "NEW"
    status = status.upper()
    if status not in EVENT_STATUSES:
        raise ValidationError(f"status must be one of {sorted(EVENT_STATUSES)}")

    normalized = {
        "event_id": _clean_optional_string(payload.get("event_id")) or generate_event_id(),
        "camera_id": camera_id,
        "camera_name": _clean_optional_string(payload.get("camera_name")),
        "event_type": event_type.upper(),
        "severity": severity,
        "timestamp": _clean_optional_string(payload.get("timestamp")) or now_iso(),
        "bbox": _normalize_bbox(payload.get("bbox")),
        "track_id": _normalize_track_id(payload.get("track_id")),
        "roi_id": _clean_optional_string(payload.get("roi_id")),
        "lane_type": _clean_optional_string(payload.get("lane_type")),
        "estimated_speed_kmh": _normalize_float(payload.get("estimated_speed_kmh")),
        "message": _clean_optional_string(payload.get("message")),
        "snapshot_url": _clean_optional_string(payload.get("snapshot_url")),
        "video_url": _clean_optional_string(payload.get("video_url")),
        "stream_url": _clean_optional_string(payload.get("stream_url")),
        "status": status,
    }
    normalized["raw_event_json"] = json.dumps({**payload, **normalized}, ensure_ascii=False)
    normalized["created_at"] = now_iso()
    return normalized


def normalize_camera_status_payload(camera_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValidationError("camera status payload must be a JSON object")

    clean_camera_id = _clean_optional_string(camera_id)
    if not clean_camera_id:
        raise ValidationError("camera_id is required")

    status = _clean_optional_string(payload.get("status")) or "UNKNOWN"
    normalized = {
        "camera_id": clean_camera_id,
        "camera_name": _clean_optional_string(payload.get("camera_name") or payload.get("name")),
        "status": status.upper(),
        "stream_url": _clean_optional_string(payload.get("stream_url")),
        "last_frame_at": _clean_optional_string(payload.get("last_frame_at")),
        "last_event_at": _clean_optional_string(payload.get("last_event_at")),
        "raw_status_json": json.dumps(payload, ensure_ascii=False),
        "updated_at": now_iso(),
    }
    return normalized
