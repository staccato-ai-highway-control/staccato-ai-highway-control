from flask import Blueprint, request, jsonify
from app.modules.incident.service import IncidentService
from app.modules.report_upload.service import ReportUploadService

incident_bp = Blueprint("incident", __name__, url_prefix="/api/incidents")

@incident_bp.route("/health", methods=["GET"])
def health():
    return {"status": "incident module ok"}, 200

@incident_bp.route("", methods=["POST"])
def create_incident():
    print(f"Files: {request.files}")
    print(f"Form: {request.form}")

    if 'file' not in request.files:
        return jsonify({"success": False, "error": "file field is missing in request.files"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "filename is empty"}), 400

    form_data = request.form.to_dict()

    try:
        file_info = ReportUploadService.process_file_upload(file)
        result = IncidentService.create_incident(form_data, file_info, user_id=1)

        # 수정된 부분: 'status' 키를 확인하거나 리턴값 구조에 맞춰 체크
        if result.get('status') == 'success':
            return jsonify({
                "success": True,
                "report_id": result.get("report_id")
            }), 201

        return jsonify({"success": False, "error": "Failed to create incident"}), 400

    except Exception as e:
        print(f"Exception detail: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
