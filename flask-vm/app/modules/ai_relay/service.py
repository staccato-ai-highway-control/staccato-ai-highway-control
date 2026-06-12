from __future__ import annotations

import os
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from app.extensions import db
from app.models import AiEvent, RealtimeEvent
from app.utils.bbox import build_bbox_metadata


DEFAULT_EVENT_LIMIT = 100
MAX_EVENT_LIMIT = 500
EVENT_ID_MAX_LENGTH = 191

RECENT_INCIDENT_EVENT_NAME = "incident.created"
AI_RELAY_SOURCE = "ai_relay"
AI_VM_PUBLIC_BASE_URL = os.getenv("AI_VM_PUBLIC_BASE_URL", "http://192.168.0.186:5001").rstrip("/")
AI_MEDIA_PUBLIC_BASE_URL = os.getenv("AI_MEDIA_PUBLIC_BASE_URL", AI_VM_PUBLIC_BASE_URL).rstrip("/")
AI_VM_INTERNAL_BASE_URLS = tuple(
    base.strip().rstrip("/")
    for base in os.getenv(
        "AI_VM_INTERNAL_BASE_URLS",
        "http://127.0.0.1:5001,http://localhost:5001,http://192.168.0.186:5001",
    ).split(",")
    if base.strip()
)


class RelayValidationError(ValueError):
    pass


def store_event(payload: dict[str, Any], *, commit: bool = True) -> tuple[AiEvent, str]:
    if not isinstance(payload, dict):
        raise RelayValidationError("event payload must be a JSON object")

    payload = _normalize_payload_urls(payload)

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
    detection = _first_detection(payload.get("detections"))
    event.bbox_json = payload.get("bbox") or detection.get("bbox")
    event.snapshot_url = _optional_string(payload, "snapshot_url")
    event.video_url = _optional_string(payload, "video_url")
    event.stream_url = _optional_string(payload, "stream_url")
    event.message = _optional_string(payload, "message")
    event.raw_event_json = dict(payload)

    _sync_realtime_event(event, now)

    if commit:
        db.session.commit()
    else:
        db.session.flush()

    return event, status


def _sync_realtime_event(event: AiEvent, now: datetime) -> RealtimeEvent:
    realtime_event = _find_realtime_event_for_ai_event(event.event_id)

    if realtime_event is None:
        realtime_event = RealtimeEvent(
            event_type="AI_EVENT",
            event_name=RECENT_INCIDENT_EVENT_NAME,
            target_role="ADMIN",
            target_room="realtime:incidents",
            target_resource_type="ai_event",
            payload={},
            send_status="PENDING",
            created_at=event.event_timestamp or now,
        )
        db.session.add(realtime_event)

    realtime_event.payload = _build_realtime_payload(event)
    realtime_event.incident_id = None
    realtime_event.target_resource_id = None
    realtime_event.error_message = None

    return realtime_event


def _find_realtime_event_for_ai_event(event_id: str) -> RealtimeEvent | None:
    # JSON 필드 쿼리 호환성 이슈를 피하기 위해 최근 항목을 Python에서 확인한다.
    candidates = (
        RealtimeEvent.query
        .filter(RealtimeEvent.event_name == RECENT_INCIDENT_EVENT_NAME)
        .order_by(RealtimeEvent.created_at.desc(), RealtimeEvent.id.desc())
        .limit(1000)
        .all()
    )

    for candidate in candidates:
        payload = candidate.payload if isinstance(candidate.payload, dict) else {}
        if payload.get("source") == AI_RELAY_SOURCE and payload.get("source_event_id") == event_id:
            return candidate

    return None


def _build_realtime_payload(event: AiEvent) -> dict[str, Any]:
    timestamp = event.event_timestamp.isoformat() if event.event_timestamp else None
    raw_event = event.raw_event_json if isinstance(event.raw_event_json, dict) else {}

    return {
        "source": AI_RELAY_SOURCE,
        "source_event_id": event.event_id,
        "ai_event_id": event.event_id,
        "event_type": event.event_type,
        "severity": event.severity,
        "incident_status": event.status,
        "cctv_id": event.camera_id,
        "source_cctv_id": event.camera_id,
        "occurred_at": timestamp,
        "message": event.message or "AI 이상상황이 감지되었습니다.",
        "track_id": event.track_id,
        "roi_type": event.roi_id,
        "lane_type": event.lane_type,
        "bbox": event.bbox_json,
        "bbox_metadata": build_bbox_metadata(
            event.bbox_json,
            coordinate_space=raw_event.get("bbox_coordinate_space"),
            frame_width=raw_event.get("frame_width"),
            frame_height=raw_event.get("frame_height"),
        ),
        "snapshot_path": _normalize_media_url(event.snapshot_url),
        "clip_path": _normalize_media_url(event.video_url),
        "snapshot_url": _normalize_media_url(event.snapshot_url),
        "video_url": _normalize_media_url(event.video_url),
        "stream_url": _normalize_media_url(event.stream_url),
        "raw_event": _normalize_payload_urls(event.raw_event_json or {}),
    }


def _normalize_payload_urls(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = deepcopy(payload)

    for key in ("snapshot_url", "video_url", "stream_url"):
        if key in normalized:
            normalized[key] = _normalize_media_url(normalized.get(key))

    return normalized


def _normalize_media_url(value: Any, public_base_url: str | None = None) -> str | None:
    text = _clean_string(value)
    if not text:
        return None

    target_base_url = (public_base_url or AI_VM_PUBLIC_BASE_URL).rstrip("/")

    for internal_base_url in AI_VM_INTERNAL_BASE_URLS:
        if text.startswith(internal_base_url):
            return f"{target_base_url}{text[len(internal_base_url):]}"

    if text.startswith(AI_VM_PUBLIC_BASE_URL):
        return f"{target_base_url}{text[len(AI_VM_PUBLIC_BASE_URL):]}"

    return text


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


def _normalize_payload_urls_for_public_response(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = deepcopy(payload)

    for key in ("snapshot_url", "video_url", "stream_url"):
        if key in normalized:
            normalized[key] = _normalize_media_url(
                normalized.get(key),
                public_base_url=AI_MEDIA_PUBLIC_BASE_URL,
            )

    return normalized


def serialize_event(event: AiEvent) -> dict[str, Any]:
    event_dict = event.to_dict()

    for key in ("snapshot_url", "video_url", "stream_url"):
        event_dict[key] = _normalize_media_url(
            event_dict.get(key),
            public_base_url=AI_MEDIA_PUBLIC_BASE_URL,
        )

    raw_event = event_dict.get("raw_event_json")
    if isinstance(raw_event, dict):
        event_dict["raw_event_json"] = _normalize_payload_urls_for_public_response(raw_event)

    return event_dict


def build_replay(event: AiEvent) -> dict[str, Any]:
    event_dict = event.to_dict()

    return {
        "event_id": event.event_id,
        "camera_id": event.camera_id,
        "timestamp": event_dict.get("timestamp"),
        "snapshot_url": _normalize_media_url(event.snapshot_url),
        "video_url": _normalize_media_url(event.video_url),
        "stream_url": _normalize_media_url(event.stream_url),
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



def build_incident_event_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Convert an AI relay event payload into IncidentEventService input."""

    if not isinstance(payload, dict):
        raise RelayValidationError("event payload must be a JSON object")

    normalized = _normalize_payload_urls(payload)
    detection = _first_detection(normalized.get("detections"))

    incident_payload = {
        "event_id": _required_string(normalized, "event_id"),
        "event_type": _required_string(normalized, "event_type"),
        "severity": _normalize_incident_severity(
            _optional_string(normalized, "severity")
        ),
        "cctv_id": _required_string(normalized, "camera_id"),
        "location_name": (
            _optional_string(normalized, "location_name")
            or _optional_string(normalized, "cctv_name")
            or _optional_string(normalized, "camera_name")
            or _optional_string(normalized, "road_name")
            or _optional_string(normalized, "source_cctv_id")
            or _optional_string(normalized, "camera_id")
        ),
        "camera_name": _optional_string(normalized, "camera_name"),
        "cctv_name": _optional_string(normalized, "cctv_name"),
        "road_name": _optional_string(normalized, "road_name"),
        "source_cctv_id": (
            _optional_string(normalized, "source_cctv_id")
            or _optional_string(normalized, "camera_id")
        ),
        "occurred_at": _required_string(normalized, "timestamp"),
        "roi_type": (
            _optional_string(normalized, "roi_type")
            or _optional_string(normalized, "roi_id")
            or _optional_string(normalized, "lane_type")
            or "UNKNOWN"
        ),
        "track_id": _optional_string(normalized, "track_id"),
        "vehicle_class": (
            _optional_string(normalized, "vehicle_class")
            or _clean_string(detection.get("class"))
        ),
        "confidence": normalized.get("confidence", detection.get("confidence")),
        "bbox": _normalize_incident_bbox(normalized.get("bbox") or detection.get("bbox")),
        "snapshot_path": (
            _optional_string(normalized, "snapshot_path")
            or _optional_string(normalized, "snapshot_url")
        ),
        "clip_path": (
            _optional_string(normalized, "clip_path")
            or _optional_string(normalized, "video_url")
        ),
        "message": _optional_string(normalized, "message"),
        "movement_delta_px": normalized.get("movement_delta_px"),
        "stopped_duration_seconds": normalized.get("stopped_duration_seconds"),
        "frame_timestamp_ms": normalized.get("frame_timestamp_ms"),
        "model_name": _optional_string(normalized, "model_name") or "AI_VM",
        "model_version": _optional_string(normalized, "model_version"),
        "raw_ai_event": normalized,
    }

    return incident_payload


def _first_detection(value: Any) -> dict[str, Any]:
    if isinstance(value, list) and value:
        first = value[0]
        if isinstance(first, dict):
            return first

    return {}


def _normalize_incident_bbox(value: Any) -> dict[str, float] | None:
    if value in (None, ""):
        return None

    if isinstance(value, dict):
        return value

    if isinstance(value, (list, tuple)) and len(value) == 4:
        x1, y1, x2, y2 = value
        try:
            return {
                "x1": float(x1),
                "y1": float(y1),
                "x2": float(x2),
                "y2": float(y2),
            }
        except (TypeError, ValueError) as exc:
            raise RelayValidationError("bbox coordinates must be numbers") from exc

    raise RelayValidationError("bbox must be an object or [x1, y1, x2, y2] list")


def _normalize_incident_severity(value: str | None) -> str:
    severity = (value or "MEDIUM").strip().upper()

    return {
        "INFO": "LOW",
        "WARNING": "MEDIUM",
        "WARN": "MEDIUM",
        "DANGER": "HIGH",
        "CRITICAL": "HIGH",
        "ERROR": "HIGH",
    }.get(severity, severity)
