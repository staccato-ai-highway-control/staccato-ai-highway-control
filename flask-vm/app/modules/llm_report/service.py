from datetime import datetime, timezone

from app.extensions import db
from app.models.incident_models import DetectionLog, Incident, IncidentSnapshot
from app.models.incident_support_models import IncidentMemo
from app.models.its_models import ItsRiskScore
from app.models.its_support_models import RiskContextSnapshot
from app.models.llm_models import LlmReport
from app.modules.llm_gateway.service import generate_llm_report

ADMIN_ROLES = {"SUPER_ADMIN", "CONTROL_ADMIN"}
UPSTREAM_ERROR_CODES = {"LLM_HEALTH_CHECK_FAILED", "LLM_SERVER_REQUEST_FAILED"}


def _now():
    return datetime.now(timezone.utc)


def _response(success: bool, message: str, data=None, error_code: str | None = None) -> dict:
    result = {"success": success, "message": message, "data": data}
    if error_code:
        result["error_code"] = error_code
    return result


def _is_admin(user) -> bool:
    return getattr(user, "role", None) in ADMIN_ROLES


def _require_admin(user):
    if not _is_admin(user):
        return _response(False, "Permission denied", None)
    return None


def _latest_risk_score(incident_id: int):
    return (
        ItsRiskScore.query
        .filter_by(incident_id=incident_id)
        .order_by(ItsRiskScore.created_at.desc())
        .first()
    )


def _build_source_snapshot(incident_id: int, include_latest_report: bool = True, exclude_report_id: int | None = None) -> dict:
    """현재 모델만 사용해 LLM 보고서 생성을 위한 사고 스냅샷을 구성한다."""
    incident = Incident.query.get(incident_id)
    latest_risk = _latest_risk_score(incident_id)

    detection_logs = (
        DetectionLog.query
        .filter_by(incident_id=incident_id)
        .order_by(DetectionLog.created_at.desc())
        .limit(5)
        .all()
    )
    snapshots = (
        IncidentSnapshot.query
        .filter_by(incident_id=incident_id)
        .order_by(IncidentSnapshot.created_at.desc())
        .limit(3)
        .all()
    )
    memos = (
        IncidentMemo.query
        .filter_by(incident_id=incident_id)
        .filter(IncidentMemo.deleted_at.is_(None))
        .order_by(IncidentMemo.created_at.desc())
        .limit(5)
        .all()
    )
    latest_risk_context = (
        RiskContextSnapshot.query
        .filter_by(incident_id=incident_id)
        .order_by(RiskContextSnapshot.created_at.desc())
        .first()
    )

    latest_report = None
    if include_latest_report:
        query = LlmReport.query.filter_by(incident_id=incident_id)
        if exclude_report_id is not None:
            query = query.filter(LlmReport.id != exclude_report_id)
        latest_report = query.order_by(LlmReport.created_at.desc()).first()

    return {
        "incident": {
            "id": incident.id if incident else incident_id,
            "incident_code": incident.incident_code if incident else None,
            "incident_type": incident.incident_type if incident else None,
            "status": incident.incident_status if incident else None,
            "risk_level": incident.risk_level if incident else None,
            "risk_score": float(latest_risk.risk_score) if latest_risk and latest_risk.risk_score is not None else None,
            "title": None,
            "description": incident.location_name if incident else None,
            "detected_at": incident.detected_at.isoformat() if incident and incident.detected_at else None,
            "reviewed_by": None,
            "assigned_to": None,
            "resolved_at": incident.resolved_at.isoformat() if incident and incident.resolved_at else None,
            "closed_at": None,
        },
        "detection_logs": [
            {
                "confidence": float(log.confidence) if log.confidence is not None else None,
                "stopped_seconds": log.stopped_duration_seconds,
                "movement_delta": float(log.movement_delta_px) if log.movement_delta_px is not None else None,
                "object_type": log.detected_class,
                "model_name": log.model_name,
                "model_version": log.model_version,
                "frame_index": log.frame_timestamp_ms,
            }
            for log in detection_logs
        ],
        "incident_snapshots": [
            {
                "id": snapshot.id,
                "snapshot_path": snapshot.file_path,
                "file_path": snapshot.file_path,
                "thumbnail_path": snapshot.thumbnail_path,
                "captured_at": snapshot.captured_at.isoformat() if snapshot.captured_at else None,
            }
            for snapshot in snapshots
        ],
        "incident_memos": [memo.to_dict() for memo in memos],
        "risk_context_snapshot": latest_risk_context.to_dict() if latest_risk_context else None,
        "latest_llm_report": latest_report.to_dict() if latest_report else None,
    }


def _response_data(result: dict) -> dict:
    data = result.get("data")
    return data if isinstance(data, dict) else {}


def _first_value(*values):
    for value in values:
        if value:
            return value
    return None


def _parse_report_response(result: dict) -> dict:
    data = _response_data(result)
    title = _first_value(result.get("report_title"), result.get("title"), data.get("report_title"), data.get("title"))
    summary = _first_value(result.get("summary"), data.get("summary"))
    content = _first_value(
        result.get("report_content"),
        result.get("content"),
        result.get("markdown"),
        result.get("message"),
        data.get("report_content"),
        data.get("content"),
        data.get("markdown"),
        data.get("message"),
    )
    model_name = _first_value(result.get("model_name"), result.get("llm_model_name"), data.get("model_name"), data.get("llm_model_name"))
    token_usage = _first_value(result.get("token_usage_json"), result.get("token_usage"), data.get("token_usage_json"), data.get("token_usage"))
    return {
        "title": title or "LLM Incident Report",
        "summary": summary,
        "report_content": content or "",
        "model_name": model_name,
        "token_usage_json": token_usage,
    }


def _report_metadata(report: LlmReport) -> dict:
    metadata = report.llm_response_json or {}
    return dict(metadata) if isinstance(metadata, dict) else {}


def _report_to_dict(report: LlmReport) -> dict:
    metadata = _report_metadata(report)
    return {
        "id": report.id,
        "report_id": report.id,
        "incident_id": report.incident_id,
        "report_type": report.report_type,
        "report_title": report.title,
        "title": report.title,
        "summary": metadata.get("summary"),
        "report_content": report.report_content,
        "generation_status": report.report_status,
        "report_status": report.report_status,
        "source_snapshot": metadata.get("source_snapshot"),
        "llm_response": metadata.get("llm_response"),
        "generated_by": report.generated_by,
        "model_name": report.model_name,
        "token_usage_json": report.token_usage_json,
        "error_message": report.error_message,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
        "confirmed_at": report.confirmed_at.isoformat() if report.confirmed_at else None,
    }


def create_incident_llm_report(incident_id: int, user, payload: dict) -> dict:
    permission = _require_admin(user)
    if permission:
        return permission

    incident = Incident.query.get(incident_id)
    if incident is None:
        return _response(False, "Incident not found", None)

    report_type = payload.get("report_type") or "INCIDENT_REPORT"
    prompt_version = payload.get("prompt_version") or "v1"
    llm_provider = payload.get("llm_provider") or "LOCAL_LLM"
    source_snapshot = _build_source_snapshot(incident_id)

    report = LlmReport(
        incident_id=incident_id,
        generated_by=user.id,
        report_type=report_type,
        report_status="GENERATING",
        title=f"Generating {report_type}",
        prompt_text=prompt_version,
        report_content=None,
        model_name=None,
        token_usage_json=None,
        llm_response_json={
            "summary": None,
            "source_snapshot": source_snapshot,
            "prompt_version": prompt_version,
            "llm_provider": llm_provider,
        },
        error_message=None,
        created_at=_now(),
        updated_at=None,
        confirmed_at=None,
    )

    try:
        db.session.add(report)
        db.session.flush()

        llm_payload = {
            "incident_id": incident_id,
            "report_type": report_type,
            "prompt_version": prompt_version,
            "llm_provider": llm_provider,
            "source_snapshot": source_snapshot,
        }
        llm_result = generate_llm_report(llm_payload)

        if not llm_result.get("success"):
            report.report_status = "FAILED"
            report.error_message = llm_result.get("message") or "LLM report generation failed"
            report.updated_at = _now()
            metadata = _report_metadata(report)
            metadata.update({"llm_response": llm_result, "error_code": llm_result.get("error_code")})
            report.llm_response_json = metadata
            db.session.commit()
            return _response(False, report.error_message, _report_to_dict(report), error_code=llm_result.get("error_code") or "LLM_SERVER_REQUEST_FAILED")

        parsed = _parse_report_response(llm_result)
        report.report_status = "DRAFT"
        report.title = parsed["title"]
        report.report_content = parsed["report_content"]
        report.model_name = parsed["model_name"]
        report.token_usage_json = parsed["token_usage_json"]
        report.error_message = None
        report.updated_at = _now()
        report.llm_response_json = {
            "summary": parsed["summary"],
            "source_snapshot": source_snapshot,
            "llm_response": llm_result,
            "prompt_version": prompt_version,
            "llm_provider": llm_provider,
        }
        db.session.commit()
        return _response(True, "LLM report generated", _report_to_dict(report))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to generate LLM report: {str(exc)}", None)


def list_incident_llm_reports(incident_id: int) -> dict:
    try:
        reports = (
            LlmReport.query
            .filter_by(incident_id=incident_id)
            .filter(LlmReport.report_status != "DELETED")
            .order_by(LlmReport.created_at.desc())
            .all()
        )
        return _response(True, "LLM reports fetched", [_report_to_dict(report) for report in reports])
    except Exception as exc:
        return _response(False, f"Failed to fetch LLM reports: {str(exc)}", None)


def get_llm_report_detail(report_id: int) -> dict:
    try:
        report = LlmReport.query.get(report_id)
        if report is None or report.report_status == "DELETED":
            return _response(False, "LLM report not found", None)
        return _response(True, "LLM report fetched", _report_to_dict(report))
    except Exception as exc:
        return _response(False, f"Failed to fetch LLM report: {str(exc)}", None)


def update_llm_report(report_id: int, user, payload: dict) -> dict:
    permission = _require_admin(user)
    if permission:
        return permission

    try:
        report = LlmReport.query.get(report_id)
        if report is None or report.report_status == "DELETED":
            return _response(False, "LLM report not found", None)

        metadata = _report_metadata(report)
        if "report_title" in payload:
            report.title = payload.get("report_title") or report.title
        if "summary" in payload:
            metadata["summary"] = payload.get("summary")
        if "report_content" in payload:
            report.report_content = payload.get("report_content")

        report.report_status = "EDITED"
        report.updated_at = _now()
        metadata["updated_by"] = user.id
        report.llm_response_json = metadata
        db.session.commit()
        return _response(True, "LLM report updated", _report_to_dict(report))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to update LLM report: {str(exc)}", None)


def confirm_llm_report(report_id: int, user) -> dict:
    permission = _require_admin(user)
    if permission:
        return permission

    try:
        report = LlmReport.query.get(report_id)
        if report is None or report.report_status == "DELETED":
            return _response(False, "LLM report not found", None)

        metadata = _report_metadata(report)
        metadata["confirmed_by"] = user.id
        report.report_status = "CONFIRMED"
        report.confirmed_at = _now()
        report.updated_at = _now()
        report.llm_response_json = metadata
        db.session.commit()
        return _response(True, "LLM report confirmed", _report_to_dict(report))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to confirm LLM report: {str(exc)}", None)


def regenerate_llm_report(report_id: int, user, payload: dict | None = None) -> dict:
    permission = _require_admin(user)
    if permission:
        return permission

    try:
        report = LlmReport.query.get(report_id)
        if report is None or report.report_status == "DELETED":
            return _response(False, "LLM report not found", None)

        payload = payload or {}
        source_snapshot = _build_source_snapshot(report.incident_id, include_latest_report=True, exclude_report_id=report.id)
        llm_payload = {
            "incident_id": report.incident_id,
            "report_type": payload.get("report_type") or report.report_type,
            "prompt_version": payload.get("prompt_version") or report.prompt_text or "v1",
            "source_snapshot": source_snapshot,
        }
        llm_result = generate_llm_report(llm_payload)

        metadata = _report_metadata(report)
        metadata["source_snapshot"] = source_snapshot

        if not llm_result.get("success"):
            report.error_message = llm_result.get("message") or "LLM report regeneration failed"
            metadata.update({"llm_response": llm_result, "error_code": llm_result.get("error_code")})
            report.llm_response_json = metadata
            report.updated_at = _now()
            db.session.commit()
            return _response(False, report.error_message, _report_to_dict(report), error_code=llm_result.get("error_code") or "LLM_SERVER_REQUEST_FAILED")

        parsed = _parse_report_response(llm_result)
        report.report_status = "DRAFT"
        report.title = parsed["title"]
        report.report_content = parsed["report_content"]
        report.model_name = parsed["model_name"]
        report.token_usage_json = parsed["token_usage_json"]
        report.error_message = None
        report.updated_at = _now()
        metadata.update({"summary": parsed["summary"], "llm_response": llm_result, "regenerated_by": user.id})
        report.llm_response_json = metadata
        db.session.commit()
        return _response(True, "LLM report regenerated", _report_to_dict(report))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to regenerate LLM report: {str(exc)}", None)


def delete_llm_report(report_id: int, user) -> dict:
    permission = _require_admin(user)
    if permission:
        return permission

    try:
        report = LlmReport.query.get(report_id)
        if report is None or report.report_status == "DELETED":
            return _response(False, "LLM report not found", None)

        metadata = _report_metadata(report)
        metadata["deleted_by"] = user.id
        metadata["deleted_at"] = _now().isoformat()
        report.report_status = "DELETED"
        report.updated_at = _now()
        report.llm_response_json = metadata
        db.session.commit()
        return _response(True, "LLM report deleted", _report_to_dict(report))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to delete LLM report: {str(exc)}", None)
