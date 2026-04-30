from datetime import datetime
from uuid import uuid4

from app.extensions import db
from app.models.auth_models import SecurityLog
from app.models.cctv_models import Cctv
from app.models.incident_models import (
    DetectionLog,
    Incident,
    IncidentMemo,
    IncidentSnapshot,
    IncidentStatusHistory,
)


ALLOWED_INCIDENT_TYPES = {"LANE_STOP", "SHOULDER_STOP"}
ALLOWED_INCIDENT_STATUSES = {
    "DETECTED",
    "CONFIRMED",
    "FALSE_POSITIVE",
    "DISPATCHED",
    "RESOLVED",
    "CLOSED",
}
ALLOWED_RISK_LEVELS = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
ALLOWED_MEMO_TYPES = {"GENERAL", "DISPATCH", "MAINTENANCE", "REPORT", "SYSTEM"}


class IncidentError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class IncidentService:
    @staticmethod
    def _parse_datetime(value, default=None):
        if not value:
            return default

        if isinstance(value, datetime):
            return value

        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            raise IncidentError("Datetime must be ISO format.", 400)

    @staticmethod
    def _generate_incident_code():
        now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        suffix = uuid4().hex[:8].upper()
        return f"INC-{now}-{suffix}"

    @staticmethod
    def _create_security_log(action_type, actor_user=None, target_id=None, message=None):
        log = SecurityLog(
            actor_user_id=actor_user.id if actor_user else None,
            action_type=action_type,
            target_type="INCIDENT",
            target_id=target_id,
            log_message=message,
            created_at=datetime.utcnow(),
        )
        db.session.add(log)

    @staticmethod
    def get_incident(incident_id):
        incident = Incident.query.get(incident_id)

        if not incident:
            raise IncidentError("Incident not found.", 404)

        return incident

    @staticmethod
    def list_incidents(filters):
        query = Incident.query.order_by(Incident.detected_at.desc(), Incident.id.desc())

        if filters.get("incident_status"):
            query = query.filter_by(incident_status=filters["incident_status"])

        if filters.get("incident_type"):
            query = query.filter_by(incident_type=filters["incident_type"])

        if filters.get("risk_level"):
            query = query.filter_by(risk_level=filters["risk_level"])

        if filters.get("cctv_id"):
            query = query.filter_by(cctv_id=filters["cctv_id"])

        return [incident.to_dict() for incident in query.all()]

    @staticmethod
    def create_incident(data, actor_user=None):
        cctv_id = data.get("cctv_id")
        incident_type = data.get("incident_type")
        risk_level = data.get("risk_level", "MEDIUM")
        incident_status = data.get("incident_status", "DETECTED")

        if incident_type not in ALLOWED_INCIDENT_TYPES:
            raise IncidentError("Invalid incident_type.", 400)

        if risk_level not in ALLOWED_RISK_LEVELS:
            raise IncidentError("Invalid risk_level.", 400)

        if incident_status not in ALLOWED_INCIDENT_STATUSES:
            raise IncidentError("Invalid incident_status.", 400)

        if cctv_id:
            cctv = Cctv.query.get(cctv_id)

            if not cctv:
                raise IncidentError("CCTV not found.", 404)

        now = datetime.utcnow()
        detected_at = IncidentService._parse_datetime(data.get("detected_at"), default=now)

        incident = Incident(
            incident_code=data.get("incident_code") or IncidentService._generate_incident_code(),
            cctv_id=cctv_id,
            incident_type=incident_type,
            incident_status=incident_status,
            risk_level=risk_level,
            confidence=data.get("confidence"),
            stopped_duration_seconds=data.get("stopped_duration_seconds"),
            detected_at=detected_at,
            location_name=data.get("location_name"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            created_at=now,
        )

        db.session.add(incident)
        db.session.flush()

        history = IncidentStatusHistory(
            incident_id=incident.id,
            previous_status=None,
            new_status=incident_status,
            changed_by=actor_user.id if actor_user else None,
            change_reason="Incident created.",
            created_at=now,
        )
        db.session.add(history)

        IncidentService._create_security_log(
            action_type="INCIDENT_CREATED",
            actor_user=actor_user,
            target_id=incident.id,
            message=f"Incident created: {incident.incident_code}",
        )

        db.session.commit()

        return incident.to_dict()

    @staticmethod
    def get_incident_detail(incident_id):
        incident = IncidentService.get_incident(incident_id)
        cctv = Cctv.query.get(incident.cctv_id) if incident.cctv_id else None

        detection_logs = DetectionLog.query.filter_by(
            incident_id=incident.id
        ).order_by(DetectionLog.id.desc()).all()

        snapshots = IncidentSnapshot.query.filter_by(
            incident_id=incident.id
        ).order_by(IncidentSnapshot.id.desc()).all()

        histories = IncidentStatusHistory.query.filter_by(
            incident_id=incident.id
        ).order_by(IncidentStatusHistory.id.desc()).all()

        memos = IncidentMemo.query.filter_by(
            incident_id=incident.id
        ).order_by(IncidentMemo.id.desc()).all()

        return {
            **incident.to_dict(),
            "cctv": cctv.to_dict() if cctv else None,
            "detection_logs": [log.to_dict() for log in detection_logs],
            "snapshots": [snapshot.to_dict() for snapshot in snapshots],
            "histories": [history.to_dict() for history in histories],
            "memos": [memo.to_dict() for memo in memos],
        }

    @staticmethod
    def change_status(incident_id, data, actor_user):
        incident = IncidentService.get_incident(incident_id)

        new_status = data.get("incident_status")
        change_reason = data.get("change_reason")

        if new_status not in ALLOWED_INCIDENT_STATUSES:
            raise IncidentError("Invalid incident_status.", 400)

        previous_status = incident.incident_status

        if previous_status == new_status:
            raise IncidentError("Incident status is already same.", 409)

        now = datetime.utcnow()

        incident.incident_status = new_status
        incident.updated_at = now

        if new_status in {"RESOLVED", "CLOSED"} and not incident.resolved_at:
            incident.resolved_at = now

        history = IncidentStatusHistory(
            incident_id=incident.id,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=actor_user.id if actor_user else None,
            change_reason=change_reason,
            created_at=now,
        )

        db.session.add(history)

        IncidentService._create_security_log(
            action_type="INCIDENT_STATUS_CHANGED",
            actor_user=actor_user,
            target_id=incident.id,
            message=f"Incident status changed from {previous_status} to {new_status}.",
        )

        db.session.commit()

        return {
            "incident": incident.to_dict(),
            "history": history.to_dict(),
        }

    @staticmethod
    def list_histories(incident_id):
        IncidentService.get_incident(incident_id)

        histories = IncidentStatusHistory.query.filter_by(
            incident_id=incident_id
        ).order_by(IncidentStatusHistory.id.desc()).all()

        return [history.to_dict() for history in histories]

    @staticmethod
    def list_memos(incident_id):
        IncidentService.get_incident(incident_id)

        memos = IncidentMemo.query.filter_by(
            incident_id=incident_id
        ).order_by(IncidentMemo.id.desc()).all()

        return [memo.to_dict() for memo in memos]

    @staticmethod
    def add_memo(incident_id, data, actor_user):
        IncidentService.get_incident(incident_id)

        memo = (data.get("memo") or "").strip()
        memo_type = data.get("memo_type", "GENERAL")

        if not memo:
            raise IncidentError("memo is required.", 400)

        if memo_type not in ALLOWED_MEMO_TYPES:
            raise IncidentError("Invalid memo_type.", 400)

        now = datetime.utcnow()

        incident_memo = IncidentMemo(
            incident_id=incident_id,
            author_user_id=actor_user.id if actor_user else None,
            memo_type=memo_type,
            memo=memo,
            created_at=now,
        )

        db.session.add(incident_memo)

        IncidentService._create_security_log(
            action_type="INCIDENT_MEMO_CREATED",
            actor_user=actor_user,
            target_id=incident_id,
            message="Incident memo created.",
        )

        db.session.commit()

        return incident_memo.to_dict()
