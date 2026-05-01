from flask import Blueprint, jsonify, request

from app.services.llm_report_service import (
    ALLOWED_REPORT_STATUSES,
    create_mock_llm_report,
    delete_report,
    get_report_by_id,
    get_reports_by_incident,
    update_report_status,
)

llm_report_bp = Blueprint("llm_report", __name__)


@llm_report_bp.post("/incidents/<int:incident_id>/llm-reports")
def create_llm_report(incident_id):
    """
    Incident 기반 LLM Report 생성 API.
    """
    body = request.get_json(silent=True) or {}

    try:
        report = create_mock_llm_report(
            incident_id=incident_id,
            user_id=body.get("generated_by"),
            report_type=body.get("report_type", "INCIDENT_SUMMARY"),
        )

        return jsonify({
            "message": "LLM report created",
            "data": report.to_dict(),
        }), 201

    except ValueError as exc:
        if str(exc) == "INCIDENT_NOT_FOUND":
            return jsonify({
                "message": "Incident not found",
                "incident_id": incident_id,
            }), 404

        return jsonify({
            "message": "Invalid request",
            "error": str(exc),
        }), 400

    except Exception as exc:
        return jsonify({
            "message": "Failed to create LLM report",
            "error": str(exc),
        }), 500


@llm_report_bp.get("/incidents/<int:incident_id>/llm-reports")
def get_llm_reports_by_incident(incident_id):
    """
    incident_id 기준 LLM Report 목록 조회 API.
    """
    try:
        reports = get_reports_by_incident(incident_id)

        return jsonify({
            "message": "LLM reports fetched",
            "incident_id": incident_id,
            "count": len(reports),
            "data": [report.to_dict() for report in reports],
        }), 200

    except ValueError as exc:
        if str(exc) == "INCIDENT_NOT_FOUND":
            return jsonify({
                "message": "Incident not found",
                "incident_id": incident_id,
            }), 404

        return jsonify({
            "message": "Invalid request",
            "error": str(exc),
        }), 400


@llm_report_bp.get("/llm-reports/<int:report_id>")
def get_llm_report(report_id):
    """
    report_id 기준 LLM Report 단건 조회 API.
    """
    try:
        report = get_report_by_id(report_id)

        return jsonify({
            "message": "LLM report fetched",
            "data": report.to_dict(),
        }), 200

    except ValueError as exc:
        if str(exc) == "LLM_REPORT_NOT_FOUND":
            return jsonify({
                "message": "LLM report not found",
                "report_id": report_id,
            }), 404

        return jsonify({
            "message": "Invalid request",
            "error": str(exc),
        }), 400


@llm_report_bp.patch("/llm-reports/<int:report_id>/status")
def patch_llm_report_status(report_id):
    """
    LLM Report 상태 변경 API.
    """
    body = request.get_json(silent=True) or {}
    status = body.get("status")

    try:
        report = update_report_status(
            report_id=report_id,
            status=status,
        )

        return jsonify({
            "message": "LLM report status updated",
            "data": report.to_dict(),
        }), 200

    except ValueError as exc:
        if str(exc) == "LLM_REPORT_NOT_FOUND":
            return jsonify({
                "message": "LLM report not found",
                "report_id": report_id,
            }), 404

        if str(exc) == "INVALID_REPORT_STATUS":
            return jsonify({
                "message": "Invalid report status",
                "allowed_statuses": sorted(ALLOWED_REPORT_STATUSES),
            }), 400

        return jsonify({
            "message": "Invalid request",
            "error": str(exc),
        }), 400


@llm_report_bp.delete("/llm-reports/<int:report_id>")
def delete_llm_report(report_id):
    """
    LLM Report 삭제 API.

    현재 스키마에는 DELETED 상태나 deleted_at 컬럼이 없으므로
    MVP 단계에서는 실제 row 삭제 방식으로 처리한다.
    """
    try:
        delete_report(report_id)

        return jsonify({
            "message": "LLM report deleted",
            "report_id": report_id,
        }), 200

    except ValueError as exc:
        if str(exc) == "LLM_REPORT_NOT_FOUND":
            return jsonify({
                "message": "LLM report not found",
                "report_id": report_id,
            }), 404

        return jsonify({
            "message": "Invalid request",
            "error": str(exc),
        }), 400
