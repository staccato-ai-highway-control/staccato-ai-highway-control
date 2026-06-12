"""ai relay 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: copy에서 deepcopy 이름을 가져와 아래 로직에서 재사용한다.
from copy import deepcopy
# 설명: datetime에서 datetime, timezone 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timezone
# 설명: typing에서 Any 이름을 가져와 아래 로직에서 재사용한다.
from typing import Any

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 AiEvent, RealtimeEvent 이름을 가져와 아래 로직에서 재사용한다.
from app.models import AiEvent, RealtimeEvent
# 설명: app.utils.bbox에서 build_bbox_metadata 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.bbox import build_bbox_metadata


# 설명: `DEFAULT_EVENT_LIMIT`의 기준값 또는 기본값을 100로 설정한다.
DEFAULT_EVENT_LIMIT = 100
# 설명: `MAX_EVENT_LIMIT`의 기준값 또는 기본값을 500로 설정한다.
MAX_EVENT_LIMIT = 500
# 설명: `EVENT_ID_MAX_LENGTH`의 기준값 또는 기본값을 191로 설정한다.
EVENT_ID_MAX_LENGTH = 191

# 설명: `RECENT_INCIDENT_EVENT_NAME`의 기준값 또는 기본값을 'incident.created'로 설정한다.
RECENT_INCIDENT_EVENT_NAME = "incident.created"
# 설명: `AI_RELAY_SOURCE`의 기준값 또는 기본값을 'ai_relay'로 설정한다.
AI_RELAY_SOURCE = "ai_relay"
# 설명: `AI_VM_PUBLIC_BASE_URL`에 `os.getenv('AI_VM_PUBLIC_BASE_URL', 'http://192.168.0.186:5001').rstrip` 호출 결과를 저장해 다음 처리에서 사용한다.
AI_VM_PUBLIC_BASE_URL = os.getenv("AI_VM_PUBLIC_BASE_URL", "http://192.168.0.186:5001").rstrip("/")
# 설명: `AI_VM_INTERNAL_BASE_URLS`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
AI_VM_INTERNAL_BASE_URLS = (
    "http://127.0.0.1:5001",
    "http://localhost:5001",
)


# 설명: `RelayValidationError` 클래스를 정의하고 ValueError의 동작 또는 계약을 확장한다.
class RelayValidationError(ValueError):
    # 설명: 이 분기에서는 별도 동작 없이 제어 흐름만 유지한다.
    pass


# 설명: `store_event` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def store_event(payload: dict[str, Any], *, commit: bool = True) -> tuple[AiEvent, str]:
    # 설명: `not isinstance(payload, dict)` 조건 결과에 따라 실행 경로를 분기한다.
    if not isinstance(payload, dict):
        # 설명: 현재 처리를 중단하고 RelayValidationError('event payload must be a JSON object')를 호출자에게 전달한다.
        raise RelayValidationError("event payload must be a JSON object")

    # 설명: `payload`에 `_normalize_payload_urls` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = _normalize_payload_urls(payload)

    # 설명: `event_id`에 `_required_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_id = _required_string(payload, "event_id")
    # 설명: `camera_id`에 `_required_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    camera_id = _required_string(payload, "camera_id")
    # 설명: `event_type`에 `_required_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_type = _required_string(payload, "event_type")
    # 설명: `event_timestamp`에 `_parse_timestamp` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_timestamp = _parse_timestamp(_required_string(payload, "timestamp"))

    # 설명: `len(event_id) > EVENT_ID_MAX_LENGTH` 조건 결과에 따라 실행 경로를 분기한다.
    if len(event_id) > EVENT_ID_MAX_LENGTH:
        # 설명: 현재 처리를 중단하고 RelayValidationError(f'event_id must be {EVENT_ID_MAX_LENGTH} characters or few...를 호출자에게 전달한다.
        raise RelayValidationError(
            f"event_id must be {EVENT_ID_MAX_LENGTH} characters or fewer"
        )

    # 설명: `now`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = _utc_now_naive()
    # 설명: `event`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    event = db.session.get(AiEvent, event_id)
    # 설명: `status`에 'updated' if event else 'created' 표현식의 계산 결과를 저장한다.
    status = "updated" if event else "created"

    # 설명: `event is None` 조건 결과에 따라 실행 경로를 분기한다.
    if event is None:
        # 설명: `event`에 `AiEvent` 호출 결과를 저장해 다음 처리에서 사용한다.
        event = AiEvent(event_id=event_id, received_at=now)
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(event)
    else:
        # 설명: `event.updated_at`에 now 표현식의 계산 결과를 저장한다.
        event.updated_at = now

    # 설명: `event.camera_id`에 camera_id 표현식의 계산 결과를 저장한다.
    event.camera_id = camera_id
    # 설명: `event.event_type`에 `event_type.upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.event_type = event_type.upper()
    # 설명: `event.severity`에 `(_optional_string(payload, 'severity') or 'INFO').upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.severity = (_optional_string(payload, "severity") or "INFO").upper()
    # 설명: `event.status`에 `(_optional_string(payload, 'status') or 'NEW').upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.status = (_optional_string(payload, "status") or "NEW").upper()
    # 설명: `event.event_timestamp`에 event_timestamp 표현식의 계산 결과를 저장한다.
    event.event_timestamp = event_timestamp
    # 설명: `event.track_id`에 `_optional_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.track_id = _optional_string(payload, "track_id")
    # 설명: `event.roi_id`에 `_optional_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.roi_id = _optional_string(payload, "roi_id")
    # 설명: `event.lane_type`에 `_optional_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.lane_type = _optional_string(payload, "lane_type")
    # 설명: `detection`에 `_first_detection` 호출 결과를 저장해 다음 처리에서 사용한다.
    detection = _first_detection(payload.get("detections"))
    # 설명: `event.bbox_json`에 payload.get('bbox') or detection.get('bbox') 표현식의 계산 결과를 저장한다.
    event.bbox_json = payload.get("bbox") or detection.get("bbox")
    # 설명: `event.snapshot_url`에 `_optional_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.snapshot_url = _optional_string(payload, "snapshot_url")
    # 설명: `event.video_url`에 `_optional_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.video_url = _optional_string(payload, "video_url")
    # 설명: `event.stream_url`에 `_optional_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.stream_url = _optional_string(payload, "stream_url")
    # 설명: `event.message`에 `_optional_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.message = _optional_string(payload, "message")
    # 설명: `event.raw_event_json`에 `dict` 호출 결과를 저장해 다음 처리에서 사용한다.
    event.raw_event_json = dict(payload)

    # 설명: `_sync_realtime_event`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    _sync_realtime_event(event, now)

    # 설명: `commit` 조건 결과에 따라 실행 경로를 분기한다.
    if commit:
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
    else:
        # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.flush()

    # 설명: 호출자에게 (event, status) 값을 함수 결과로 반환한다.
    return event, status


# 설명: `_sync_realtime_event` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _sync_realtime_event(event: AiEvent, now: datetime) -> RealtimeEvent:
    # 설명: `realtime_event`에 `_find_realtime_event_for_ai_event` 호출 결과를 저장해 다음 처리에서 사용한다.
    realtime_event = _find_realtime_event_for_ai_event(event.event_id)

    # 설명: `realtime_event is None` 조건 결과에 따라 실행 경로를 분기한다.
    if realtime_event is None:
        # 설명: `realtime_event`에 `RealtimeEvent` 호출 결과를 저장해 다음 처리에서 사용한다.
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
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(realtime_event)

    # 설명: `realtime_event.payload`에 `_build_realtime_payload` 호출 결과를 저장해 다음 처리에서 사용한다.
    realtime_event.payload = _build_realtime_payload(event)
    # 설명: `realtime_event.incident_id`의 기준값 또는 기본값을 None로 설정한다.
    realtime_event.incident_id = None
    # 설명: `realtime_event.target_resource_id`의 기준값 또는 기본값을 None로 설정한다.
    realtime_event.target_resource_id = None
    # 설명: `realtime_event.error_message`의 기준값 또는 기본값을 None로 설정한다.
    realtime_event.error_message = None

    # 설명: 호출자에게 realtime_event 값을 함수 결과로 반환한다.
    return realtime_event


# 설명: `_find_realtime_event_for_ai_event` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _find_realtime_event_for_ai_event(event_id: str) -> RealtimeEvent | None:
    # JSON 필드 쿼리 호환성 이슈를 피하기 위해 최근 항목을 Python에서 확인한다.
    candidates = (
        RealtimeEvent.query
        .filter(RealtimeEvent.event_name == RECENT_INCIDENT_EVENT_NAME)
        .order_by(RealtimeEvent.created_at.desc(), RealtimeEvent.id.desc())
        .limit(1000)
        .all()
    )

    # 설명: `candidates`의 각 항목을 `candidate`로 받아 반복 처리한다.
    for candidate in candidates:
        # 설명: `payload`에 candidate.payload if isinstance(candidate.payload, dict) else {} 표현식의 계산 결과를 저장한다.
        payload = candidate.payload if isinstance(candidate.payload, dict) else {}
        # 설명: `payload.get('source') == AI_RELAY_SOURCE and payload.get('source_event_id') == ev...` 조건 결과에 따라 실행 경로를 분기한다.
        if payload.get("source") == AI_RELAY_SOURCE and payload.get("source_event_id") == event_id:
            # 설명: 호출자에게 candidate 값을 함수 결과로 반환한다.
            return candidate

    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None


# 설명: `_build_realtime_payload` 함수는 후속 처리에 사용할 구조를 조립하는 함수다.
def _build_realtime_payload(event: AiEvent) -> dict[str, Any]:
    # 설명: `timestamp`에 event.event_timestamp.isoformat() if event.event_timestamp else None 표현식의 계산 결과를 저장한다.
    timestamp = event.event_timestamp.isoformat() if event.event_timestamp else None
    # 설명: `raw_event`에 event.raw_event_json if isinstance(event.raw_event_json, dict) else {} 표현식의 계산 결과를 저장한다.
    raw_event = event.raw_event_json if isinstance(event.raw_event_json, dict) else {}

    # 설명: 호출자에게 {'source': AI_RELAY_SOURCE, 'source_event_id': event.event_id, 'ai_event_id': e... 값을 함수 결과로 반환한다.
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


# 설명: `_normalize_payload_urls` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_payload_urls(payload: dict[str, Any]) -> dict[str, Any]:
    # 설명: `normalized`에 `deepcopy` 호출 결과를 저장해 다음 처리에서 사용한다.
    normalized = deepcopy(payload)

    # 설명: `('snapshot_url', 'video_url', 'stream_url')`의 각 항목을 `key`로 받아 반복 처리한다.
    for key in ("snapshot_url", "video_url", "stream_url"):
        # 설명: `key in normalized` 조건 결과에 따라 실행 경로를 분기한다.
        if key in normalized:
            # 설명: `normalized[key]`에 `_normalize_media_url` 호출 결과를 저장해 다음 처리에서 사용한다.
            normalized[key] = _normalize_media_url(normalized.get(key))

    # 설명: 호출자에게 normalized 값을 함수 결과로 반환한다.
    return normalized


# 설명: `_normalize_media_url` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_media_url(value: Any) -> str | None:
    # 설명: `text`에 `_clean_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = _clean_string(value)
    # 설명: `not text` 조건 결과에 따라 실행 경로를 분기한다.
    if not text:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `AI_VM_INTERNAL_BASE_URLS`의 각 항목을 `internal_base_url`로 받아 반복 처리한다.
    for internal_base_url in AI_VM_INTERNAL_BASE_URLS:
        # 설명: `text.startswith(internal_base_url)` 조건 결과에 따라 실행 경로를 분기한다.
        if text.startswith(internal_base_url):
            # 설명: 호출자에게 f'{AI_VM_PUBLIC_BASE_URL}{text[len(internal_base_url):]}' 값을 함수 결과로 반환한다.
            return f"{AI_VM_PUBLIC_BASE_URL}{text[len(internal_base_url):]}"

    # 설명: 호출자에게 text 값을 함수 결과로 반환한다.
    return text


# 설명: `list_events` 함수는 조건에 맞는 목록을 조회하는 함수다.
def list_events(
    *,
    limit: int | None = DEFAULT_EVENT_LIMIT,
    camera_id: str | None = None,
    event_type: str | None = None,
    status: str | None = None,
) -> list[AiEvent]:
    # 설명: `safe_limit`에 `_safe_limit` 호출 결과를 저장해 다음 처리에서 사용한다.
    safe_limit = _safe_limit(limit)

    # 설명: `query`에 AiEvent.query 표현식의 계산 결과를 저장한다.
    query = AiEvent.query

    # 설명: `clean_camera_id`에 `_clean_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    clean_camera_id = _clean_string(camera_id)
    # 설명: `clean_camera_id` 조건 결과에 따라 실행 경로를 분기한다.
    if clean_camera_id:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(AiEvent.camera_id == clean_camera_id)

    # 설명: `clean_event_type`에 `_clean_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    clean_event_type = _clean_string(event_type)
    # 설명: `clean_event_type` 조건 결과에 따라 실행 경로를 분기한다.
    if clean_event_type:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(AiEvent.event_type == clean_event_type.upper())

    # 설명: `clean_status`에 `_clean_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    clean_status = _clean_string(status)
    # 설명: `clean_status` 조건 결과에 따라 실행 경로를 분기한다.
    if clean_status:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(AiEvent.status == clean_status.upper())

    # 설명: 호출자에게 query.order_by(AiEvent.event_timestamp.desc(), AiEvent.received_at.desc(), AiEv... 값을 함수 결과로 반환한다.
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


# 설명: `get_event` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_event(event_id: str) -> AiEvent | None:
    # 설명: `clean_event_id`에 `_clean_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    clean_event_id = _clean_string(event_id)
    # 설명: `not clean_event_id` 조건 결과에 따라 실행 경로를 분기한다.
    if not clean_event_id:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 db.session.get(AiEvent, clean_event_id) 값을 함수 결과로 반환한다.
    return db.session.get(AiEvent, clean_event_id)


# 설명: `build_replay` 함수는 후속 처리에 사용할 구조를 조립하는 함수다.
def build_replay(event: AiEvent) -> dict[str, Any]:
    # 설명: `event_dict`에 `event.to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_dict = event.to_dict()

    # 설명: 호출자에게 {'event_id': event.event_id, 'camera_id': event.camera_id, 'timestamp': event_d... 값을 함수 결과로 반환한다.
    return {
        "event_id": event.event_id,
        "camera_id": event.camera_id,
        "timestamp": event_dict.get("timestamp"),
        "snapshot_url": _normalize_media_url(event.snapshot_url),
        "video_url": _normalize_media_url(event.video_url),
        "stream_url": _normalize_media_url(event.stream_url),
        "event": event_dict,
    }


# 설명: `_required_string` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _required_string(payload: dict[str, Any], field_name: str) -> str:
    # 설명: `value`에 `_clean_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    value = _clean_string(payload.get(field_name))
    # 설명: `not value` 조건 결과에 따라 실행 경로를 분기한다.
    if not value:
        # 설명: 현재 처리를 중단하고 RelayValidationError(f'{field_name} is required')를 호출자에게 전달한다.
        raise RelayValidationError(f"{field_name} is required")
    # 설명: 호출자에게 value 값을 함수 결과로 반환한다.
    return value


# 설명: `_optional_string` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _optional_string(payload: dict[str, Any], field_name: str) -> str | None:
    # 설명: 호출자에게 _clean_string(payload.get(field_name)) 값을 함수 결과로 반환한다.
    return _clean_string(payload.get(field_name))


# 설명: `_clean_string` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _clean_string(value: Any) -> str | None:
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `text`에 `str(value).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = str(value).strip()
    # 설명: 호출자에게 text or None 값을 함수 결과로 반환한다.
    return text or None


# 설명: `_parse_timestamp` 함수는 외부 입력을 내부 타입으로 해석하는 함수다.
def _parse_timestamp(value: str) -> datetime:
    # 설명: `raw`에 `value.strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw = value.strip()
    # 설명: `raw.endswith('Z')` 조건 결과에 따라 실행 경로를 분기한다.
    if raw.endswith("Z"):
        # 설명: `raw`에 raw[:-1] + '+00:00' 표현식의 계산 결과를 저장한다.
        raw = raw[:-1] + "+00:00"

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `parsed`에 `datetime.fromisoformat` 호출 결과를 저장해 다음 처리에서 사용한다.
        parsed = datetime.fromisoformat(raw)
    except ValueError as exc:
        # 설명: 현재 처리를 중단하고 RelayValidationError('timestamp must be a valid ISO datetime')를 호출자에게 전달한다.
        raise RelayValidationError("timestamp must be a valid ISO datetime") from exc

    # 설명: `parsed.tzinfo is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if parsed.tzinfo is not None:
        # 설명: `parsed`에 `parsed.astimezone(timezone.utc).replace` 호출 결과를 저장해 다음 처리에서 사용한다.
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    # 설명: 호출자에게 parsed.replace(microsecond=0) 값을 함수 결과로 반환한다.
    return parsed.replace(microsecond=0)


# 설명: `_safe_limit` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _safe_limit(limit: int | None) -> int:
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `parsed`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        parsed = int(limit or DEFAULT_EVENT_LIMIT)
    except (TypeError, ValueError):
        # 설명: 호출자에게 DEFAULT_EVENT_LIMIT 값을 함수 결과로 반환한다.
        return DEFAULT_EVENT_LIMIT

    # 설명: `parsed <= 0` 조건 결과에 따라 실행 경로를 분기한다.
    if parsed <= 0:
        # 설명: 호출자에게 DEFAULT_EVENT_LIMIT 값을 함수 결과로 반환한다.
        return DEFAULT_EVENT_LIMIT

    # 설명: 호출자에게 min(parsed, MAX_EVENT_LIMIT) 값을 함수 결과로 반환한다.
    return min(parsed, MAX_EVENT_LIMIT)


# 설명: `_utc_now_naive` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _utc_now_naive() -> datetime:
    # 설명: 호출자에게 datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0) 값을 함수 결과로 반환한다.
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)



# 설명: `build_incident_event_payload` 함수는 후속 처리에 사용할 구조를 조립하는 함수다.
def build_incident_event_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Convert an AI relay event payload into IncidentEventService input."""

    # 설명: `not isinstance(payload, dict)` 조건 결과에 따라 실행 경로를 분기한다.
    if not isinstance(payload, dict):
        # 설명: 현재 처리를 중단하고 RelayValidationError('event payload must be a JSON object')를 호출자에게 전달한다.
        raise RelayValidationError("event payload must be a JSON object")

    # 설명: `normalized`에 `_normalize_payload_urls` 호출 결과를 저장해 다음 처리에서 사용한다.
    normalized = _normalize_payload_urls(payload)
    # 설명: `detection`에 `_first_detection` 호출 결과를 저장해 다음 처리에서 사용한다.
    detection = _first_detection(normalized.get("detections"))

    # 설명: `incident_payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
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

    # 설명: 호출자에게 incident_payload 값을 함수 결과로 반환한다.
    return incident_payload


# 설명: `_first_detection` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _first_detection(value: Any) -> dict[str, Any]:
    # 설명: `isinstance(value, list) and value` 조건 결과에 따라 실행 경로를 분기한다.
    if isinstance(value, list) and value:
        # 설명: `first`에 value[0] 표현식의 계산 결과를 저장한다.
        first = value[0]
        # 설명: `isinstance(first, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if isinstance(first, dict):
            # 설명: 호출자에게 first 값을 함수 결과로 반환한다.
            return first

    # 설명: 호출자에게 {} 값을 함수 결과로 반환한다.
    return {}


# 설명: `_normalize_incident_bbox` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_incident_bbox(value: Any) -> dict[str, float] | None:
    # 설명: `value in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
    if value in (None, ""):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `isinstance(value, dict)` 조건 결과에 따라 실행 경로를 분기한다.
    if isinstance(value, dict):
        # 설명: 호출자에게 value 값을 함수 결과로 반환한다.
        return value

    # 설명: `isinstance(value, (list, tuple)) and len(value) == 4` 조건 결과에 따라 실행 경로를 분기한다.
    if isinstance(value, (list, tuple)) and len(value) == 4:
        # 설명: `(x1, y1, x2, y2)`에 value 표현식의 계산 결과를 저장한다.
        x1, y1, x2, y2 = value
        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: 호출자에게 {'x1': float(x1), 'y1': float(y1), 'x2': float(x2), 'y2': float(y2)} 값을 함수 결과로 반환한다.
            return {
                "x1": float(x1),
                "y1": float(y1),
                "x2": float(x2),
                "y2": float(y2),
            }
        except (TypeError, ValueError) as exc:
            # 설명: 현재 처리를 중단하고 RelayValidationError('bbox coordinates must be numbers')를 호출자에게 전달한다.
            raise RelayValidationError("bbox coordinates must be numbers") from exc

    # 설명: 현재 처리를 중단하고 RelayValidationError('bbox must be an object or [x1, y1, x2, y2] list')를 호출자에게 전달한다.
    raise RelayValidationError("bbox must be an object or [x1, y1, x2, y2] list")


# 설명: `_normalize_incident_severity` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_incident_severity(value: str | None) -> str:
    # 설명: `severity`에 `(value or 'MEDIUM').strip().upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    severity = (value or "MEDIUM").strip().upper()

    # 설명: 호출자에게 {'INFO': 'LOW', 'WARNING': 'MEDIUM', 'WARN': 'MEDIUM', 'DANGER': 'HIGH', 'CRITI... 값을 함수 결과로 반환한다.
    return {
        "INFO": "LOW",
        "WARNING": "MEDIUM",
        "WARN": "MEDIUM",
        "DANGER": "HIGH",
        "CRITICAL": "HIGH",
        "ERROR": "HIGH",
    }.get(severity, severity)
