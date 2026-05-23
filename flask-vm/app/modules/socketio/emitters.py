from __future__ import annotations

from datetime import datetime, timezone

from flask import current_app

from app.extensions import socketio


def _utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _normalize_status(job_status: str | None) -> str:
    return str(job_status or "").strip().upper()


def _severity_for_status(job_status: str | None) -> str:
    status = _normalize_status(job_status)

    if status == "COMPLETED":
        return "success"

    if status == "FAILED":
        return "error"

    return "info"


def _message_for_status(job_status: str | None) -> str:
    status = _normalize_status(job_status)

    messages = {
        "QUEUED": "분석 작업이 대기열에 등록되었습니다.",
        "STARTED": "AI 분석이 시작되었습니다.",
        "RUNNING": "AI 분석이 진행 중입니다.",
        "PROCESSING": "AI 분석이 진행 중입니다.",
        "COMPLETED": "AI 분석이 완료되었습니다.",
        "FAILED": "AI 분석에 실패했습니다.",
    }

    return messages.get(status, "분석 작업 상태가 업데이트되었습니다.")


def build_report_analysis_payload(job) -> dict:
    job_status = getattr(job, "job_status", None)

    return {
        "type": "REPORT_ANALYSIS_UPDATED",
        "report_id": getattr(job, "report_id", None),
        "job_id": getattr(job, "id", None),
        "job_status": _normalize_status(job_status),
        "analysis_type": getattr(job, "analysis_type", None),
        "message": _message_for_status(job_status),
        "severity": _severity_for_status(job_status),
        "updated_at": _utc_now_iso(),
    }


def emit_report_analysis_updated(job) -> None:
    """
    Emit report analysis status update.

    This function is intentionally fail-safe:
    socket emit failure must not break the report analysis API.
    Call this only after DB commit.
    """
    payload = build_report_analysis_payload(job)
    report_id = payload.get("report_id")
    job_id = payload.get("job_id")

    if not report_id:
        current_app.logger.warning(
            "Skip report_analysis_updated emit: missing report_id. job_id=%s",
            job_id,
        )
        return

    room = f"report:{report_id}"

    try:
        socketio.emit("report_analysis_updated", payload, room=room)
    except Exception:
        current_app.logger.exception(
            "Failed to emit report_analysis_updated. report_id=%s job_id=%s",
            report_id,
            job_id,
        )


def emit_incident_created(payload: dict) -> bool:
    """
    Emit realtime incident creation event.

    This function is intentionally fail-safe:
    socket emit failure must not break incident DB persistence or API response.
    """
    incident_id = payload.get("incident_id") if isinstance(payload, dict) else None

    try:
        socketio.emit("incident.created", payload)
        return True
    except Exception:
        current_app.logger.exception(
            "Failed to emit incident.created. incident_id=%s",
            incident_id,
        )
        return False
