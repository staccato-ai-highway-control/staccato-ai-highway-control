import logging

from flask import Blueprint, jsonify, request

from app.modules.report_upload.service import ReportUploadService
from app.utils.security import require_auth


logger = logging.getLogger(__name__)

report_upload_bp = Blueprint("report_upload", __name__, url_prefix="/api/reports")


@report_upload_bp.route("/health", methods=["GET"])
def health():
    return {"status": "report upload module ok"}, 200


@report_upload_bp.route("", methods=["GET"])
@require_auth
def list_reports():
    try:
        result, status_code = ReportUploadService.list_reports(
            request.args,
            current_user=request.current_user,
        )
        return jsonify(result), status_code

    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    except Exception:
        logger.exception("리포트 목록 조회 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/my", methods=["GET"])
@require_auth
def list_my_reports():
    try:
        result, status_code = ReportUploadService.list_reports(
            request.args,
            current_user=request.current_user,
            mine_only=True,
        )
        return jsonify(result), status_code

    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    except Exception:
        logger.exception("내 리포트 목록 조회 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500



@report_upload_bp.route("/attachments/<int:attachment_id>/preview", methods=["GET"])
@require_auth
def preview_report_attachment(attachment_id):
    try:
        result, status_code = ReportUploadService.get_attachment_file(
            attachment_id=attachment_id,
            current_user=request.current_user,
            as_download=False,
        )

        if status_code == 200:
            return result

        return jsonify(result), status_code
    except Exception:
        logger.exception("리포트 첨부파일 미리보기 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/attachments/<int:attachment_id>/download", methods=["GET"])
@require_auth
def download_report_attachment(attachment_id):
    try:
        result, status_code = ReportUploadService.get_attachment_file(
            attachment_id=attachment_id,
            current_user=request.current_user,
            as_download=True,
        )

        if status_code == 200:
            return result

        return jsonify(result), status_code
    except Exception:
        logger.exception("리포트 첨부파일 다운로드 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/<int:report_id>", methods=["GET"])
@require_auth
def get_report(report_id):
    try:
        result, status_code = ReportUploadService.get_report(report_id)
        return jsonify(result), status_code

    except Exception:
        logger.exception("리포트 상세 조회 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("", methods=["POST"])
@require_auth
def create_report():
    try:
        user_id = request.current_user.id
        data = request.form.to_dict()
        files = request.files.getlist("files")

        if not files:
            return jsonify({"success": False, "error": "파일이 업로드되지 않았습니다."}), 400

        report = ReportUploadService.create_report(user_id, data, files)

        return jsonify({
            "success": True,
            "message": "리포트가 성공적으로 접수되었습니다.",
            "report_code": report.report_code,
            "report_id": report.id,
        }), 201

    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    except Exception:
        logger.exception("리포트 생성 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/<int:report_id>", methods=["PATCH"])
@require_auth
def update_report(report_id):
    try:
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        result, status_code = ReportUploadService.update_report(
            report_id=report_id,
            current_user=request.current_user,
            data=data,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("리포트 수정 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/<int:report_id>", methods=["DELETE"])
@require_auth
def delete_report(report_id):
    try:
        result, status_code = ReportUploadService.delete_report(
            report_id=report_id,
            current_user=request.current_user,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("리포트 삭제 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/<int:report_id>/status", methods=["PATCH"])
@require_auth
def update_report_status(report_id):
    try:
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        result, status_code = ReportUploadService.update_report_status(
            report_id=report_id,
            current_user=request.current_user,
            data=data,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("리포트 상태 변경 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/<int:report_id>/approve", methods=["POST"])
@require_auth
def approve_report(report_id):
    try:
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        result, status_code = ReportUploadService.approve_report(
            report_id=report_id,
            current_user=request.current_user,
            data=data,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("리포트 승인 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/<int:report_id>/reject", methods=["POST"])
@require_auth
def reject_report(report_id):
    try:
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        result, status_code = ReportUploadService.reject_report(
            report_id=report_id,
            current_user=request.current_user,
            data=data,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("리포트 반려 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/<int:report_id>/attachments", methods=["POST"])
@require_auth
def add_report_attachments(report_id):
    try:
        files = request.files.getlist("files")
        if not files and request.files.get("file"):
            files = [request.files["file"]]

        result, status_code = ReportUploadService.add_report_attachments(
            report_id=report_id,
            current_user=request.current_user,
            files=files,
        )
        return jsonify(result), status_code

    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    except Exception:
        logger.exception("리포트 첨부파일 추가 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/<int:report_id>/attachments/<int:attachment_id>", methods=["DELETE"])
@require_auth
def delete_report_attachment(report_id, attachment_id):
    try:
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        result, status_code = ReportUploadService.delete_report_attachment(
            report_id=report_id,
            attachment_id=attachment_id,
            current_user=request.current_user,
            data=data,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("리포트 첨부파일 삭제 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


@report_upload_bp.route("/<int:report_id>/analyze", methods=["POST"])
@require_auth
def request_report_analysis(report_id):
    try:
        user_id = request.current_user.id
        result, status_code = ReportUploadService.request_report_analysis(
            report_id=report_id,
            user_id=user_id,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("리포트 분석 요청 중 오류 발생")
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500
