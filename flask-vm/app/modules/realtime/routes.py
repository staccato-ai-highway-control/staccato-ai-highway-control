"""realtime 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations
# 설명: pathlib에서 Path 이름을 가져와 아래 로직에서 재사용한다.
from pathlib import Path

# 설명: flask에서 Blueprint, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify, request

# 설명: app.models에서 RealtimeEvent 이름을 가져와 아래 로직에서 재사용한다.
from app.models import RealtimeEvent
# 설명: app.utils.bbox에서 build_bbox_metadata 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.bbox import build_bbox_metadata


# 설명: `RECENT_INCIDENT_EVENT_NAME`의 기준값 또는 기본값을 'incident.created'로 설정한다.
RECENT_INCIDENT_EVENT_NAME = "incident.created"
# 설명: `DEFAULT_RECENT_INCIDENT_LIMIT`의 기준값 또는 기본값을 30로 설정한다.
DEFAULT_RECENT_INCIDENT_LIMIT = 30
# 설명: `MAX_RECENT_INCIDENT_LIMIT`의 기준값 또는 기본값을 100로 설정한다.
MAX_RECENT_INCIDENT_LIMIT = 100
# 설명: `DEFAULT_INCIDENT_MESSAGE`의 기준값 또는 기본값을 '이상상황이 감지되었습니다.'로 설정한다.
DEFAULT_INCIDENT_MESSAGE = "이상상황이 감지되었습니다."


# 설명: `realtime_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
realtime_bp = Blueprint(
    "realtime",
    __name__,
    url_prefix="/api/realtime",
)


# 설명: `_parse_limit` 함수는 외부 입력을 내부 타입으로 해석하는 함수다.
def _parse_limit(raw_limit) -> int:
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `limit`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        limit = int(raw_limit)
    except (TypeError, ValueError):
        # 설명: 호출자에게 DEFAULT_RECENT_INCIDENT_LIMIT 값을 함수 결과로 반환한다.
        return DEFAULT_RECENT_INCIDENT_LIMIT

    # 설명: `limit <= 0` 조건 결과에 따라 실행 경로를 분기한다.
    if limit <= 0:
        # 설명: 호출자에게 DEFAULT_RECENT_INCIDENT_LIMIT 값을 함수 결과로 반환한다.
        return DEFAULT_RECENT_INCIDENT_LIMIT

    # 설명: 호출자에게 min(limit, MAX_RECENT_INCIDENT_LIMIT) 값을 함수 결과로 반환한다.
    return min(limit, MAX_RECENT_INCIDENT_LIMIT)


# 설명: `_normalize_incident_payload` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_incident_payload(event: RealtimeEvent) -> dict:
    # 설명: `payload`에 event.payload if isinstance(event.payload, dict) else {} 표현식의 계산 결과를 저장한다.
    payload = event.payload if isinstance(event.payload, dict) else {}

    # 설명: 호출자에게 {'realtime_event_id': event.id, 'send_status': event.send_status, 'created_at':... 값을 함수 결과로 반환한다.
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
        "bbox": payload.get("bbox"),
        "bbox_metadata": payload.get("bbox_metadata") or build_bbox_metadata(
            payload.get("bbox")
        ),
        "snapshot_path": payload.get("snapshot_path"),
        "clip_path": payload.get("clip_path"),
    }


# 설명: `get_recent_incident_events` 함수는 단일 값이나 리소스를 조회하는 함수다.
@realtime_bp.route("/incidents/recent", methods=["GET"])
def get_recent_incident_events():
    # 설명: `limit`에 `_parse_limit` 호출 결과를 저장해 다음 처리에서 사용한다.
    limit = _parse_limit(request.args.get("limit"))

    # 설명: `events`에 `RealtimeEvent.query.filter(RealtimeEvent.event_name == RECENT_INCID...` 호출 결과를 저장해 다음 처리에서 사용한다.
    events = (
        RealtimeEvent.query
        .filter(RealtimeEvent.event_name == RECENT_INCIDENT_EVENT_NAME)
        .order_by(RealtimeEvent.created_at.desc(), RealtimeEvent.id.desc())
        .limit(limit)
        .all()
    )

    # 설명: 호출자에게 (jsonify({'success': True, 'count': len(events), 'items': [_normalize_incident_... 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "count": len(events),
        "items": [_normalize_incident_payload(event) for event in events],
    }), 200



# 설명: `_storage_media_exists` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _storage_media_exists(path_value: str | None) -> bool:
    # 설명: `not path_value` 조건 결과에 따라 실행 경로를 분기한다.
    if not path_value:
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False

    # 설명: `value`에 `path_value.strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    value = path_value.strip()
    # 설명: `not value` 조건 결과에 따라 실행 경로를 분기한다.
    if not value:
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False

    # 외부 URL은 Flask 로컬 storage 검증 대상이 아니므로 통과시킨다.
    if value.startswith("http://") or value.startswith("https://"):
        # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
        return True

    # 설명: `not value.startswith('/storage/')` 조건 결과에 따라 실행 경로를 분기한다.
    if not value.startswith("/storage/"):
        # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
        return True

    # 설명: `relative_path`에 `value.removeprefix` 호출 결과를 저장해 다음 처리에서 사용한다.
    relative_path = value.removeprefix("/storage/")

    # 설명: `storage_roots`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    storage_roots = []

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: flask에서 current_app 이름을 가져와 아래 로직에서 재사용한다.
        from flask import current_app

        # 설명: `configured_storage_root`에 `current_app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        configured_storage_root = current_app.config.get("STORAGE_ROOT")
        # 설명: `configured_storage_root` 조건 결과에 따라 실행 경로를 분기한다.
        if configured_storage_root:
            # 설명: `storage_roots.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            storage_roots.append(Path(configured_storage_root))

        # 설명: `storage_roots.extend` 호출로 처리 결과를 기존 컬렉션에 누적한다.
        storage_roots.extend([
            Path(current_app.root_path).parent / "storage",
            Path("/home/staccato/staccato/storage"),
            Path("/home/staccato/staccato-flask/storage"),
        ])
    except RuntimeError:
        # 설명: `storage_roots.extend` 호출로 처리 결과를 기존 컬렉션에 누적한다.
        storage_roots.extend([
            Path("/home/staccato/staccato/storage"),
            Path("/home/staccato/staccato-flask/storage"),
        ])

    # 설명: `storage_roots`의 각 항목을 `storage_root`로 받아 반복 처리한다.
    for storage_root in storage_roots:
        # 설명: `root`에 `storage_root.resolve` 호출 결과를 저장해 다음 처리에서 사용한다.
        root = storage_root.resolve()
        # 설명: `target_path`에 `(root / relative_path).resolve` 호출 결과를 저장해 다음 처리에서 사용한다.
        target_path = (root / relative_path).resolve()

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `target_path.relative_to`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            target_path.relative_to(root)
        except ValueError:
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue

        # 설명: `target_path.exists() and target_path.is_file()` 조건 결과에 따라 실행 경로를 분기한다.
        if target_path.exists() and target_path.is_file():
            # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
            return True

    # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
    return False


# 설명: `_parse_preview_limit` 함수는 외부 입력을 내부 타입으로 해석하는 함수다.
def _parse_preview_limit(raw_value, default=5, maximum=20):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `value`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        value = int(raw_value)
    except (TypeError, ValueError):
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default

    # 설명: `value < 1` 조건 결과에 따라 실행 경로를 분기한다.
    if value < 1:
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default

    # 설명: 호출자에게 min(value, maximum) 값을 함수 결과로 반환한다.
    return min(value, maximum)


# 설명: `_normalize_event_preview` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_event_preview(event: RealtimeEvent) -> dict:
    # 설명: `item`에 `_normalize_incident_payload` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = _normalize_incident_payload(event)

    # 설명: `snapshot_url`에 `item.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    snapshot_url = item.get("snapshot_path")
    # 설명: `video_url`에 `item.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    video_url = item.get("clip_path")
    # 설명: `incident_id`에 `item.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_id = item.get("incident_id")

    # 설명: 호출자에게 {'realtime_event_id': item.get('realtime_event_id'), 'event_type': item.get('ev... 값을 함수 결과로 반환한다.
    return {
        "realtime_event_id": item.get("realtime_event_id"),
        "event_type": item.get("event_type"),
        "message": item.get("message"),
        "severity": item.get("severity"),
        "source_cctv_id": item.get("source_cctv_id"),
        "bbox": item.get("bbox"),
        "bbox_metadata": item.get("bbox_metadata"),
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


# 설명: `get_realtime_event_previews` 함수는 단일 값이나 리소스를 조회하는 함수다.
@realtime_bp.route("/events/preview", methods=["GET"])
def get_realtime_event_previews():
    # 설명: `limit`에 `_parse_preview_limit` 호출 결과를 저장해 다음 처리에서 사용한다.
    limit = _parse_preview_limit(request.args.get("limit"))

    # 일부 이벤트에는 미디어가 없을 수 있으므로 limit보다 넉넉하게 조회한 뒤
    # snapshot_path 또는 clip_path가 있는 항목만 미리보기로 반환한다.
    query_limit = min(limit * 5, 100)

    # 설명: `events`에 `RealtimeEvent.query.filter(RealtimeEvent.event_name == RECENT_INCID...` 호출 결과를 저장해 다음 처리에서 사용한다.
    events = (
        RealtimeEvent.query
        .filter(RealtimeEvent.event_name == RECENT_INCIDENT_EVENT_NAME)
        .order_by(RealtimeEvent.created_at.desc(), RealtimeEvent.id.desc())
        .limit(query_limit)
        .all()
    )

    # 설명: `items`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    items = []
    # 설명: `events`의 각 항목을 `event`로 받아 반복 처리한다.
    for event in events:
        # 설명: `preview`에 `_normalize_event_preview` 호출 결과를 저장해 다음 처리에서 사용한다.
        preview = _normalize_event_preview(event)
        # 설명: `not preview['preview_url']` 조건 결과에 따라 실행 경로를 분기한다.
        if not preview["preview_url"]:
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue

        # 설명: `preview['has_video'] and (not _storage_media_exists(preview['video_url']))` 조건 결과에 따라 실행 경로를 분기한다.
        if preview["has_video"] and not _storage_media_exists(preview["video_url"]):
            # 설명: `preview['video_url']`의 기준값 또는 기본값을 None로 설정한다.
            preview["video_url"] = None
            # 설명: `preview['has_video']`의 기준값 또는 기본값을 False로 설정한다.
            preview["has_video"] = False

        # 설명: `preview['has_snapshot'] and (not _storage_media_exists(preview['snapshot_url']))` 조건 결과에 따라 실행 경로를 분기한다.
        if preview["has_snapshot"] and not _storage_media_exists(preview["snapshot_url"]):
            # 설명: `preview['snapshot_url']`의 기준값 또는 기본값을 None로 설정한다.
            preview["snapshot_url"] = None
            # 설명: `preview['has_snapshot']`의 기준값 또는 기본값을 False로 설정한다.
            preview["has_snapshot"] = False

        # 설명: `preview['preview_url']`에 preview['video_url'] or preview['snapshot_url'] 표현식의 계산 결과를 저장한다.
        preview["preview_url"] = preview["video_url"] or preview["snapshot_url"]
        # 설명: `preview['preview_type']`에 'video' if preview['video_url'] else 'image' if preview['snapshot_url... 표현식의 계산 결과를 저장한다.
        preview["preview_type"] = (
            "video" if preview["video_url"] else "image" if preview["snapshot_url"] else None
        )

        # 설명: `not preview['preview_url']` 조건 결과에 따라 실행 경로를 분기한다.
        if not preview["preview_url"]:
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue

        # 설명: `items.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
        items.append(preview)

        # 설명: `len(items) >= limit` 조건 결과에 따라 실행 경로를 분기한다.
        if len(items) >= limit:
            # 설명: 필요한 조건을 충족했으므로 현재 반복문을 즉시 종료한다.
            break

    # 설명: 호출자에게 jsonify({'success': True, 'count': len(items), 'items': items}) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "count": len(items),
        "items": items,
    })
