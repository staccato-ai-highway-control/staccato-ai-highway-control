import json
from datetime import datetime
from typing import Any

from app.clients.llm_client import generate_incident_report
from app.extensions import db
from app.models.incident_models import DetectionLog, Incident, IncidentMemo
from app.models.report_models import LlmReport


ALLOWED_REPORT_STATUSES = {
    "DRAFT",
    "GENERATED",
    "FAILED",
    "CONFIRMED",
}


def create_mock_llm_report(
    incident_id: int,
    user_id: int | None = None,
    report_type: str = "INCIDENT_SUMMARY",
) -> LlmReport:
    """
    Incident 기반 LLM Report를 생성하고 llm_reports 테이블에 저장한다.
    """
    incident = db.session.get(Incident, incident_id)

    if incident is None:
        raise ValueError("INCIDENT_NOT_FOUND")

    detection_logs = DetectionLog.query.filter_by(
        incident_id=incident_id
    ).order_by(DetectionLog.created_at.desc()).all()

    memos = IncidentMemo.query.filter_by(
        incident_id=incident_id
    ).order_by(IncidentMemo.created_at.asc()).all()

    incident_payload = _build_incident_payload(incident)
    detection_log_payloads = [
        _build_detection_log_payload(log) for log in detection_logs
    ]
    memo_payloads = [
        _build_memo_payload(memo) for memo in memos
    ]

    llm_result = generate_incident_report(
        incident=incident_payload,
        detection_logs=detection_log_payloads,
        memos=memo_payloads,
    )

    now = datetime.utcnow()

    report = LlmReport(
        incident_id=incident.id,
        generated_by=user_id,
        report_type=report_type,
        report_status="GENERATED" if llm_result.get("status") == "success" else "FAILED",
        title=llm_result.get("report_title") or "LLM 사고 보고서 초안",
        prompt_text=json.dumps(
            {
                "incident": incident_payload,
                "detection_logs": detection_log_payloads,
                "memos": memo_payloads,
            },
            ensure_ascii=False,
        ),
        report_content=llm_result.get("report_content"),
        model_name=llm_result.get("model"),
        token_usage_json={
            "provider": llm_result.get("provider"),
            "summary": llm_result.get("summary"),
            "risk_reason": llm_result.get("risk_reason"),
            "recommended_action": llm_result.get("recommended_action"),
            "error_message": llm_result.get("error_message"),
        },
        created_at=now,
        updated_at=None,
    )

    db.session.add(report)
    db.session.commit()

    return report


def get_reports_by_incident(incident_id: int) -> list[LlmReport]:
    """
    incident_id 기준 LLM Report 목록을 조회한다.
    """
    incident = db.session.get(Incident, incident_id)

    if incident is None:
        raise ValueError("INCIDENT_NOT_FOUND")

    return LlmReport.query.filter_by(
        incident_id=incident_id
    ).order_by(LlmReport.created_at.desc()).all()


def get_report_by_id(report_id: int) -> LlmReport:
    """
    report_id 기준 LLM Report 단건을 조회한다.
    """
    report = db.session.get(LlmReport, report_id)

    if report is None:
        raise ValueError("LLM_REPORT_NOT_FOUND")

    return report


def update_report_status(report_id: int, status: str) -> LlmReport:
    """
    LLM Report 상태를 변경한다.

    현재 DB ENUM 기준:
    - DRAFT
    - GENERATED
    - FAILED
    - CONFIRMED
    """
    normalized_status = status.upper() if status else ""

    if normalized_status not in ALLOWED_REPORT_STATUSES:
        raise ValueError("INVALID_REPORT_STATUS")

    report = db.session.get(LlmReport, report_id)

    if report is None:
        raise ValueError("LLM_REPORT_NOT_FOUND")

    report.report_status = normalized_status
    report.updated_at = datetime.utcnow()

    db.session.commit()

    return report


def delete_report(report_id: int) -> None:
    """
    LLM Report를 삭제한다.

    현재 llm_reports 테이블에는 DELETED 상태나 deleted_at 컬럼이 없으므로,
    이번 MVP 단계에서는 실제 row 삭제 방식으로 처리한다.
    """
    report = db.session.get(LlmReport, report_id)

    if report is None:
        raise ValueError("LLM_REPORT_NOT_FOUND")

    db.session.delete(report)
    db.session.commit()


def soft_delete_report(report_id: int):
    """
    기존 함수명 호환용 wrapper.

    현재 스키마에서는 soft delete가 불가능하므로 delete_report를 호출한다.
    """
    return delete_report(report_id)


def _build_incident_payload(incident: Incident) -> dict[str, Any]:
    return {
        "id": incident.id,
        "incident_code": incident.incident_code,
        "incident_type": incident.incident_type,
        "incident_status": incident.incident_status,
        "status": incident.incident_status,
        "risk_level": incident.risk_level,
        "confidence": float(incident.confidence) if incident.confidence is not None else None,
        "stopped_duration_seconds": incident.stopped_duration_seconds,
        "detected_at": incident.detected_at.isoformat() if incident.detected_at else None,
        "location_name": incident.location_name,
        "latitude": float(incident.latitude) if incident.latitude is not None else None,
        "longitude": float(incident.longitude) if incident.longitude is not None else None,
    }


def _build_detection_log_payload(log: DetectionLog) -> dict[str, Any]:
    return {
        "id": log.id,
        "incident_id": log.incident_id,
        "cctv_id": log.cctv_id,
        "model_name": log.model_name,
        "model_version": log.model_version,
        "detected_class": log.detected_class,
        "object_type": log.detected_class,
        "confidence": float(log.confidence) if log.confidence is not None else None,
        "bbox_json": log.bbox_json,
        "roi_type": log.roi_type,
        "movement_delta_px": float(log.movement_delta_px) if log.movement_delta_px is not None else None,
        "movement_delta": float(log.movement_delta_px) if log.movement_delta_px is not None else None,
        "stopped_duration_seconds": log.stopped_duration_seconds,
        "stopped_seconds": log.stopped_duration_seconds,
        "frame_timestamp_ms": log.frame_timestamp_ms,
        "raw_result_json": log.raw_result_json,
        "detected_at": log.detected_at.isoformat() if log.detected_at else None,
    }


def _build_memo_payload(memo: IncidentMemo) -> dict[str, Any]:
    return {
        "id": memo.id,
        "incident_id": memo.incident_id,
        "author_user_id": memo.author_user_id,
        "memo_type": memo.memo_type,
        "memo": memo.memo,
        "content": memo.memo,
        "created_at": memo.created_at.isoformat() if memo.created_at else None,
    }
