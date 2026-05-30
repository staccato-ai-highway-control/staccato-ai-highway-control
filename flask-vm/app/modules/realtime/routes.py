from __future__ import annotations
from pathlib import Path

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



def _storage_media_exists(path_value: str | None) -> bool:
    if not path_value:
        return False

    value = path_value.strip()
    if not value:
        return False

    # 외부 URL은 Flask 로컬 storage 검증 대상이 아니므로 통과시킨다.
    if value.startswith("http://") or value.startswith("https://"):
        return True

    if not value.startswith("/storage/"):
        return True

    relative_path = value.removeprefix("/storage/")

    storage_roots = []

    try:
        from flask import current_app

        configured_storage_root = current_app.config.get("STORAGE_ROOT")
        if configured_storage_root:
            storage_roots.append(Path(configured_storage_root))

        storage_roots.extend([
            Path(current_app.root_path).parent / "storage",
            Path("/home/staccato/staccato/storage"),
            Path("/home/staccato/staccato-flask/storage"),
        ])
    except RuntimeError:
        storage_roots.extend([
            Path("/home/staccato/staccato/storage"),
            Path("/home/staccato/staccato-flask/storage"),
        ])

    for storage_root in storage_roots:
        root = storage_root.resolve()
        target_path = (root / relative_path).resolve()

        try:
            target_path.relative_to(root)
        except ValueError:
            continue

        if target_path.exists() and target_path.is_file():
            return True

    return False


def _parse_preview_limit(raw_value, default=5, maximum=20):
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return default

    if value < 1:
        return default

    return min(value, maximum)


def _normalize_event_preview(event: RealtimeEvent) -> dict:
    item = _normalize_incident_payload(event)

    snapshot_url = item.get("snapshot_path")
    video_url = item.get("clip_path")
    incident_id = item.get("incident_id")

    return {
        "realtime_event_id": item.get("realtime_event_id"),
        "event_type": item.get("event_type"),
        "message": item.get("message"),
        "severity": item.get("severity"),
        "source_cctv_id": item.get("source_cctv_id"),
        "snapshot_url": snapshot_url,
        "video_url": video_url,
        "preview_url": video_url or snapshot_url,
        "preview_type": "video" if video_url else "image" if snapshot_url else None,
        "has_video": bool(video_url),
        "has_snapshot": bool(snapshot_url),
        "occurred_at": item.get("occurred_at"),
        "created_at": item.get("created_at"),
        "target_url": f"/incidents/{incident_id}" if incident_id else None,
    }


@realtime_bp.route("/events/preview", methods=["GET"])
def get_realtime_event_previews():
    limit = _parse_preview_limit(request.args.get("limit"))

    # 일부 이벤트에는 미디어가 없을 수 있으므로 limit보다 넉넉하게 조회한 뒤
    # snapshot_path 또는 clip_path가 있는 항목만 미리보기로 반환한다.
    query_limit = min(limit * 5, 100)

    events = (
        RealtimeEvent.query
        .filter(RealtimeEvent.event_name == RECENT_INCIDENT_EVENT_NAME)
        .order_by(RealtimeEvent.created_at.desc(), RealtimeEvent.id.desc())
        .limit(query_limit)
        .all()
    )

    items = []
    for event in events:
        preview = _normalize_event_preview(event)
        if not preview["preview_url"]:
            continue

        if preview["has_video"] and not _storage_media_exists(preview["video_url"]):
            preview["video_url"] = None
            preview["has_video"] = False

        if preview["has_snapshot"] and not _storage_media_exists(preview["snapshot_url"]):
            preview["snapshot_url"] = None
            preview["has_snapshot"] = False

        preview["preview_url"] = preview["video_url"] or preview["snapshot_url"]
        preview["preview_type"] = (
            "video" if preview["video_url"] else "image" if preview["snapshot_url"] else None
        )

        if not preview["preview_url"]:
            continue

        items.append(preview)

        if len(items) >= limit:
            break

    return jsonify({
        "success": True,
        "count": len(items),
        "items": items,
    })

