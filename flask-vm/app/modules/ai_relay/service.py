from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.extensions import db
from app.models import AiEvent


DEFAULT_EVENT_LIMIT = 100
MAX_EVENT_LIMIT = 500
EVENT_ID_MAX_LENGTH = 191


class RelayValidationError(ValueError):
    pass


def store_event(payload: dict[str, Any]) -> tuple[AiEvent, str]:
    if not isinstance(payload, dict):
        raise RelayValidationError("event payload must be a JSON object")

    event_id = _required_string(payload, "event_id")
    camera_id = _required_string(payload, "camera_id")
    event_type = _required_string(payload, "event_type")
    event_timestamp = _parse_timestamp(_required_string(payload, "timestamp"))

    if len(event_id) > EVENT_ID_MAX_LENGTH:
        raise RelayValidationError(
            f"event_id must be {EVENT_ID_MAX_LENGTH} characters or fewer"
        )

    now = _utc_now_naive()
    event = db.session.get(AiEvent, event_id)
    status = "updated" if event else "created"

    if event is None:
        event = AiEvent(event_id=event_id, received_at=now)
        db.session.add(event)
    else:
        event.updated_at = now

    event.camera_id = camera_id
    event.event_type = event_type.upper()
    event.severity = (_optional_string(payload, "severity") or "INFO").upper()
    event.status = (_optional_string(payload, "status") or "NEW").upper()
    event.event_timestamp = event_timestamp
    event.track_id = _optional_string(payload, "track_id")
    event.roi_id = _optional_string(payload, "roi_id")
    event.lane_type = _optional_string(payload, "lane_type")
    event.bbox_json = payload.get("bbox")
    event.snapshot_url = _optional_string(payload, "snapshot_url")
    event.video_url = _optional_string(payload, "video_url")
    event.stream_url = _optional_string(payload, "stream_url")
    event.message = _optional_string(payload, "message")
    event.raw_event_json = dict(payload)

    db.session.commit()

    return event, status


def list_events(
    *,
    limit: int | None = DEFAULT_EVENT_LIMIT,
    camera_id: str | None = None,
    event_type: str | None = None,
    status: str | None = None,
) -> list[AiEvent]:
    safe_limit = _safe_limit(limit)

    query = AiEvent.query

    clean_camera_id = _clean_string(camera_id)
    if clean_camera_id:
        query = query.filter(AiEvent.camera_id == clean_camera_id)

    clean_event_type = _clean_string(event_type)
    if clean_event_type:
        query = query.filter(AiEvent.event_type == clean_event_type.upper())

    clean_status = _clean_string(status)
    if clean_status:
        query = query.filter(AiEvent.status == clean_status.upper())

    return (
        query
        .order_by(
            AiEvent.event_timestamp.desc(),
            AiEvent.received_at.desc(),
            AiEvent.event_id.desc(),
        )
        .limit(safe_limit)
        .all()
    )


def get_event(event_id: str) -> AiEvent | None:
    clean_event_id = _clean_string(event_id)
    if not clean_event_id:
        return None

    return db.session.get(AiEvent, clean_event_id)


def build_replay(event: AiEvent) -> dict[str, Any]:
    event_dict = event.to_dict()

    return {
        "event_id": event.event_id,
        "camera_id": event.camera_id,
        "timestamp": event_dict.get("timestamp"),
        "snapshot_url": event.snapshot_url,
        "video_url": event.video_url,
        "stream_url": event.stream_url,
        "event": event_dict,
    }


def _required_string(payload: dict[str, Any], field_name: str) -> str:
    value = _clean_string(payload.get(field_name))
    if not value:
        raise RelayValidationError(f"{field_name} is required")
    return value


def _optional_string(payload: dict[str, Any], field_name: str) -> str | None:
    return _clean_string(payload.get(field_name))


def _clean_string(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def _parse_timestamp(value: str) -> datetime:
    raw = value.strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"

    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise RelayValidationError("timestamp must be a valid ISO datetime") from exc

    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed.replace(microsecond=0)


def _safe_limit(limit: int | None) -> int:
    try:
        parsed = int(limit or DEFAULT_EVENT_LIMIT)
    except (TypeError, ValueError):
        return DEFAULT_EVENT_LIMIT

    if parsed <= 0:
        return DEFAULT_EVENT_LIMIT

    return min(parsed, MAX_EVENT_LIMIT)


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
