from flask import Blueprint, jsonify, request

from app.modules.llm_report.service import (
    UPSTREAM_ERROR_CODES,
    confirm_llm_report,
    create_incident_llm_report,
    delete_llm_report,
    get_llm_report_detail,
    list_incident_llm_reports,
    regenerate_llm_report,
    update_llm_report,
)
from app.utils.security import require_auth

llm_report_bp = Blueprint("llm_report", __name__)


def _current_user():
    return getattr(request, "current_user", None)


def _status_code(result: dict) -> int:
    if result.get("success"):
        return 200

    message = result.get("message")
    if message == "Permission denied":
        return 403
    if message in {"Incident not found", "LLM report not found"}:
        return 404
    if result.get("error_code") in UPSTREAM_ERROR_CODES or result.get("error_code") == "LLM_SERVER_REQUEST_FAILED":
        return 502

    return 400


@llm_report_bp.post("/incidents/<int:incident_id>/llm-reports")
@require_auth
def create_incident_report(incident_id: int):
    """사건 데이터를 source_snapshot으로 묶어 LLM 보고서 초안을 생성한다."""
    payload = request.get_json(silent=True) or {}
    result = create_incident_llm_report(incident_id, _current_user(), payload)
    return jsonify(result), _status_code(result)


@llm_report_bp.get("/incidents/<int:incident_id>/llm-reports")
@require_auth
def list_incident_reports(incident_id: int):
    """특정 사건의 삭제되지 않은 LLM 보고서를 최신순으로 조회한다."""
    result = list_incident_llm_reports(incident_id)
    return jsonify(result), _status_code(result)


@llm_report_bp.get("/llm-reports/<int:report_id>")
@require_auth
def get_report(report_id: int):
    """보고서 상세와 저장된 source_snapshot을 반환한다."""
    result = get_llm_report_detail(report_id)
    return jsonify(result), _status_code(result)


@llm_report_bp.patch("/llm-reports/<int:report_id>")
@require_auth
def update_report(report_id: int):
    """관제/최고관리자만 보고서 제목, 요약, 본문을 수정한다."""
    payload = request.get_json(silent=True) or {}
    result = update_llm_report(report_id, _current_user(), payload)
    return jsonify(result), _status_code(result)


@llm_report_bp.post("/llm-reports/<int:report_id>/confirm")
@require_auth
def confirm_report(report_id: int):
    """보고서를 CONFIRMED 상태로 확정한다."""
    result = confirm_llm_report(report_id, _current_user())
    return jsonify(result), _status_code(result)


@llm_report_bp.post("/llm-reports/<int:report_id>/regenerate")
@require_auth
def regenerate_report(report_id: int):
    """기존 보고서 id를 유지한 채 같은 사건 데이터로 LLM 보고서를 재생성한다."""
    payload = request.get_json(silent=True) or {}
    result = regenerate_llm_report(report_id, _current_user(), payload)
    return jsonify(result), _status_code(result)


@llm_report_bp.delete("/llm-reports/<int:report_id>")
@require_auth
def remove_report(report_id: int):
    """deleted_at 필드가 없으므로 report_status=DELETED로 soft delete한다."""
    result = delete_llm_report(report_id, _current_user())
    return jsonify(result), _status_code(result)
