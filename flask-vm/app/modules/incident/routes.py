"""incident 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: logging 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import logging
# 설명: datetime에서 datetime 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime
# 설명: decimal에서 Decimal 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal

# 설명: flask에서 Blueprint, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify, request
# 설명: sqlalchemy에서 or_ 이름을 가져와 아래 로직에서 재사용한다.
from sqlalchemy import or_

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models.cctv_models에서 Cctv 이름을 가져와 아래 로직에서 재사용한다.
from app.models.cctv_models import Cctv
# 설명: app.models.incident_models에서 DetectionLog, Incident, IncidentSnapshot 이름을 가져와 아래 로직에서 재사용한다.
from app.models.incident_models import DetectionLog, Incident, IncidentSnapshot
# 설명: app.models.ai_event_models에서 AiEvent 이름을 가져와 아래 로직에서 재사용한다.
from app.models.ai_event_models import AiEvent
# 설명: app.models.incident_support_models에서 IncidentStatusHistory 이름을 가져와 아래 로직에서 재사용한다.
from app.models.incident_support_models import IncidentStatusHistory
# 설명: app.modules.incident.service에서 IncidentService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.incident.service import IncidentService
# 설명: app.modules.report_upload.service에서 ReportUploadService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.report_upload.service import ReportUploadService
# 설명: app.utils.bbox에서 build_bbox_metadata 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.bbox import build_bbox_metadata
# 설명: app.utils.security에서 require_auth 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import require_auth


# 설명: `logger`에 `logging.getLogger` 호출 결과를 저장해 다음 처리에서 사용한다.
logger = logging.getLogger(__name__)

# 설명: `incident_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
incident_bp = Blueprint("incident", __name__, url_prefix="/api/incidents")

# 설명: `VALID_STATUSES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
VALID_STATUSES = {
    "DETECTED",
    "REVIEWING",
    "ASSIGNED",
    "RESOLVED",
    "FALSE_POSITIVE",
    "CLOSED",
}

# 설명: `FINAL_STATUSES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
FINAL_STATUSES = {"RESOLVED", "FALSE_POSITIVE", "CLOSED"}


# 설명: `health` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@incident_bp.route("/health", methods=["GET"])
def health():
    # 설명: 호출자에게 ({'status': 'incident module ok'}, 200) 값을 함수 결과로 반환한다.
    return {"status": "incident module ok"}, 200


# 설명: `_to_float` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _to_float(value, default=None):
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default
    # 설명: `isinstance(value, Decimal)` 조건 결과에 따라 실행 경로를 분기한다.
    if isinstance(value, Decimal):
        # 설명: 호출자에게 float(value) 값을 함수 결과로 반환한다.
        return float(value)
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: 호출자에게 float(value) 값을 함수 결과로 반환한다.
        return float(value)
    except (TypeError, ValueError):
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default


# 설명: `_to_int` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _to_int(value, default=0):
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: 호출자에게 int(value) 값을 함수 결과로 반환한다.
        return int(value)
    except (TypeError, ValueError):
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default


# 설명: `_normalize_incident_type` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_incident_type(value: str | None) -> str:
    # 설명: `raw`에 `str(value or '').upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw = str(value or "").upper()
    # 설명: `raw in {'LANE_STOP', 'SHOULDER_STOP'}` 조건 결과에 따라 실행 경로를 분기한다.
    if raw in {"LANE_STOP", "SHOULDER_STOP"}:
        # 설명: 호출자에게 raw 값을 함수 결과로 반환한다.
        return raw
    # 설명: `'SHOULDER' in raw or '갓길' in raw` 조건 결과에 따라 실행 경로를 분기한다.
    if "SHOULDER" in raw or "갓길" in raw:
        # 설명: 호출자에게 'SHOULDER_STOP' 값을 함수 결과로 반환한다.
        return "SHOULDER_STOP"
    # 설명: 호출자에게 'LANE_STOP' 값을 함수 결과로 반환한다.
    return "LANE_STOP"


# 설명: `_normalize_status` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_status(value: str | None) -> str:
    # 설명: `raw`에 `str(value or 'DETECTED').upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw = str(value or "DETECTED").upper()
    # 설명: 호출자에게 raw if raw in VALID_STATUSES else 'DETECTED' 값을 함수 결과로 반환한다.
    return raw if raw in VALID_STATUSES else "DETECTED"


# 설명: `_normalize_risk_level` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_risk_level(value: str | None) -> str:
    # 설명: `raw`에 `str(value or 'MEDIUM').upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw = str(value or "MEDIUM").upper()
    # 설명: `raw in {'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'}` 조건 결과에 따라 실행 경로를 분기한다.
    if raw in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        # 설명: 호출자에게 raw 값을 함수 결과로 반환한다.
        return raw
    # 설명: 호출자에게 'MEDIUM' 값을 함수 결과로 반환한다.
    return "MEDIUM"


# 설명: `_is_truthy` 함수는 조건의 참/거짓을 판정하는 함수다.
def _is_truthy(value: str | None) -> bool:
    # 설명: 호출자에게 str(value or '').strip().lower() in {'1', 'true', 'yes', 'y', 'on'} 값을 함수 결과로 반환한다.
    return str(value or "").strip().lower() in {"1", "true", "yes", "y", "on"}


# 설명: `_risk_score_from` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _risk_score_from(level: str, confidence) -> int:
    # 설명: `confidence_value`에 `_to_float` 호출 결과를 저장해 다음 처리에서 사용한다.
    confidence_value = _to_float(confidence)
    # 설명: `confidence_value is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if confidence_value is not None:
        # 설명: `confidence_value <= 1` 조건 결과에 따라 실행 경로를 분기한다.
        if confidence_value <= 1:
            # 설명: 호출자에게 max(0, min(100, int(round(confidence_value * 100)))) 값을 함수 결과로 반환한다.
            return max(0, min(100, int(round(confidence_value * 100))))
        # 설명: 호출자에게 max(0, min(100, int(round(confidence_value)))) 값을 함수 결과로 반환한다.
        return max(0, min(100, int(round(confidence_value))))

    # 설명: 호출자에게 {'LOW': 30, 'MEDIUM': 55, 'HIGH': 80, 'CRITICAL': 95}.get(level, 55) 값을 함수 결과로 반환한다.
    return {
        "LOW": 30,
        "MEDIUM": 55,
        "HIGH": 80,
        "CRITICAL": 95,
    }.get(level, 55)


# 설명: `_latest_detection_log` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _latest_detection_log(incident_id: int) -> DetectionLog | None:
    # 설명: 호출자에게 DetectionLog.query.filter(DetectionLog.incident_id == incident_id).order_by(Det... 값을 함수 결과로 반환한다.
    return (
        DetectionLog.query
        .filter(DetectionLog.incident_id == incident_id)
        .order_by(DetectionLog.detected_at.desc(), DetectionLog.id.desc())
        .first()
    )


# 설명: `_latest_snapshot` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _latest_snapshot(incident_id: int) -> IncidentSnapshot | None:
    # 설명: 호출자에게 IncidentSnapshot.query.filter(IncidentSnapshot.incident_id == incident_id).orde... 값을 함수 결과로 반환한다.
    return (
        IncidentSnapshot.query
        .filter(IncidentSnapshot.incident_id == incident_id)
        .order_by(IncidentSnapshot.captured_at.desc(), IncidentSnapshot.id.desc())
        .first()
    )


# 설명: `_get_cctv` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_cctv(cctv_id):
    # 설명: `not cctv_id` 조건 결과에 따라 실행 경로를 분기한다.
    if not cctv_id:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None
    # 설명: 호출자에게 db.session.get(Cctv, cctv_id) 값을 함수 결과로 반환한다.
    return db.session.get(Cctv, cctv_id)


# 설명: `_latest_ai_event_for_incident` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _latest_ai_event_for_incident(incident: Incident) -> AiEvent | None:
    # 설명: `incident_code`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_code = getattr(incident, "incident_code", None)
    # 설명: `not incident_code` 조건 결과에 따라 실행 경로를 분기한다.
    if not incident_code:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None
    # 설명: 호출자에게 db.session.get(AiEvent, incident_code) 값을 함수 결과로 반환한다.
    return db.session.get(AiEvent, incident_code)


# 설명: `_to_frontend_incident` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _to_frontend_incident(incident: Incident) -> dict:
    # 설명: `cctv`에 `_get_cctv` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv = _get_cctv(incident.cctv_id)
    # 설명: `detection_log`에 `_latest_detection_log` 호출 결과를 저장해 다음 처리에서 사용한다.
    detection_log = _latest_detection_log(incident.id)
    # 설명: `snapshot`에 `_latest_snapshot` 호출 결과를 저장해 다음 처리에서 사용한다.
    snapshot = _latest_snapshot(incident.id)
    # 설명: `ai_event`에 `_latest_ai_event_for_incident` 호출 결과를 저장해 다음 처리에서 사용한다.
    ai_event = _latest_ai_event_for_incident(incident)

    # 설명: `event_type`에 `_normalize_incident_type` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_type = _normalize_incident_type(incident.incident_type)
    # 설명: `status`에 `_normalize_status` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = _normalize_status(incident.incident_status)
    # 설명: `risk_level`에 `_normalize_risk_level` 호출 결과를 저장해 다음 처리에서 사용한다.
    risk_level = _normalize_risk_level(incident.risk_level)

    # 설명: `confidence`에 `_to_float` 호출 결과를 저장해 다음 처리에서 사용한다.
    confidence = _to_float(incident.confidence, 0.0)
    # 설명: `stopped_duration`에 `_to_int` 호출 결과를 저장해 다음 처리에서 사용한다.
    stopped_duration = _to_int(incident.stopped_duration_seconds, 0)

    # 설명: `road_name`에 getattr(cctv, 'road_name', None) or '' 표현식의 계산 결과를 저장한다.
    road_name = getattr(cctv, "road_name", None) or ""
    # 설명: `location`에 incident.location_name or getattr(cctv, 'location_name', None) or roa... 표현식의 계산 결과를 저장한다.
    location = (
        incident.location_name
        or getattr(cctv, "location_name", None)
        or road_name
        or "-"
    )

    # 설명: `cctv_code`에 getattr(cctv, 'cctv_code', None) or (str(incident.cctv_id) if inciden... 표현식의 계산 결과를 저장한다.
    cctv_code = getattr(cctv, "cctv_code", None) or (
        str(incident.cctv_id) if incident.cctv_id else ""
    ) or (ai_event.camera_id if ai_event and ai_event.camera_id else "")

    # 설명: `snapshot_url`의 기준값 또는 기본값을 ''로 설정한다.
    snapshot_url = ""
    # 설명: `snapshot and snapshot.file_path` 조건 결과에 따라 실행 경로를 분기한다.
    if snapshot and snapshot.file_path:
        # 설명: `snapshot_url`에 snapshot.file_path 표현식의 계산 결과를 저장한다.
        snapshot_url = snapshot.file_path
    # 설명: `ai_event and ai_event.snapshot_url` 조건 결과에 따라 실행 경로를 분기한다.
    elif ai_event and ai_event.snapshot_url:
        # 설명: `snapshot_url`에 ai_event.snapshot_url 표현식의 계산 결과를 저장한다.
        snapshot_url = ai_event.snapshot_url

    # 설명: `video_url`에 ai_event.video_url if ai_event and ai_event.video_url else '' 표현식의 계산 결과를 저장한다.
    video_url = ai_event.video_url if ai_event and ai_event.video_url else ""
    # 설명: `stream_url`에 ai_event.stream_url if ai_event and ai_event.stream_url else '' 표현식의 계산 결과를 저장한다.
    stream_url = ai_event.stream_url if ai_event and ai_event.stream_url else ""
    # 설명: `bbox`의 기준값 또는 기본값을 None로 설정한다.
    bbox = None
    # 설명: `detection_log and detection_log.bbox_json` 조건 결과에 따라 실행 경로를 분기한다.
    if detection_log and detection_log.bbox_json:
        # 설명: `bbox`에 detection_log.bbox_json 표현식의 계산 결과를 저장한다.
        bbox = detection_log.bbox_json
    # 설명: `ai_event and ai_event.bbox_json` 조건 결과에 따라 실행 경로를 분기한다.
    elif ai_event and ai_event.bbox_json:
        # 설명: `bbox`에 ai_event.bbox_json 표현식의 계산 결과를 저장한다.
        bbox = ai_event.bbox_json

    # 설명: `raw_ai_event`에 ai_event.raw_event_json if ai_event and isinstance(ai_event.raw_event... 표현식의 계산 결과를 저장한다.
    raw_ai_event = (
        ai_event.raw_event_json
        if ai_event and isinstance(ai_event.raw_event_json, dict)
        else {}
    )
    # 설명: `bbox_metadata`에 `build_bbox_metadata` 호출 결과를 저장해 다음 처리에서 사용한다.
    bbox_metadata = build_bbox_metadata(
        bbox,
        coordinate_space=raw_ai_event.get("bbox_coordinate_space"),
        frame_width=raw_ai_event.get("frame_width"),
        frame_height=raw_ai_event.get("frame_height"),
    )

    # 설명: `roi_type`에 'SHOULDER' if event_type == 'SHOULDER_STOP' else 'LANE' 표현식의 계산 결과를 저장한다.
    roi_type = "SHOULDER" if event_type == "SHOULDER_STOP" else "LANE"
    # 설명: `detection_log and detection_log.roi_type` 조건 결과에 따라 실행 경로를 분기한다.
    if detection_log and detection_log.roi_type:
        # 설명: `roi_value`에 `str(detection_log.roi_type).upper` 호출 결과를 저장해 다음 처리에서 사용한다.
        roi_value = str(detection_log.roi_type).upper()
        # 설명: `'SHOULDER' in roi_value` 조건 결과에 따라 실행 경로를 분기한다.
        if "SHOULDER" in roi_value:
            # 설명: `roi_type`의 기준값 또는 기본값을 'SHOULDER'로 설정한다.
            roi_type = "SHOULDER"
        # 설명: `'LANE' in roi_value or 'MEDIAN' in roi_value` 조건 결과에 따라 실행 경로를 분기한다.
        elif "LANE" in roi_value or "MEDIAN" in roi_value:
            # 설명: `roi_type`의 기준값 또는 기본값을 'LANE'로 설정한다.
            roi_type = "LANE"

    # 설명: 호출자에게 {'id': str(incident.id), 'code': incident.incident_code, 'title': f'{('갓길 정차' i... 값을 함수 결과로 반환한다.
    return {
        "id": str(incident.id),
        "code": incident.incident_code,
        "title": f"{'갓길 정차' if event_type == 'SHOULDER_STOP' else '주행차로 정차'} 감지",
        "eventType": event_type,
        "roadName": road_name or "-",
        "location": location,
        "riskLevel": risk_level,
        "riskScore": _risk_score_from(risk_level, confidence),
        "confidence": confidence,
        "stoppedDurationSec": stopped_duration,
        "status": status,
        "detectedAt": incident.detected_at.isoformat() if incident.detected_at else "",
        "assignee": None,
        "cctvId": cctv_code,
        "snapshotUrl": snapshot_url,
        "videoUrl": video_url,
        "streamUrl": stream_url,
        "bbox": bbox,
        "bbox_metadata": bbox_metadata,
        "roiType": roi_type,
        "movementDeltaPx": _to_float(
            detection_log.movement_delta_px if detection_log else None,
            0.0,
        ),
        "memo": None,
        "analysis_job_id": detection_log.report_analysis_job_id if detection_log else None,
        "job_id": detection_log.report_analysis_job_id if detection_log else None,
        "report_id": incident.report_id,
        "its": {
            "weather": "-",
            "trafficVolume": "-",
            "nearestPatrolEta": "-",
        },
    }


# 설명: `list_incidents` 함수는 조건에 맞는 목록을 조회하는 함수다.
@incident_bp.route("", methods=["GET"])
@require_auth
def list_incidents():
    # 설명: `query`에 `Incident.query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
    query = Incident.query.filter(Incident.deleted_at.is_(None))

    # 설명: `status_filter`에 `request.args.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    status_filter = request.args.get("status")
    # 설명: `status_filter` 조건 결과에 따라 실행 경로를 분기한다.
    if status_filter:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(Incident.incident_status == status_filter.upper())

    # 설명: `risk_filter`에 request.args.get('risk_level') or request.args.get('riskLevel') 표현식의 계산 결과를 저장한다.
    risk_filter = request.args.get("risk_level") or request.args.get("riskLevel")
    # 설명: `risk_filter` 조건 결과에 따라 실행 경로를 분기한다.
    if risk_filter:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(Incident.risk_level == risk_filter.upper())

    # 설명: `type_filter`에 request.args.get('incident_type') or request.args.get('eventType') 표현식의 계산 결과를 저장한다.
    type_filter = request.args.get("incident_type") or request.args.get("eventType")
    # 설명: `type_filter` 조건 결과에 따라 실행 경로를 분기한다.
    if type_filter:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(Incident.incident_type == type_filter.upper())

    # 설명: `include_test_data`에 `_is_truthy` 호출 결과를 저장해 다음 처리에서 사용한다.
    include_test_data = _is_truthy(
        request.args.get("include_test_data") or request.args.get("includeTestData")
    )
    # 설명: `not include_test_data` 조건 결과에 따라 실행 경로를 분기한다.
    if not include_test_data:
        # 기본 목록에서는 개발/시연용 테스트 incident를 숨깁니다.
        # 필요 시 /api/incidents?include_test_data=true 로 포함 조회할 수 있습니다.
        query = query.filter(
            or_(
                Incident.incident_code.is_(None),
                ~Incident.incident_code.ilike("LLM-INC-%"),
            )
        )
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(
            or_(
                Incident.incident_code.is_(None),
                ~Incident.incident_code.ilike("TEST-INC-%"),
            )
        )
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(
            or_(
                Incident.incident_type.is_(None),
                ~Incident.incident_type.ilike("TEST"),
            )
        )
        # 설명: `('%test%', '%테스트%')`의 각 항목을 `code_pattern`로 받아 반복 처리한다.
        for code_pattern in ("%test%", "%테스트%"):
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(
                or_(
                    Incident.incident_code.is_(None),
                    ~Incident.incident_code.ilike(code_pattern),
                )
            )
        # 설명: `('%테스트%', '%test%')`의 각 항목을 `pattern`로 받아 반복 처리한다.
        for pattern in ("%테스트%", "%test%"):
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(
                or_(
                    Incident.location_name.is_(None),
                    ~Incident.location_name.ilike(pattern),
                )
            )

    # 설명: `keyword`에 `(request.args.get('q') or request.args.get('keyword') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    keyword = (request.args.get("q") or request.args.get("keyword") or "").strip()
    # 설명: `keyword` 조건 결과에 따라 실행 경로를 분기한다.
    if keyword:
        # 설명: `like`에 f'%{keyword}%' 표현식의 계산 결과를 저장한다.
        like = f"%{keyword}%"
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(
            or_(
                Incident.incident_code.ilike(like),
                Incident.incident_type.ilike(like),
                Incident.location_name.ilike(like),
            )
        )

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `limit`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        limit = int(request.args.get("limit", "100"))
    except ValueError:
        # 설명: `limit`의 기준값 또는 기본값을 100로 설정한다.
        limit = 100
    # 설명: `limit`에 `max` 호출 결과를 저장해 다음 처리에서 사용한다.
    limit = max(1, min(limit, 500))

    # 설명: `incidents`에 `query.order_by(Incident.detected_at.desc(), Incident.id.desc()).lim...` 호출 결과를 저장해 다음 처리에서 사용한다.
    incidents = (
        query
        .order_by(Incident.detected_at.desc(), Incident.id.desc())
        .limit(limit)
        .all()
    )

    # 설명: `payload`에 [_to_frontend_incident(item) for item in incidents] 표현식의 계산 결과를 저장한다.
    payload = [_to_frontend_incident(item) for item in incidents]

    # 설명: 호출자에게 (jsonify({'success': True, 'data': payload, 'incidents': payload, 'count': len(... 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "data": payload,
        "incidents": payload,
        "count": len(payload),
        "testDataIncluded": include_test_data,
    }), 200


# 설명: `get_incident` 함수는 단일 값이나 리소스를 조회하는 함수다.
@incident_bp.route("/<int:incident_id>", methods=["GET"])
@require_auth
def get_incident(incident_id: int):
    # 설명: `incident`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident = db.session.get(Incident, incident_id)
    # 설명: `incident is None or incident.deleted_at is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if incident is None or incident.deleted_at is not None:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Incident not found.'}), 404) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "Incident not found.",
        }), 404

    # 설명: 호출자에게 (jsonify({'success': True, 'data': _to_frontend_incident(incident)}), 200) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "data": _to_frontend_incident(incident),
    }), 200


# 설명: `update_incident_status` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
@incident_bp.route("/<int:incident_id>/status", methods=["PATCH", "PUT"])
@require_auth
def update_incident_status(incident_id: int):
    # 설명: `incident`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident = db.session.get(Incident, incident_id)
    # 설명: `incident is None or incident.deleted_at is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if incident is None or incident.deleted_at is not None:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Incident not found.'}), 404) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "Incident not found.",
        }), 404

    # 설명: `payload`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    payload = request.get_json(silent=True) or {}
    # 설명: `next_status`에 `str(payload.get('status') or '').upper().strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    next_status = str(payload.get("status") or "").upper().strip()

    # 설명: `next_status not in VALID_STATUSES` 조건 결과에 따라 실행 경로를 분기한다.
    if next_status not in VALID_STATUSES:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Invalid incident status.', 'allowed_statu... 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "Invalid incident status.",
            "allowed_statuses": sorted(VALID_STATUSES),
        }), 400

    # 설명: `previous_status`에 incident.incident_status 표현식의 계산 결과를 저장한다.
    previous_status = incident.incident_status
    # 설명: `now`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = datetime.now()

    # 설명: `incident.incident_status`에 next_status 표현식의 계산 결과를 저장한다.
    incident.incident_status = next_status
    # 설명: `incident.updated_at`에 now 표현식의 계산 결과를 저장한다.
    incident.updated_at = now

    # 설명: `next_status in FINAL_STATUSES and incident.resolved_at is None` 조건 결과에 따라 실행 경로를 분기한다.
    if next_status in FINAL_STATUSES and incident.resolved_at is None:
        # 설명: `incident.resolved_at`에 now 표현식의 계산 결과를 저장한다.
        incident.resolved_at = now

    # 설명: `history`에 `IncidentStatusHistory` 호출 결과를 저장해 다음 처리에서 사용한다.
    history = IncidentStatusHistory(
        incident_id=incident.id,
        previous_status=previous_status,
        new_status=next_status,
        changed_by=getattr(getattr(request, "current_user", None), "id", None),
        change_reason=payload.get("reason"),
        created_at=now,
    )

    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(history)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 (jsonify({'success': True, 'ok': True, 'data': _to_frontend_incident(incident)}... 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "ok": True,
        "data": _to_frontend_incident(incident),
    }), 200


# 설명: `create_incident` 함수는 새 데이터나 리소스를 생성하는 함수다.
@incident_bp.route("", methods=["POST"])
@require_auth
def create_incident():
    # 설명: `'file' not in request.files` 조건 결과에 따라 실행 경로를 분기한다.
    if "file" not in request.files:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'file field is missing in request.files'})... 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "file field is missing in request.files"
        }), 400

    # 설명: `file`에 request.files['file'] 표현식의 계산 결과를 저장한다.
    file = request.files["file"]
    # 설명: `file.filename == ''` 조건 결과에 따라 실행 경로를 분기한다.
    if file.filename == "":
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'filename is empty'}), 400) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "filename is empty"
        }), 400

    # 설명: `form_data`에 `request.form.to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
    form_data = request.form.to_dict()

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `file_info`에 `ReportUploadService.process_file_upload` 호출 결과를 저장해 다음 처리에서 사용한다.
        file_info = ReportUploadService.process_file_upload(file)
        # 설명: `result`에 `IncidentService.create_incident` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = IncidentService.create_incident(
            form_data,
            file_info,
            user_id=request.current_user.id
        )

        # 설명: `result.get('status') == 'success'` 조건 결과에 따라 실행 경로를 분기한다.
        if result.get("status") == "success":
            # 설명: 호출자에게 (jsonify({'success': True, 'report_id': result.get('report_id')}), 201) 값을 함수 결과로 반환한다.
            return jsonify({
                "success": True,
                "report_id": result.get("report_id")
            }), 201

        # 설명: `logger.warning`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.warning("Incident creation rejected", extra={
            "result": result
        })

        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Failed to create incident'}), 400) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "Failed to create incident"
        }), 400

    except ValueError as e:
        # 설명: `logger.warning`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.warning("Invalid incident upload request", extra={
            "error": str(e)
        })

        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(e)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("Unexpected incident creation error")

        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다."
        }), 500
