from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.modules.bug_report.service import (
    create_bug_report,
    get_bug_report_detail,
    list_bug_reports,
)


bug_report_bp = Blueprint(
    "bug_report",
    __name__,
    url_prefix="/api/bug-reports",
)


@bug_report_bp.post("")
def create_bug_report_api():
    result, status_code = create_bug_report(request.get_json(silent=True))
    return jsonify(result), status_code


@bug_report_bp.get("")
def list_bug_reports_api():
    result, status_code = list_bug_reports(request.args)
    return jsonify(result), status_code


@bug_report_bp.get("/<int:bug_report_id>")
def get_bug_report_detail_api(bug_report_id: int):
    result, status_code = get_bug_report_detail(bug_report_id)
    return jsonify(result), status_code


@bug_report_bp.post("/<int:bug_report_id>/attachments")
def create_bug_report_attachment_api(bug_report_id: int):
    # TODO: implement multipart attachment upload in a follow-up task.
    return jsonify({
        "success": False,
        "error": "Bug report attachment upload is not implemented yet.",
        "bug_report_id": bug_report_id,
    }), 501
