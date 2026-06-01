from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from app.extensions import db
from app.models import DetectionLog, Incident, IncidentSnapshot, RealtimeEvent
from app.modules.socketio import emitters as socket_emitters


logger = logging.getLogger(__name__)


class IncidentEventValidationError(ValueError):
    pass


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


def _parse_datetime(value, field_name: str) -> datetime:
    if value in (None, ""):
        return _utc_now_naive()

    if not isinstance(value, str):
        raise IncidentEventValidationError(f"{field_name} must be an ISO datetime string.")

    raw = value.strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"

    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise IncidentEventValidationError(f"{field_name} must be a valid ISO datetime.") from exc

    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed.replace(microsecond=0)


def _required_text(payload: dict, field_name: str) -> str:
    value = payload.get(field_name)

    if value is None:
        raise IncidentEventValidationError(f"{field_name} is required.")

    text = str(value).strip()
    if not text:
        raise IncidentEventValidationError(f"{field_name} is required.")

    return text


def _optional_text(payload: dict, field_name: str):
    value = payload.get(field_name)
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def _optional_int(value, field_name: str):
    if value in (None, ""):
        return None

    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise IncidentEventValidationError(f"{field_name} must be an integer.") from exc


def _optional_decimal(value, field_name: str):
    if value in (None, ""):
        return None

    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise IncidentEventValidationError(f"{field_name} must be a number.") from exc

    return result


def _optional_confidence(value):
    confidence = _optional_decimal(value, "confidence")

    if confidence is None:
        return None

    if confidence < Decimal("0") or confidence > Decimal("1"):
        raise IncidentEventValidationError("confidence must be between 0 and 1.")

    return confidence.quantize(Decimal("0.0001"))


def _validate_bbox(value):
    if value in (None, ""):
        return None

    if not isinstance(value, dict):
        raise IncidentEventValidationError("bbox must be an object.")

    required = ["x1", "y1", "x2", "y2"]
    missing = [key for key in required if key not in value]
    if missing:
        raise IncidentEventValidationError(f"bbox missing fields: {', '.join(missing)}")

    normalized = {}
    for key in required:
        try:
            normalized[key] = float(value[key])
        except (TypeError, ValueError) as exc:
            raise IncidentEventValidationError(f"bbox.{key} must be a number.") from exc

    if normalized["x2"] <= normalized["x1"] or normalized["y2"] <= normalized["y1"]:
        raise IncidentEventValidationError("bbox x2/y2 must be greater than x1/y1.")

    return normalized


def _event_code(payload: dict, occurred_at: datetime) -> str:
    event_id = _optional_text(payload, "event_id")
    if event_id:
        return event_id[:50]

    timestamp = occurred_at.strftime("%Y%m%d%H%M%S")
    return f"ITS-{timestamp}-{uuid.uuid4().hex[:8].upper()}"


def _safe_cctv_id(payload: dict):
    raw_cctv_id = payload.get("cctv_id")

    if raw_cctv_id in (None, ""):
        return None

    try:
        return int(raw_cctv_id)
    except (TypeError, ValueError):
        # DB cctv_id is BIGINT. External IDs such as CCTV-001 are preserved in raw_result_json.
        return None


def _build_socket_payload(
    incident: Incident,
    detection_log: DetectionLog,
    snapshot: IncidentSnapshot | None,
    source_payload: dict,
) -> dict:
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
        "snapshot_path": snapshot.file_path if snapshot else source_payload.get("snapshot_path"),
        "clip_path": source_payload.get("clip_path"),
    }


class IncidentEventService:
    @staticmethod
    def create_from_its_event(payload: dict, *, commit: bool = True, emit_socket: bool = True) -> dict:
        if not isinstance(payload, dict):
            raise IncidentEventValidationError("JSON object body is required.")

        event_type = _required_text(payload, "event_type")
        _required_text(payload, "cctv_id")

        occurred_at = _parse_datetime(payload.get("occurred_at"), "occurred_at")
        incident_code = _event_code(payload, occurred_at)
        bbox = _validate_bbox(payload.get("bbox"))
        confidence = _optional_confidence(payload.get("confidence"))
        now = _utc_now_naive()

        existing = Incident.query.filter_by(incident_code=incident_code).first()
        if existing:
            return {
                "status": "duplicate",
                "incident_id": existing.id,
                "incident_code": existing.incident_code,
                "socket_emitted": False,
            }

        risk_level = str(payload.get("severity") or "MEDIUM").strip().upper()

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
        db.session.add(incident)
        db.session.flush()

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
        db.session.add(detection_log)
        db.session.flush()

        snapshot = None
        snapshot_path = _optional_text(payload, "snapshot_path")
        if snapshot_path:
            snapshot = IncidentSnapshot(
                incident_id=incident.id,
                detection_log_id=detection_log.id,
                file_path=snapshot_path,
                thumbnail_path=_optional_text(payload, "thumbnail_path"),
                bbox_json=bbox,
                captured_at=occurred_at,
                created_at=now,
            )
            db.session.add(snapshot)
            db.session.flush()

        socket_payload = _build_socket_payload(
            incident=incident,
            detection_log=detection_log,
            snapshot=snapshot,
            source_payload=payload,
        )

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
        db.session.add(realtime_event)
        if commit:
            db.session.commit()
        else:
            db.session.flush()

        socket_emitted = False
        if emit_socket:
            socket_emitted = IncidentEventService.emit_realtime_event_by_id(
                realtime_event.id
            )

        return {
            "status": "created",
            "incident_id": incident.id,
            "incident_code": incident.incident_code,
            "detection_log_id": detection_log.id,
            "snapshot_id": snapshot.id if snapshot else None,
            "realtime_event_id": realtime_event.id,
            "socket_emitted": socket_emitted,
        }


    @staticmethod
    def emit_realtime_event_by_id(realtime_event_id: int | None) -> bool:
        if not realtime_event_id:
            return False

        realtime_event = db.session.get(RealtimeEvent, realtime_event_id)
        if realtime_event is None:
            logger.warning(
                "Realtime event not found for socket emit. realtime_event_id=%s",
                realtime_event_id,
            )
            return False

        socket_payload = realtime_event.payload if isinstance(realtime_event.payload, dict) else {}

        try:
            socket_emitted = socket_emitters.emit_incident_created(socket_payload)
        except Exception:
            socket_emitted = False
            logger.exception(
                "Failed to emit incident created socket. realtime_event_id=%s",
                realtime_event_id,
            )

        try:
            realtime_event.send_status = "SENT" if socket_emitted else "FAILED"
            realtime_event.sent_at = _utc_now_naive() if socket_emitted else None
            realtime_event.error_message = None if socket_emitted else "Socket.IO emit failed."
            db.session.commit()
        except Exception:
            db.session.rollback()
            logger.exception(
                "Failed to update realtime event send status. realtime_event_id=%s",
                realtime_event_id,
            )

        return socket_emitted
