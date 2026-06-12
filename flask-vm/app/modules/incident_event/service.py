"""incident event 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: logging 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import logging
# 설명: uuid 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import uuid
# 설명: datetime에서 datetime, timezone 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timezone
# 설명: decimal에서 Decimal, InvalidOperation 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal, InvalidOperation

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 DetectionLog, Incident, IncidentSnapshot, RealtimeEvent 이름을 가져와 아래 로직에서 재사용한다.
from app.models import DetectionLog, Incident, IncidentSnapshot, RealtimeEvent
# 설명: app.modules.socketio에서 socket_emitters 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.socketio import emitters as socket_emitters
# 설명: app.utils.bbox에서 build_bbox_metadata 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.bbox import build_bbox_metadata


# 설명: `logger`에 `logging.getLogger` 호출 결과를 저장해 다음 처리에서 사용한다.
logger = logging.getLogger(__name__)


# 설명: `IncidentEventValidationError` 클래스를 정의하고 ValueError의 동작 또는 계약을 확장한다.
class IncidentEventValidationError(ValueError):
    # 설명: 이 분기에서는 별도 동작 없이 제어 흐름만 유지한다.
    pass


# 설명: `_utc_now_naive` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _utc_now_naive() -> datetime:
    # 설명: 호출자에게 datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0) 값을 함수 결과로 반환한다.
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


# 설명: `_parse_datetime` 함수는 외부 입력을 내부 타입으로 해석하는 함수다.
def _parse_datetime(value, field_name: str) -> datetime:
    # 설명: `value in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
    if value in (None, ""):
        # 설명: 호출자에게 _utc_now_naive() 값을 함수 결과로 반환한다.
        return _utc_now_naive()

    # 설명: `not isinstance(value, str)` 조건 결과에 따라 실행 경로를 분기한다.
    if not isinstance(value, str):
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError(f'{field_name} must be an ISO datetime string.')를 호출자에게 전달한다.
        raise IncidentEventValidationError(f"{field_name} must be an ISO datetime string.")

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
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError(f'{field_name} must be a valid ISO datetime.')를 호출자에게 전달한다.
        raise IncidentEventValidationError(f"{field_name} must be a valid ISO datetime.") from exc

    # 설명: `parsed.tzinfo is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if parsed.tzinfo is not None:
        # 설명: `parsed`에 `parsed.astimezone(timezone.utc).replace` 호출 결과를 저장해 다음 처리에서 사용한다.
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    # 설명: 호출자에게 parsed.replace(microsecond=0) 값을 함수 결과로 반환한다.
    return parsed.replace(microsecond=0)


# 설명: `_required_text` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _required_text(payload: dict, field_name: str) -> str:
    # 설명: `value`에 `payload.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    value = payload.get(field_name)

    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError(f'{field_name} is required.')를 호출자에게 전달한다.
        raise IncidentEventValidationError(f"{field_name} is required.")

    # 설명: `text`에 `str(value).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = str(value).strip()
    # 설명: `not text` 조건 결과에 따라 실행 경로를 분기한다.
    if not text:
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError(f'{field_name} is required.')를 호출자에게 전달한다.
        raise IncidentEventValidationError(f"{field_name} is required.")

    # 설명: 호출자에게 text 값을 함수 결과로 반환한다.
    return text


# 설명: `_optional_text` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _optional_text(payload: dict, field_name: str):
    # 설명: `value`에 `payload.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    value = payload.get(field_name)
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `text`에 `str(value).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = str(value).strip()
    # 설명: 호출자에게 text or None 값을 함수 결과로 반환한다.
    return text or None


# 설명: `_optional_int` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _optional_int(value, field_name: str):
    # 설명: `value in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
    if value in (None, ""):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: 호출자에게 int(value) 값을 함수 결과로 반환한다.
        return int(value)
    except (TypeError, ValueError) as exc:
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError(f'{field_name} must be an integer.')를 호출자에게 전달한다.
        raise IncidentEventValidationError(f"{field_name} must be an integer.") from exc


# 설명: `_optional_decimal` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _optional_decimal(value, field_name: str):
    # 설명: `value in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
    if value in (None, ""):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `Decimal` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError(f'{field_name} must be a number.')를 호출자에게 전달한다.
        raise IncidentEventValidationError(f"{field_name} must be a number.") from exc

    # 설명: 호출자에게 result 값을 함수 결과로 반환한다.
    return result


# 설명: `_optional_confidence` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _optional_confidence(value):
    # 설명: `confidence`에 `_optional_decimal` 호출 결과를 저장해 다음 처리에서 사용한다.
    confidence = _optional_decimal(value, "confidence")

    # 설명: `confidence is None` 조건 결과에 따라 실행 경로를 분기한다.
    if confidence is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `confidence < Decimal('0') or confidence > Decimal('1')` 조건 결과에 따라 실행 경로를 분기한다.
    if confidence < Decimal("0") or confidence > Decimal("1"):
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError('confidence must be between 0 and 1.')를 호출자에게 전달한다.
        raise IncidentEventValidationError("confidence must be between 0 and 1.")

    # 설명: 호출자에게 confidence.quantize(Decimal('0.0001')) 값을 함수 결과로 반환한다.
    return confidence.quantize(Decimal("0.0001"))


# 설명: `_validate_bbox` 함수는 입력값과 비즈니스 조건을 검증하는 함수다.
def _validate_bbox(value):
    # 설명: `value in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
    if value in (None, ""):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `not isinstance(value, dict)` 조건 결과에 따라 실행 경로를 분기한다.
    if not isinstance(value, dict):
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError('bbox must be an object.')를 호출자에게 전달한다.
        raise IncidentEventValidationError("bbox must be an object.")

    # 설명: `required`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    required = ["x1", "y1", "x2", "y2"]
    # 설명: `missing`에 [key for key in required if key not in value] 표현식의 계산 결과를 저장한다.
    missing = [key for key in required if key not in value]
    # 설명: `missing` 조건 결과에 따라 실행 경로를 분기한다.
    if missing:
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError(f'bbox missing fields: {', '.join(missing)}')를 호출자에게 전달한다.
        raise IncidentEventValidationError(f"bbox missing fields: {', '.join(missing)}")

    # 설명: `normalized`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    normalized = {}
    # 설명: `required`의 각 항목을 `key`로 받아 반복 처리한다.
    for key in required:
        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `normalized[key]`에 `float` 호출 결과를 저장해 다음 처리에서 사용한다.
            normalized[key] = float(value[key])
        except (TypeError, ValueError) as exc:
            # 설명: 현재 처리를 중단하고 IncidentEventValidationError(f'bbox.{key} must be a number.')를 호출자에게 전달한다.
            raise IncidentEventValidationError(f"bbox.{key} must be a number.") from exc

    # 설명: `normalized['x2'] <= normalized['x1'] or normalized['y2'] <= normalized['y1']` 조건 결과에 따라 실행 경로를 분기한다.
    if normalized["x2"] <= normalized["x1"] or normalized["y2"] <= normalized["y1"]:
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError('bbox x2/y2 must be greater than x1/y1.')를 호출자에게 전달한다.
        raise IncidentEventValidationError("bbox x2/y2 must be greater than x1/y1.")

    # 설명: 호출자에게 normalized 값을 함수 결과로 반환한다.
    return normalized


# 설명: `_event_code` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _event_code(payload: dict, occurred_at: datetime) -> str:
    # 설명: `event_id`에 `_optional_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_id = _optional_text(payload, "event_id")
    # 설명: `event_id` 조건 결과에 따라 실행 경로를 분기한다.
    if event_id:
        # 설명: 호출자에게 event_id[:50] 값을 함수 결과로 반환한다.
        return event_id[:50]

    # 설명: `timestamp`에 `occurred_at.strftime` 호출 결과를 저장해 다음 처리에서 사용한다.
    timestamp = occurred_at.strftime("%Y%m%d%H%M%S")
    # 설명: 호출자에게 f'ITS-{timestamp}-{uuid.uuid4().hex[:8].upper()}' 값을 함수 결과로 반환한다.
    return f"ITS-{timestamp}-{uuid.uuid4().hex[:8].upper()}"


# 설명: `_safe_cctv_id` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _safe_cctv_id(payload: dict):
    # 설명: `raw_cctv_id`에 `payload.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw_cctv_id = payload.get("cctv_id")

    # 설명: `raw_cctv_id in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
    if raw_cctv_id in (None, ""):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: 호출자에게 int(raw_cctv_id) 값을 함수 결과로 반환한다.
        return int(raw_cctv_id)
    except (TypeError, ValueError):
        # DB cctv_id is BIGINT. External IDs such as CCTV-001 are preserved in raw_result_json.
        return None


# 설명: `_build_socket_payload` 함수는 후속 처리에 사용할 구조를 조립하는 함수다.
def _build_socket_payload(
    incident: Incident,
    detection_log: DetectionLog,
    snapshot: IncidentSnapshot | None,
    source_payload: dict,
) -> dict:
    # 설명: 호출자에게 {'type': 'INCIDENT_CREATED', 'event_name': 'incident.created', 'incident_id': i... 값을 함수 결과로 반환한다.
    return {
        "type": "INCIDENT_CREATED",
        "event_name": "incident.created",
        "incident_id": incident.id,
        "incident_code": incident.incident_code,
        "event_type": incident.incident_type,
        "severity": incident.risk_level,
        "incident_status": incident.incident_status,
        "cctv_id": incident.cctv_id,
        "source_cctv_id": source_payload.get("cctv_id"),
        "detection_log_id": detection_log.id if detection_log else None,
        "occurred_at": incident.detected_at.isoformat() if incident.detected_at else None,
        "message": source_payload.get("message") or "이상상황이 감지되었습니다.",
        "vehicle_class": source_payload.get("vehicle_class"),
        "track_id": source_payload.get("track_id"),
        "roi_type": source_payload.get("roi_type"),
        "confidence": float(incident.confidence) if incident.confidence is not None else None,
        "bbox": detection_log.bbox_json if detection_log else None,
        "bbox_metadata": build_bbox_metadata(
            detection_log.bbox_json if detection_log else None,
            coordinate_space=source_payload.get("bbox_coordinate_space"),
            frame_width=source_payload.get("frame_width"),
            frame_height=source_payload.get("frame_height"),
        ),
        "snapshot_path": snapshot.file_path if snapshot else source_payload.get("snapshot_path"),
        "clip_path": source_payload.get("clip_path"),
    }


# 설명: `IncidentEventService` 클래스를 정의하고 기본 object의 동작 또는 계약을 확장한다.
class IncidentEventService:
    # 설명: `create_from_its_event` 함수는 새 데이터나 리소스를 생성하는 함수다.
    @staticmethod
    def create_from_its_event(payload: dict, *, commit: bool = True, emit_socket: bool = True) -> dict:
        # 설명: `not isinstance(payload, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(payload, dict):
            # 설명: 현재 처리를 중단하고 IncidentEventValidationError('JSON object body is required.')를 호출자에게 전달한다.
            raise IncidentEventValidationError("JSON object body is required.")

        # 설명: `event_type`에 `_required_text` 호출 결과를 저장해 다음 처리에서 사용한다.
        event_type = _required_text(payload, "event_type")
        # 설명: `_required_text`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _required_text(payload, "cctv_id")

        # 설명: `occurred_at`에 `_parse_datetime` 호출 결과를 저장해 다음 처리에서 사용한다.
        occurred_at = _parse_datetime(payload.get("occurred_at"), "occurred_at")
        # 설명: `incident_code`에 `_event_code` 호출 결과를 저장해 다음 처리에서 사용한다.
        incident_code = _event_code(payload, occurred_at)
        # 설명: `bbox`에 `_validate_bbox` 호출 결과를 저장해 다음 처리에서 사용한다.
        bbox = _validate_bbox(payload.get("bbox"))
        # 설명: `confidence`에 `_optional_confidence` 호출 결과를 저장해 다음 처리에서 사용한다.
        confidence = _optional_confidence(payload.get("confidence"))
        # 설명: `now`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = _utc_now_naive()

        # 설명: `existing`에 `Incident.query.filter_by(incident_code=incident_code).first` 호출 결과를 저장해 다음 처리에서 사용한다.
        existing = Incident.query.filter_by(incident_code=incident_code).first()
        # 설명: `existing` 조건 결과에 따라 실행 경로를 분기한다.
        if existing:
            # 설명: 호출자에게 {'status': 'duplicate', 'incident_id': existing.id, 'incident_code': existing.i... 값을 함수 결과로 반환한다.
            return {
                "status": "duplicate",
                "incident_id": existing.id,
                "incident_code": existing.incident_code,
                "socket_emitted": False,
            }

        # 설명: `risk_level`에 `str(payload.get('severity') or 'MEDIUM').strip().upper` 호출 결과를 저장해 다음 처리에서 사용한다.
        risk_level = str(payload.get("severity") or "MEDIUM").strip().upper()

        # 설명: `incident`에 `Incident` 호출 결과를 저장해 다음 처리에서 사용한다.
        incident = Incident(
            incident_code=incident_code,
            report_id=None,
            cctv_id=_safe_cctv_id(payload),
            incident_type=event_type.upper(),
            incident_status="DETECTED",
            risk_level=risk_level,
            confidence=confidence,
            stopped_duration_seconds=_optional_int(
                payload.get("stopped_duration_seconds"),
                "stopped_duration_seconds",
            ),
            location_name=_optional_text(payload, "location_name"),
            latitude=_optional_decimal(payload.get("latitude"), "latitude"),
            longitude=_optional_decimal(payload.get("longitude"), "longitude"),
            detected_at=occurred_at,
            created_at=now,
            updated_at=None,
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(incident)
        # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.flush()

        # 설명: `detection_log`에 `DetectionLog` 호출 결과를 저장해 다음 처리에서 사용한다.
        detection_log = DetectionLog(
            incident_id=incident.id,
            report_analysis_job_id=None,
            model_name=payload.get("model_name") or "YOLOV11",
            model_version=payload.get("model_version"),
            detected_class=payload.get("vehicle_class"),
            confidence=confidence,
            bbox_json=bbox,
            roi_type=str(payload.get("roi_type") or "UNKNOWN").strip().upper(),
            movement_delta_px=_optional_decimal(
                payload.get("movement_delta_px"),
                "movement_delta_px",
            ),
            stopped_duration_seconds=incident.stopped_duration_seconds,
            frame_timestamp_ms=_optional_int(
                payload.get("frame_timestamp_ms"),
                "frame_timestamp_ms",
            ),
            raw_result_json=payload,
            detected_at=occurred_at,
            created_at=now,
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(detection_log)
        # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.flush()

        # 설명: `snapshot`의 기준값 또는 기본값을 None로 설정한다.
        snapshot = None
        # 설명: `snapshot_path`에 `_optional_text` 호출 결과를 저장해 다음 처리에서 사용한다.
        snapshot_path = _optional_text(payload, "snapshot_path")
        # 설명: `snapshot_path` 조건 결과에 따라 실행 경로를 분기한다.
        if snapshot_path:
            # 설명: `snapshot`에 `IncidentSnapshot` 호출 결과를 저장해 다음 처리에서 사용한다.
            snapshot = IncidentSnapshot(
                incident_id=incident.id,
                detection_log_id=detection_log.id,
                file_path=snapshot_path,
                thumbnail_path=_optional_text(payload, "thumbnail_path"),
                bbox_json=bbox,
                captured_at=occurred_at,
                created_at=now,
            )
            # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
            db.session.add(snapshot)
            # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            db.session.flush()

        # 설명: `socket_payload`에 `_build_socket_payload` 호출 결과를 저장해 다음 처리에서 사용한다.
        socket_payload = _build_socket_payload(
            incident=incident,
            detection_log=detection_log,
            snapshot=snapshot,
            source_payload=payload,
        )

        # 설명: `realtime_event`에 `RealtimeEvent` 호출 결과를 저장해 다음 처리에서 사용한다.
        realtime_event = RealtimeEvent(
            event_type="INCIDENT",
            event_name="incident.created",
            target_user_id=None,
            target_role="CONTROL_CENTER",
            target_room=None,
            target_resource_type="incident",
            target_resource_id=incident.id,
            incident_id=incident.id,
            payload=socket_payload,
            send_status="PENDING",
            error_message=None,
            created_at=now,
            sent_at=None,
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(realtime_event)
        # 설명: `commit` 조건 결과에 따라 실행 경로를 분기한다.
        if commit:
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
        else:
            # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            db.session.flush()

        # 설명: `socket_emitted`의 기준값 또는 기본값을 False로 설정한다.
        socket_emitted = False
        # 설명: `emit_socket` 조건 결과에 따라 실행 경로를 분기한다.
        if emit_socket:
            # 설명: `socket_emitted`에 `IncidentEventService.emit_realtime_event_by_id` 호출 결과를 저장해 다음 처리에서 사용한다.
            socket_emitted = IncidentEventService.emit_realtime_event_by_id(
                realtime_event.id
            )

        # 설명: 호출자에게 {'status': 'created', 'incident_id': incident.id, 'incident_code': incident.inc... 값을 함수 결과로 반환한다.
        return {
            "status": "created",
            "incident_id": incident.id,
            "incident_code": incident.incident_code,
            "detection_log_id": detection_log.id,
            "snapshot_id": snapshot.id if snapshot else None,
            "realtime_event_id": realtime_event.id,
            "socket_emitted": socket_emitted,
        }


    # 설명: `emit_realtime_event_by_id` 함수는 실시간 이벤트를 클라이언트에 전송하는 함수다.
    @staticmethod
    def emit_realtime_event_by_id(realtime_event_id: int | None) -> bool:
        # 설명: `not realtime_event_id` 조건 결과에 따라 실행 경로를 분기한다.
        if not realtime_event_id:
            # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
            return False

        # 설명: `realtime_event`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        realtime_event = db.session.get(RealtimeEvent, realtime_event_id)
        # 설명: `realtime_event is None` 조건 결과에 따라 실행 경로를 분기한다.
        if realtime_event is None:
            # 설명: `logger.warning`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            logger.warning(
                "Realtime event not found for socket emit. realtime_event_id=%s",
                realtime_event_id,
            )
            # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
            return False

        # 설명: `socket_payload`에 realtime_event.payload if isinstance(realtime_event.payload, dict) el... 표현식의 계산 결과를 저장한다.
        socket_payload = realtime_event.payload if isinstance(realtime_event.payload, dict) else {}

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `socket_emitted`에 `socket_emitters.emit_incident_created` 호출 결과를 저장해 다음 처리에서 사용한다.
            socket_emitted = socket_emitters.emit_incident_created(socket_payload)
        except Exception:
            # 설명: `socket_emitted`의 기준값 또는 기본값을 False로 설정한다.
            socket_emitted = False
            # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            logger.exception(
                "Failed to emit incident created socket. realtime_event_id=%s",
                realtime_event_id,
            )

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `realtime_event.send_status`에 'SENT' if socket_emitted else 'FAILED' 표현식의 계산 결과를 저장한다.
            realtime_event.send_status = "SENT" if socket_emitted else "FAILED"
            # 설명: `realtime_event.sent_at`에 _utc_now_naive() if socket_emitted else None 표현식의 계산 결과를 저장한다.
            realtime_event.sent_at = _utc_now_naive() if socket_emitted else None
            # 설명: `realtime_event.error_message`에 None if socket_emitted else 'Socket.IO emit failed.' 표현식의 계산 결과를 저장한다.
            realtime_event.error_message = None if socket_emitted else "Socket.IO emit failed."
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            logger.exception(
                "Failed to update realtime event send status. realtime_event_id=%s",
                realtime_event_id,
            )

        # 설명: 호출자에게 socket_emitted 값을 함수 결과로 반환한다.
        return socket_emitted
