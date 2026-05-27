import logging

from flask import Blueprint, request, jsonify

from app.modules.incident.service import IncidentService
from app.modules.report_upload.service import ReportUploadService
from app.utils.security import require_auth


logger = logging.getLogger(__name__)

incident_bp = Blueprint("incident", __name__, url_prefix="/api/incidents")


@incident_bp.route("/health", methods=["GET"])
def health():
    return {"status": "incident module ok"}, 200


@incident_bp.route("", methods=["POST"])
@require_auth
def create_incident():
    if "file" not in request.files:
        return jsonify({
            "success": False,
            "error": "file field is missing in request.files"
        }), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({
            "success": False,
            "error": "filename is empty"
        }), 400

    form_data = request.form.to_dict()

    try:
        file_info = ReportUploadService.process_file_upload(file)
        result = IncidentService.create_incident(
            form_data,
            file_info,
            user_id=request.current_user.id
        )

        if result.get("status") == "success":
            return jsonify({
                "success": True,
                "report_id": result.get("report_id")
            }), 201

        logger.warning("Incident creation rejected", extra={
            "result": result
        })

        return jsonify({
            "success": False,
            "error": "Failed to create incident"
        }), 400

    except ValueError as e:
        logger.warning("Invalid incident upload request", extra={
            "error": str(e)
        })

        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

    except Exception:
        logger.exception("Unexpected incident creation error")

        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다."
        }), 500
