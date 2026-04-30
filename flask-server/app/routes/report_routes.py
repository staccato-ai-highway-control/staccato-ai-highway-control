from flask import Blueprint, jsonify, request

from app.services.report_service import ReportError, ReportService
from app.utils.security import require_auth, require_roles


report_bp = Blueprint("report", __name__)


@report_bp.get("/uploads")
@require_auth
def list_uploads():
    filters = {
        "upload_status": request.args.get("upload_status"),
        "upload_type": request.args.get("upload_type"),
        "incident_id": request.args.get("incident_id", type=int),
    }

    return jsonify(
        {
            "data": ReportService.list_uploads(filters),
        }
    )


@report_bp.post("/uploads")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN", "MAINTENANCE_ADMIN")
def create_upload():
    file = request.files.get("file")

    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

        for int_field in ["incident_id", "file_size"]:
            if data.get(int_field):
                data[int_field] = int(data[int_field])

    try:
        result = ReportService.create_upload(
            data=data,
            actor_user=request.current_user,
            file=file,
        )

        return jsonify(
            {
                "message": "Upload created.",
                "data": result,
            }
        ), 201

    except ReportError as error:
        return jsonify({"message": error.message}), error.status_code


@report_bp.get("/uploads/<int:upload_id>")
@require_auth
def get_upload(upload_id):
    try:
        upload = ReportService.get_upload(upload_id)

        return jsonify(
            {
                "data": upload.to_dict(),
            }
        )

    except ReportError as error:
        return jsonify({"message": error.message}), error.status_code


@report_bp.delete("/uploads/<int:upload_id>")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN", "MAINTENANCE_ADMIN")
def delete_upload(upload_id):
    try:
        result = ReportService.delete_upload(upload_id)

        return jsonify(
            {
                "message": "Upload deleted.",
                "data": result,
            }
        )

    except ReportError as error:
        return jsonify({"message": error.message}), error.status_code


@report_bp.post("/uploads/<int:upload_id>/analysis-jobs")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN", "MAINTENANCE_ADMIN")
def create_analysis_job(upload_id):
    data = request.get_json(silent=True) or {}

    try:
        result = ReportService.create_analysis_job(
            upload_id=upload_id,
            data=data,
            actor_user=request.current_user,
        )

        return jsonify(
            {
                "message": "Analysis job created.",
                "data": result,
            }
        ), 201

    except ReportError as error:
        return jsonify({"message": error.message}), error.status_code


@report_bp.get("/analysis-jobs")
@require_auth
def list_analysis_jobs():
    filters = {
        "job_status": request.args.get("job_status"),
        "job_type": request.args.get("job_type"),
        "upload_id": request.args.get("upload_id", type=int),
        "incident_id": request.args.get("incident_id", type=int),
    }

    return jsonify(
        {
            "data": ReportService.list_analysis_jobs(filters),
        }
    )


@report_bp.get("/analysis-jobs/<int:job_id>")
@require_auth
def get_analysis_job(job_id):
    try:
        job = ReportService.get_analysis_job(job_id)

        return jsonify(
            {
                "data": job.to_dict(),
            }
        )

    except ReportError as error:
        return jsonify({"message": error.message}), error.status_code


@report_bp.patch("/analysis-jobs/<int:job_id>/status")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN", "MAINTENANCE_ADMIN")
def update_analysis_job_status(job_id):
    data = request.get_json(silent=True) or {}

    try:
        result = ReportService.update_analysis_job_status(job_id, data)

        return jsonify(
            {
                "message": "Analysis job status updated.",
                "data": result,
            }
        )

    except ReportError as error:
        return jsonify({"message": error.message}), error.status_code
