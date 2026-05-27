from __future__ import annotations

from collections import OrderedDict
from datetime import datetime, timezone
from threading import Lock
from typing import Any
import uuid


MAX_STORED_EVENTS = 500
_events: OrderedDict[str, dict[str, Any]] = OrderedDict()
_camera_statuses: dict[str, dict[str, Any]] = {}
_lock = Lock()


class RelayValidationError(ValueError):
    pass


def store_event(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise RelayValidationError("event payload must be a JSON object")

    camera_id = _clean_string(payload.get("camera_id"))
    event_type = _clean_string(payload.get("event_type"))
    if not camera_id:
        raise RelayValidationError("camera_id is required")
    if not event_type:
        raise RelayValidationError("event_type is required")

    event = dict(payload)
    event["event_id"] = _clean_string(event.get("event_id")) or _new_event_id()
    event["camera_id"] = camera_id
    event["event_type"] = event_type.upper()
    event["severity"] = (_clean_string(event.get("severity")) or "INFO").upper()
    event["status"] = (_clean_string(event.get("status")) or "NEW").upper()
    event["timestamp"] = _clean_string(event.get("timestamp")) or _now_iso()
    event["received_at"] = _now_iso()

    with _lock:
        _events[event["event_id"]] = event
        _events.move_to_end(event["event_id"], last=False)
        while len(_events) > MAX_STORED_EVENTS:
            _events.popitem(last=True)

    return event


def list_events(
    *,
    limit: int = 100,
    camera_id: str | None = None,
    event_type: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    normalized_event_type = event_type.upper() if event_type else None
    normalized_status = status.upper() if status else None
    safe_limit = max(1, min(int(limit or 100), MAX_STORED_EVENTS))

    with _lock:
        events = list(_events.values())

    filtered = []
    for event in events:
        if camera_id and event.get("camera_id") != camera_id:
            continue
        if normalized_event_type and event.get("event_type") != normalized_event_type:
            continue
        if normalized_status and event.get("status") != normalized_status:
            continue

        filtered.append(event)
        if len(filtered) >= safe_limit:
            break

    return filtered


def get_event(event_id: str) -> dict[str, Any] | None:
    with _lock:
        return _events.get(event_id)


def build_replay(event: dict[str, Any]) -> dict[str, Any]:
    return {
        "event_id": event["event_id"],
        "camera_id": event["camera_id"],
        "timestamp": event.get("timestamp"),
        "snapshot_url": event.get("snapshot_url"),
        "video_url": event.get("video_url"),
        "stream_url": event.get("stream_url"),
        "event": event,
    }


def upsert_camera_status(camera_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise RelayValidationError("camera status payload must be a JSON object")

    clean_camera_id = _clean_string(camera_id)
    if not clean_camera_id:
        raise RelayValidationError("camera_id is required")

    status = dict(payload)
    status["camera_id"] = clean_camera_id
    status["camera_name"] = _clean_string(
        status.get("camera_name") or status.get("name")
    )
    status["status"] = (_clean_string(status.get("status")) or "UNKNOWN").upper()
    status["updated_at"] = _now_iso()

    with _lock:
        _camera_statuses[clean_camera_id] = status

    return status


def list_camera_statuses() -> list[dict[str, Any]]:
    with _lock:
        return sorted(_camera_statuses.values(), key=lambda item: item["camera_id"])


def get_camera_status(camera_id: str) -> dict[str, Any] | None:
    with _lock:
        return _camera_statuses.get(camera_id)


def _clean_string(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _new_event_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return f"evt_{stamp}_{uuid.uuid4().hex[:8]}"
