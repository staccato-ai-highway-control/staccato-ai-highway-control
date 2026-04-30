from flask import Blueprint, jsonify, request

llm_report_bp = Blueprint("llm_report", __name__)


@llm_report_bp.post("/incidents/<int:incident_id>/llm-reports")
def create_llm_report(incident_id):
    """
    TODO:
    - incident 조회
    - detection_logs 조회
    - incident_memos 조회
    - Mock LLM 보고서 생성
    - llm_reports 테이블 저장
    """
    return jsonify({
        "message": "TODO: create llm report",
        "incident_id": incident_id
    }), 501


@llm_report_bp.get("/incidents/<int:incident_id>/llm-reports")
def get_llm_reports_by_incident(incident_id):
    """
    TODO:
    - incident_id 기준 LLM 보고서 목록 조회
    """
    return jsonify({
        "message": "TODO: get llm reports by incident",
        "incident_id": incident_id
    }), 501


@llm_report_bp.get("/llm-reports/<int:report_id>")
def get_llm_report(report_id):
    """
    TODO:
    - report_id 기준 LLM 보고서 단건 조회
    """
    return jsonify({
        "message": "TODO: get llm report",
        "report_id": report_id
    }), 501


@llm_report_bp.patch("/llm-reports/<int:report_id>/status")
def update_llm_report_status(report_id):
    """
    TODO:
    - request body에서 status 수신
    - LLM 보고서 상태 변경
    """
    body = request.get_json(silent=True) or {}

    return jsonify({
        "message": "TODO: update llm report status",
        "report_id": report_id,
        "requested_status": body.get("status")
    }), 501


@llm_report_bp.delete("/llm-reports/<int:report_id>")
def delete_llm_report(report_id):
    """
    TODO:
    - 실제 삭제가 아니라 삭제 상태 처리
    """
    return jsonify({
        "message": "TODO: delete llm report",
        "report_id": report_id
    }), 501