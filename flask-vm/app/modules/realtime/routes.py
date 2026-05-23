from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.models import RealtimeEvent


RECENT_INCIDENT_EVENT_NAME = "incident.created"
DEFAULT_RECENT_INCIDENT_LIMIT = 30
MAX_RECENT_INCIDENT_LIMIT = 100
DEFAULT_INCIDENT_MESSAGE = "이상상황이 감지되었습니다."


realtime_bp = Blueprint(
    "realtime",
    __name__,
    url_prefix="/api/realtime",
)


def _parse_limit(raw_limit) -> int:
    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return DEFAULT_RECENT_INCIDENT_LIMIT

    if limit <= 0:
        return DEFAULT_RECENT_INCIDENT_LIMIT

    return min(limit, MAX_RECENT_INCIDENT_LIMIT)


def _normalize_incident_payload(event: RealtimeEvent) -> dict:
    payload = event.payload if isinstance(event.payload, dict) else {}

    return {
        "realtime_event_id": event.id,
        "send_status": event.send_status,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "sent_at": event.sent_at.isoformat() if event.sent_at else None,
        "incident_id": payload.get("incident_id") or event.incident_id,
        "incident_code": payload.get("incident_code"),
        "event_type": payload.get("event_type"),
        "severity": payload.get("severity"),
        "incident_status": payload.get("incident_status"),
        "cctv_id": payload.get("cctv_id"),
        "source_cctv_id": payload.get("source_cctv_id"),
        "detection_log_id": payload.get("detection_log_id"),
        "occurred_at": payload.get("occurred_at"),
        "message": payload.get("message") or DEFAULT_INCIDENT_MESSAGE,
        "vehicle_class": payload.get("vehicle_class"),
        "track_id": payload.get("track_id"),
        "roi_type": payload.get("roi_type"),
        "confidence": payload.get("confidence"),
        "snapshot_path": payload.get("snapshot_path"),
        "clip_path": payload.get("clip_path"),
    }


@realtime_bp.route("/incidents/recent", methods=["GET"])
def get_recent_incident_events():
    limit = _parse_limit(request.args.get("limit"))

    events = (
        RealtimeEvent.query
        .filter(RealtimeEvent.event_name == RECENT_INCIDENT_EVENT_NAME)
        .order_by(RealtimeEvent.created_at.desc(), RealtimeEvent.id.desc())
        .limit(limit)
        .all()
    )

    return jsonify({
        "success": True,
        "count": len(events),
        "items": [_normalize_incident_payload(event) for event in events],
    }), 200
