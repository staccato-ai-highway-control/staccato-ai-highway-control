from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.modules.bug_report.service import (
    create_bug_report,
    create_bug_report_attachments,
    get_bug_report_attachment_file,
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
    try:
        files = request.files.getlist("files")
        result, status_code = create_bug_report_attachments(bug_report_id, files)
        return jsonify(result), status_code
    except Exception:
        return jsonify({
            "success": False,
            "error": "Failed to upload bug report attachments.",
            "bug_report_id": bug_report_id,
        }), 500


@bug_report_bp.get("/attachments/<int:attachment_id>/download")
def download_bug_report_attachment_api(attachment_id: int):
    result, status_code = get_bug_report_attachment_file(attachment_id)
    if status_code == 200:
        return result
    return jsonify(result), status_code
