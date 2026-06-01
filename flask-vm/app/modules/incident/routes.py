import logging
from datetime import datetime
from decimal import Decimal

from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from app.extensions import db
from app.models.cctv_models import Cctv
from app.models.incident_models import DetectionLog, Incident, IncidentSnapshot
from app.models.incident_support_models import IncidentStatusHistory
from app.modules.incident.service import IncidentService
from app.modules.report_upload.service import ReportUploadService
from app.utils.security import require_auth


logger = logging.getLogger(__name__)

incident_bp = Blueprint("incident", __name__, url_prefix="/api/incidents")

VALID_STATUSES = {
    "DETECTED",
    "REVIEWING",
    "ASSIGNED",
    "RESOLVED",
    "FALSE_POSITIVE",
    "CLOSED",
}

FINAL_STATUSES = {"RESOLVED", "FALSE_POSITIVE", "CLOSED"}


@incident_bp.route("/health", methods=["GET"])
def health():
    return {"status": "incident module ok"}, 200


def _to_float(value, default=None):
    if value is None:
        return default
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value, default=0):
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalize_incident_type(value: str | None) -> str:
    raw = str(value or "").upper()
    if raw in {"LANE_STOP", "SHOULDER_STOP"}:
        return raw
    if "SHOULDER" in raw or "갓길" in raw:
        return "SHOULDER_STOP"
    return "LANE_STOP"


def _normalize_status(value: str | None) -> str:
    raw = str(value or "DETECTED").upper()
    return raw if raw in VALID_STATUSES else "DETECTED"


def _normalize_risk_level(value: str | None) -> str:
    raw = str(value or "MEDIUM").upper()
    if raw in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        return raw
    return "MEDIUM"


def _is_truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "y", "on"}


def _risk_score_from(level: str, confidence) -> int:
    confidence_value = _to_float(confidence)
    if confidence_value is not None:
        if confidence_value <= 1:
            return max(0, min(100, int(round(confidence_value * 100))))
        return max(0, min(100, int(round(confidence_value))))

    return {
        "LOW": 30,
        "MEDIUM": 55,
        "HIGH": 80,
        "CRITICAL": 95,
    }.get(level, 55)


def _latest_detection_log(incident_id: int) -> DetectionLog | None:
    return (
        DetectionLog.query
        .filter(DetectionLog.incident_id == incident_id)
        .order_by(DetectionLog.detected_at.desc(), DetectionLog.id.desc())
        .first()
    )


def _latest_snapshot(incident_id: int) -> IncidentSnapshot | None:
    return (
        IncidentSnapshot.query
        .filter(IncidentSnapshot.incident_id == incident_id)
        .order_by(IncidentSnapshot.captured_at.desc(), IncidentSnapshot.id.desc())
        .first()
    )


def _get_cctv(cctv_id):
    if not cctv_id:
        return None
    return db.session.get(Cctv, cctv_id)


def _to_frontend_incident(incident: Incident) -> dict:
    cctv = _get_cctv(incident.cctv_id)
    detection_log = _latest_detection_log(incident.id)
    snapshot = _latest_snapshot(incident.id)

    event_type = _normalize_incident_type(incident.incident_type)
    status = _normalize_status(incident.incident_status)
    risk_level = _normalize_risk_level(incident.risk_level)

    confidence = _to_float(incident.confidence, 0.0)
    stopped_duration = _to_int(incident.stopped_duration_seconds, 0)

    road_name = getattr(cctv, "road_name", None) or ""
    location = (
        incident.location_name
        or getattr(cctv, "location_name", None)
        or road_name
        or "-"
    )

    cctv_code = getattr(cctv, "cctv_code", None) or (
        str(incident.cctv_id) if incident.cctv_id else ""
    )

    snapshot_url = ""
    if snapshot and snapshot.file_path:
        snapshot_url = snapshot.file_path

    roi_type = "SHOULDER" if event_type == "SHOULDER_STOP" else "LANE"
    if detection_log and detection_log.roi_type:
        roi_value = str(detection_log.roi_type).upper()
        if "SHOULDER" in roi_value:
            roi_type = "SHOULDER"
        elif "LANE" in roi_value or "MEDIAN" in roi_value:
            roi_type = "LANE"

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


@incident_bp.route("", methods=["GET"])
@require_auth
def list_incidents():
    query = Incident.query.filter(Incident.deleted_at.is_(None))

    status_filter = request.args.get("status")
    if status_filter:
        query = query.filter(Incident.incident_status == status_filter.upper())

    risk_filter = request.args.get("risk_level") or request.args.get("riskLevel")
    if risk_filter:
        query = query.filter(Incident.risk_level == risk_filter.upper())

    type_filter = request.args.get("incident_type") or request.args.get("eventType")
    if type_filter:
        query = query.filter(Incident.incident_type == type_filter.upper())

    include_test_data = _is_truthy(
        request.args.get("include_test_data") or request.args.get("includeTestData")
    )
    if not include_test_data:
        # 기본 목록에서는 개발/시연용 테스트 incident를 숨깁니다.
        # 필요 시 /api/incidents?include_test_data=true 로 포함 조회할 수 있습니다.
        query = query.filter(
            or_(
                Incident.incident_code.is_(None),
                ~Incident.incident_code.ilike("LLM-INC-%"),
            )
        )
        query = query.filter(
            or_(
                Incident.incident_code.is_(None),
                ~Incident.incident_code.ilike("TEST-INC-%"),
            )
        )
        query = query.filter(
            or_(
                Incident.incident_type.is_(None),
                ~Incident.incident_type.ilike("TEST"),
            )
        )
        for code_pattern in ("%test%", "%테스트%"):
            query = query.filter(
                or_(
                    Incident.incident_code.is_(None),
                    ~Incident.incident_code.ilike(code_pattern),
                )
            )
        for pattern in ("%테스트%", "%test%"):
            query = query.filter(
                or_(
                    Incident.location_name.is_(None),
                    ~Incident.location_name.ilike(pattern),
                )
            )

    keyword = (request.args.get("q") or request.args.get("keyword") or "").strip()
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            or_(
                Incident.incident_code.ilike(like),
                Incident.incident_type.ilike(like),
                Incident.location_name.ilike(like),
            )
        )

    try:
        limit = int(request.args.get("limit", "100"))
    except ValueError:
        limit = 100
    limit = max(1, min(limit, 500))

    incidents = (
        query
        .order_by(Incident.detected_at.desc(), Incident.id.desc())
        .limit(limit)
        .all()
    )

    payload = [_to_frontend_incident(item) for item in incidents]

    return jsonify({
        "success": True,
        "data": payload,
        "incidents": payload,
        "count": len(payload),
        "testDataIncluded": include_test_data,
    }), 200


@incident_bp.route("/<int:incident_id>", methods=["GET"])
@require_auth
def get_incident(incident_id: int):
    incident = db.session.get(Incident, incident_id)
    if incident is None or incident.deleted_at is not None:
        return jsonify({
            "success": False,
            "error": "Incident not found.",
        }), 404

    return jsonify({
        "success": True,
        "data": _to_frontend_incident(incident),
    }), 200


@incident_bp.route("/<int:incident_id>/status", methods=["PATCH", "PUT"])
@require_auth
def update_incident_status(incident_id: int):
    incident = db.session.get(Incident, incident_id)
    if incident is None or incident.deleted_at is not None:
        return jsonify({
            "success": False,
            "error": "Incident not found.",
        }), 404

    payload = request.get_json(silent=True) or {}
    next_status = str(payload.get("status") or "").upper().strip()

    if next_status not in VALID_STATUSES:
        return jsonify({
            "success": False,
            "error": "Invalid incident status.",
            "allowed_statuses": sorted(VALID_STATUSES),
        }), 400

    previous_status = incident.incident_status
    now = datetime.now()

    incident.incident_status = next_status
    incident.updated_at = now

    if next_status in FINAL_STATUSES and incident.resolved_at is None:
        incident.resolved_at = now

    history = IncidentStatusHistory(
        incident_id=incident.id,
        previous_status=previous_status,
        new_status=next_status,
        changed_by=getattr(getattr(request, "current_user", None), "id", None),
        change_reason=payload.get("reason"),
        created_at=now,
    )

    db.session.add(history)
    db.session.commit()

    return jsonify({
        "success": True,
        "ok": True,
        "data": _to_frontend_incident(incident),
    }), 200


@incident_bp.route("", methods=["POST"])
@require_auth
def create_incident():
    if "file" not in request.files:
        return jsonify({
            "success": False,
            "error": "file field is missing in request.files"
        }), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({
            "success": False,
            "error": "filename is empty"
        }), 400

    form_data = request.form.to_dict()

    try:
        file_info = ReportUploadService.process_file_upload(file)
        result = IncidentService.create_incident(
            form_data,
            file_info,
            user_id=request.current_user.id
        )

        if result.get("status") == "success":
            return jsonify({
                "success": True,
                "report_id": result.get("report_id")
            }), 201

        logger.warning("Incident creation rejected", extra={
            "result": result
        })

        return jsonify({
            "success": False,
            "error": "Failed to create incident"
        }), 400

    except ValueError as e:
        logger.warning("Invalid incident upload request", extra={
            "error": str(e)
        })

        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

    except Exception:
        logger.exception("Unexpected incident creation error")

        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다."
        }), 500
