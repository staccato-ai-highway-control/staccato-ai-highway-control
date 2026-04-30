import os
from datetime import datetime
from uuid import uuid4

from flask import current_app
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.cctv_models import Cctv
from app.models.incident_models import Incident
from app.models.report_models import AnalysisJob, ReportAttachment, ReportUpload


ALLOWED_UPLOAD_TYPES = {"IMAGE", "VIDEO", "ZIP", "OTHER"}
ALLOWED_UPLOAD_STATUSES = {
    "UPLOADED",
    "ANALYSIS_REQUESTED",
    "ANALYZED",
    "FAILED",
    "DELETED",
}
ALLOWED_JOB_TYPES = {
    "CCTV_STREAM_ANALYSIS",
    "UPLOAD_IMAGE_ANALYSIS",
    "UPLOAD_VIDEO_ANALYSIS",
    "REANALYSIS",
}
ALLOWED_JOB_STATUSES = {"QUEUED", "RUNNING", "SUCCESS", "FAILED", "CANCELLED"}


class ReportError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ReportService:
    @staticmethod
    def _get_storage_root():
        return current_app.config.get("STORAGE_ROOT", "/app/storage")

    @staticmethod
    def _infer_upload_type(filename, mime_type):
        lower_name = (filename or "").lower()
        lower_mime = (mime_type or "").lower()

        if lower_mime.startswith("image/") or lower_name.endswith((".jpg", ".jpeg", ".png", ".webp")):
            return "IMAGE"

        if lower_mime.startswith("video/") or lower_name.endswith((".mp4", ".avi", ".mov", ".mkv")):
            return "VIDEO"

        if lower_name.endswith(".zip"):
            return "ZIP"

        return "OTHER"

    @staticmethod
    def _save_uploaded_file(file):
        original_filename = secure_filename(file.filename or "uploaded_file")
        extension = os.path.splitext(original_filename)[1]
        stored_filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid4().hex}{extension}"

        storage_root = ReportService._get_storage_root()
        upload_dir = os.path.join(storage_root, "uploads")
        os.makedirs(upload_dir, exist_ok=True)

        saved_path = os.path.join(upload_dir, stored_filename)
        file.save(saved_path)

        file_size = os.path.getsize(saved_path)

        return {
            "original_filename": original_filename,
            "stored_filename": stored_filename,
            "file_path": saved_path.replace("\\", "/"),
            "file_size": file_size,
            "mime_type": file.mimetype,
        }

    @staticmethod
    def get_upload(upload_id):
        upload = ReportUpload.query.get(upload_id)

        if not upload or upload.upload_status == "DELETED":
            raise ReportError("Upload not found.", 404)

        return upload

    @staticmethod
    def list_uploads(filters):
        query = ReportUpload.query.order_by(ReportUpload.id.desc())

        if filters.get("upload_status"):
            query = query.filter_by(upload_status=filters["upload_status"])

        if filters.get("upload_type"):
            query = query.filter_by(upload_type=filters["upload_type"])

        if filters.get("incident_id"):
            query = query.filter_by(incident_id=filters["incident_id"])

        return [upload.to_dict() for upload in query.all()]

    @staticmethod
    def create_upload(data, actor_user, file=None):
        incident_id = data.get("incident_id")
        upload_type = data.get("upload_type")

        if incident_id:
            incident = Incident.query.get(incident_id)

            if not incident:
                raise ReportError("Incident not found.", 404)

        if file:
            saved = ReportService._save_uploaded_file(file)
            original_filename = saved["original_filename"]
            stored_filename = saved["stored_filename"]
            file_path = saved["file_path"]
            file_size = saved["file_size"]
            mime_type = saved["mime_type"]
            upload_type = upload_type or ReportService._infer_upload_type(original_filename, mime_type)
        else:
            original_filename = data.get("original_filename")
            stored_filename = data.get("stored_filename") or original_filename
            file_path = data.get("file_path")
            file_size = data.get("file_size")
            mime_type = data.get("mime_type")
            upload_type = upload_type or ReportService._infer_upload_type(original_filename, mime_type)

        if upload_type not in ALLOWED_UPLOAD_TYPES:
            raise ReportError("Invalid upload_type.", 400)

        if not original_filename:
            raise ReportError("original_filename is required.", 400)

        if not stored_filename:
            raise ReportError("stored_filename is required.", 400)

        if not file_path:
            raise ReportError("file_path is required.", 400)

        now = datetime.utcnow()

        upload = ReportUpload(
            uploaded_by=actor_user.id if actor_user else None,
            incident_id=incident_id,
            upload_type=upload_type,
            upload_status="UPLOADED",
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            uploaded_at=now,
        )

        db.session.add(upload)
        db.session.commit()

        return upload.to_dict()

    @staticmethod
    def delete_upload(upload_id):
        upload = ReportService.get_upload(upload_id)

        upload.upload_status = "DELETED"
        upload.deleted_at = datetime.utcnow()

        db.session.commit()

        return upload.to_dict()

    @staticmethod
    def create_analysis_job(upload_id, data, actor_user):
        upload = ReportService.get_upload(upload_id)

        cctv_id = data.get("cctv_id")
        incident_id = data.get("incident_id") or upload.incident_id
        job_type = data.get("job_type")

        if cctv_id:
            cctv = Cctv.query.get(cctv_id)

            if not cctv:
                raise ReportError("CCTV not found.", 404)

        if incident_id:
            incident = Incident.query.get(incident_id)

            if not incident:
                raise ReportError("Incident not found.", 404)

        if not job_type:
            if upload.upload_type == "IMAGE":
                job_type = "UPLOAD_IMAGE_ANALYSIS"
            elif upload.upload_type == "VIDEO":
                job_type = "UPLOAD_VIDEO_ANALYSIS"
            else:
                job_type = "REANALYSIS"

        if job_type not in ALLOWED_JOB_TYPES:
            raise ReportError("Invalid job_type.", 400)

        now = datetime.utcnow()

        job = AnalysisJob(
            requested_by=actor_user.id if actor_user else None,
            incident_id=incident_id,
            cctv_id=cctv_id,
            upload_id=upload.id,
            job_type=job_type,
            job_status="QUEUED",
            request_payload_json=data.get("request_payload_json") or {
                "upload_id": upload.id,
                "file_path": upload.file_path,
                "upload_type": upload.upload_type,
            },
            created_at=now,
        )

        upload.upload_status = "ANALYSIS_REQUESTED"

        db.session.add(job)
        db.session.commit()

        return job.to_dict()

    @staticmethod
    def get_analysis_job(job_id):
        job = AnalysisJob.query.get(job_id)

        if not job:
            raise ReportError("Analysis job not found.", 404)

        return job

    @staticmethod
    def list_analysis_jobs(filters):
        query = AnalysisJob.query.order_by(AnalysisJob.id.desc())

        if filters.get("job_status"):
            query = query.filter_by(job_status=filters["job_status"])

        if filters.get("job_type"):
            query = query.filter_by(job_type=filters["job_type"])

        if filters.get("upload_id"):
            query = query.filter_by(upload_id=filters["upload_id"])

        if filters.get("incident_id"):
            query = query.filter_by(incident_id=filters["incident_id"])

        return [job.to_dict() for job in query.all()]

    @staticmethod
    def update_analysis_job_status(job_id, data):
        job = ReportService.get_analysis_job(job_id)

        job_status = data.get("job_status")

        if job_status not in ALLOWED_JOB_STATUSES:
            raise ReportError("Invalid job_status.", 400)

        now = datetime.utcnow()

        job.job_status = job_status
        job.updated_at = now

        if job_status == "RUNNING" and not job.started_at:
            job.started_at = now

        if job_status in {"SUCCESS", "FAILED", "CANCELLED"}:
            job.finished_at = now

        if "result_json" in data:
            job.result_json = data.get("result_json")

        if "error_message" in data:
            job.error_message = data.get("error_message")

        if job.upload_id:
            upload = ReportUpload.query.get(job.upload_id)

            if upload:
                if job_status == "SUCCESS":
                    upload.upload_status = "ANALYZED"
                elif job_status == "FAILED":
                    upload.upload_status = "FAILED"

        db.session.commit()

        return job.to_dict()
