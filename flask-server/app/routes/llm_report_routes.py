from flask import Blueprint, jsonify, request

from app.services.llm_report_service import create_mock_llm_report

llm_report_bp = Blueprint("llm_report", __name__)


@llm_report_bp.post("/incidents/<int:incident_id>/llm-reports")
def create_llm_report(incident_id):
    """
    Incident 기반 LLM Report 생성 API.

    현재 브랜치에서는 생성/저장만 구현한다.
    목록/상세/상태변경/삭제는 후속 브랜치에서 구현한다.
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
    TODO:
    - incident_id 기준 LLM 보고서 목록 조회
    - 후속 브랜치에서 구현
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
    - 후속 브랜치에서 구현
    """
    return jsonify({
        "message": "TODO: get llm report",
        "report_id": report_id
    }), 501


@llm_report_bp.patch("/llm-reports/<int:report_id>/status")
def update_llm_report_status(report_id):
    """
    TODO:
    - LLM 보고서 상태 변경
    - 후속 브랜치에서 구현
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
    - 실제 삭제가 아닌 상태 기반 삭제 처리
    - 후속 브랜치에서 구현
    """
    return jsonify({
        "message": "TODO: delete llm report",
        "report_id": report_id
    }), 501
