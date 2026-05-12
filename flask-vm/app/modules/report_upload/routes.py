from flask import Blueprint, jsonify, request, send_file
 
from app.modules.report_upload.service import ReportUploadService
from app.utils.security import require_auth
 
report_upload_bp = Blueprint("report_upload", __name__, url_prefix="/api/reports")
 
 
@report_upload_bp.get("/health")
def report_upload_health():
    return jsonify({"status": "ok", "service": "report_upload"})
 
 
# ──────────────────────────────────────────
# POST /api/reports/<id>/attachments — 파일 업로드
# ──────────────────────────────────────────
@report_upload_bp.post("/<int:report_id>/attachments")
@require_auth
def upload_attachment(report_id):
    if "file" not in request.files:
        return jsonify({"success": False, "error": "file 필드가 없습니다."}), 400
 
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "파일명이 비어있습니다."}), 400
 
    try:
        result = ReportUploadService.save_attachment(
            report_id=report_id,
            file=file,
            current_user=request.current_user,
        )
        return jsonify({"message": "File uploaded.", "data": result}), 201
 
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
 
 
# ──────────────────────────────────────────
# GET /api/reports/<id>/attachments — 첨부파일 목록
# ──────────────────────────────────────────
@report_upload_bp.get("/<int:report_id>/attachments")
@require_auth
def list_attachments(report_id):
    try:
        result = ReportUploadService.list_attachments(report_id=report_id)
        return jsonify({"data": result}), 200
 
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
 
# ──────────────────────────────────────────
# DELETE /api/reports/<id>/attachments/<attachment_id> — 파일 삭제
# ──────────────────────────────────────────
@report_upload_bp.delete("/<int:report_id>/attachments/<int:attachment_id>")
@require_auth
def delete_attachment(report_id, attachment_id):
    try:
        ReportUploadService.delete_attachment(
            report_id=report_id,
            attachment_id=attachment_id,
            current_user=request.current_user,
        )
        return jsonify({"message": "File deleted."}), 200
 
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500