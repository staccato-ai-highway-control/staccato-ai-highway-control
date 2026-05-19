import hashlib
import os
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import PurePath

from flask import current_app
from werkzeug.utils import secure_filename


class ReportUploadService:
    ACTIVE_JOB_STATUSES = {"QUEUED", "RUNNING", "PROCESSING", "STARTED"}

    @staticmethod
    def _now():
        return datetime.now(UTC)

    @staticmethod
    def _generate_report_code(now):
        timestamp = now.strftime("%Y%m%d")
        unique_suffix = uuid.uuid4().hex[:4].upper()
        return f"REP-{timestamp}-{unique_suffix}"

    @staticmethod
    def _clean_original_filename(filename):
        raw = str(filename or "").replace("\\", "/")
        name = PurePath(raw).name.strip()
        if not name:
            raise ValueError("유효하지 않은 파일명입니다.")
        return name

    @staticmethod
    def _stored_filename(original_filename):
        ext = os.path.splitext(original_filename)[1].lower()
        if not ext:
            safe_name = secure_filename(original_filename)
            ext = os.path.splitext(safe_name)[1].lower()

        if not ext:
            ext = ".bin"

        return f"{uuid.uuid4().hex}{ext}"

    @staticmethod
    def _get_file_type(filename):
        ext = os.path.splitext(str(filename).lower())[1].lstrip(".")
        if not ext and "." in str(filename):
            ext = str(filename).lower().rsplit(".", 1)[-1]

        if ext in ["jpg", "jpeg", "png", "gif"]:
            return "IMAGE"

        if ext in ["mp4", "mov", "avi", "mkv"]:
            return "VIDEO"

        return "UNKNOWN"

    @staticmethod
    def _validate_file_size(file_type, file_length):
        if file_type == "IMAGE":
            max_mb = current_app.config.get("UPLOAD_MAX_IMAGE_SIZE_MB", 20)
            if file_length > max_mb * 1024 * 1024:
                raise ValueError(f"이미지 크기가 너무 큽니다. (최대 {max_mb}MB)")

        if file_type == "VIDEO":
            max_mb = current_app.config.get("UPLOAD_MAX_VIDEO_SIZE_MB", 500)
            if file_length > max_mb * 1024 * 1024:
                raise ValueError(f"영상 크기가 너무 큽니다. (최대 {max_mb}MB)")

    @staticmethod
    def _model_kwargs(model_cls, values):
        columns = {column.name for column in model_cls.__table__.columns}
        return {key: value for key, value in values.items() if key in columns}

    @staticmethod
    def _to_dict(model):
        data = {}
        for column in model.__table__.columns:
            value = getattr(model, column.name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            elif isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data

    @staticmethod
    def _report_response(report, include_children=True):
        from app.models import ReportAnalysisJob, ReportAttachment, ReportLocation

        data = ReportUploadService._to_dict(report)

        if not include_children:
            return data

        attachments = (
            ReportAttachment.query
            .filter_by(report_id=report.id)
            .order_by(ReportAttachment.id.asc())
            .all()
        )
        locations = (
            ReportLocation.query
            .filter_by(report_id=report.id)
            .order_by(ReportLocation.id.asc())
            .all()
        )
        jobs = (
            ReportAnalysisJob.query
            .filter_by(report_id=report.id)
            .order_by(ReportAnalysisJob.id.asc())
            .all()
        )

        data["attachments"] = [ReportUploadService._to_dict(item) for item in attachments]
        data["locations"] = [ReportUploadService._to_dict(item) for item in locations]
        data["analysis_jobs"] = [ReportUploadService._to_dict(item) for item in jobs]

        return data

    @staticmethod
    def list_reports(args):
        from app.models import IncidentReport

        try:
            limit = int(args.get("limit", 50))
        except (TypeError, ValueError):
            limit = 50

        limit = max(1, min(limit, 200))

        reports = (
            IncidentReport.query
            .order_by(IncidentReport.id.desc())
            .limit(limit)
            .all()
        )

        return {
            "success": True,
            "reports": [
                ReportUploadService._report_response(report, include_children=False)
                for report in reports
            ],
        }, 200

    @staticmethod
    def get_report(report_id):
        from app.extensions import db
        from app.models import IncidentReport

        report = db.session.get(IncidentReport, report_id)
        if not report:
            return {
                "success": False,
                "error": "리포트를 찾을 수 없습니다.",
            }, 404

        return {
            "success": True,
            "report": ReportUploadService._report_response(report),
        }, 200

    @staticmethod
    def create_report(user_id, data, files):
        from app.extensions import db
        from app.models import IncidentReport, ReportAttachment, ReportLocation

        saved_file_paths = []
        now = ReportUploadService._now()

        try:
            report = IncidentReport(
                report_code=ReportUploadService._generate_report_code(now),
                report_type=data.get("report_type", "GENERAL"),
                upload_purpose=data.get("upload_purpose", "ANALYSIS"),
                report_source_type="WEB",
                title=data.get("subject") or data.get("title") or f"New Report {now.strftime('%Y%m%d')}",
                description=data.get("description"),
                reporter_id=user_id,
                status="SUBMITTED",
                priority=data.get("priority", "NORMAL"),
                is_demo_data=str(data.get("is_demo_data", "false")).lower() == "true",
                submitted_at=now,
                created_at=now,
                updated_at=now,
            )

            db.session.add(report)
            db.session.flush()

            upload_path = current_app.config.get("UPLOAD_BASE_PATH")
            if not upload_path:
                raise RuntimeError("UPLOAD_BASE_PATH 설정이 없습니다.")

            os.makedirs(upload_path, exist_ok=True)

            saved_count = 0

            for file in files:
                if not file or file.filename == "":
                    continue

                original_filename = ReportUploadService._clean_original_filename(file.filename)
                file_type = ReportUploadService._get_file_type(original_filename)

                if file_type == "UNKNOWN":
                    raise ValueError("지원하지 않는 파일 형식입니다.")

                file.seek(0, os.SEEK_END)
                file_length = file.tell()
                file.seek(0)

                ReportUploadService._validate_file_size(file_type, file_length)

                file.seek(0)
                file_hash = hashlib.md5(file.read()).hexdigest()
                file.seek(0)

                stored_filename = ReportUploadService._stored_filename(original_filename)
                file_full_path = os.path.join(upload_path, stored_filename)

                file.save(file_full_path)
                saved_file_paths.append(file_full_path)
                saved_count += 1

                attachment = ReportAttachment(
                    report_id=report.id,
                    file_type=file_type,
                    original_filename=original_filename,
                    stored_filename=stored_filename,
                    storage_type="LOCAL",
                    file_path=file_full_path,
                    file_size=file_length,
                    file_hash=file_hash,
                    mime_type=file.content_type or "application/octet-stream",
                    scan_status="PENDING",
                    is_private=False,
                    download_count=0,
                    access_count=0,
                    uploaded_by=user_id,
                    uploaded_at=now,
                    created_at=now,
                )
                db.session.add(attachment)

            if saved_count == 0:
                raise ValueError("저장 가능한 파일이 없습니다.")

            location_text = data.get("location") or data.get("address") or data.get("place_name")

            location = ReportLocation(**ReportUploadService._model_kwargs(
                ReportLocation,
                {
                    "report_id": report.id,
                    "location_source": "USER",
                    "latitude": data.get("latitude"),
                    "longitude": data.get("longitude"),
                    "place_name": location_text,
                    "address_raw": location_text,
                    "is_location_confirmed": 0,
                    "created_at": now,
                    "updated_at": now,
                },
            ))
            db.session.add(location)

            db.session.commit()
            return report

        except Exception:
            db.session.rollback()

            for path in saved_file_paths:
                if path and os.path.exists(path):
                    try:
                        os.remove(path)
                    except OSError:
                        current_app.logger.exception("업로드 파일 정리 실패", extra={"file_path": path})

            current_app.logger.exception("Report creation failed")
            raise

    @staticmethod
    def request_report_analysis(report_id, user_id):
        from app.extensions import db
        from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment
        from app.modules.ai_gateway.service import AIGatewayService

        now = ReportUploadService._now()

        report = db.session.get(IncidentReport, report_id)
        if not report:
            return {
                "success": False,
                "error": "리포트를 찾을 수 없습니다.",
            }, 404

        attachments = (
            ReportAttachment.query
            .filter_by(report_id=report.id)
            .order_by(ReportAttachment.id.asc())
            .all()
        )

        if not attachments:
            return {
                "success": False,
                "error": "분석할 첨부파일이 없습니다.",
            }, 400

        jobs = []
        created_jobs = []

        for attachment in attachments:
            existing_job = (
                ReportAnalysisJob.query
                .filter(
                    ReportAnalysisJob.report_id == report.id,
                    ReportAnalysisJob.attachment_id == attachment.id,
                    ReportAnalysisJob.job_status.in_(ReportUploadService.ACTIVE_JOB_STATUSES),
                )
                .order_by(ReportAnalysisJob.id.desc())
                .first()
            )

            if existing_job:
                jobs.append(existing_job)
                continue

            job = ReportAnalysisJob(
                report_id=report.id,
                attachment_id=attachment.id,
                job_status="QUEUED",
                analysis_type="INCIDENT_DETECTION",
                ai_engine_type="YOLOV8",
                confidence_threshold=0.450,
                lane_stop_threshold=10,
                shoulder_stop_threshold=15,
                movement_threshold_px=5,
                retry_count=0,
                requested_by=user_id,
                requested_at=now,
                created_at=now,
            )
            db.session.add(job)
            jobs.append(job)
            created_jobs.append((job, attachment))

        db.session.commit()

        for job, attachment in created_jobs:
            try:
                success, response = AIGatewayService.request_analysis(report.id, attachment.file_path)

                if success:
                    current_app.logger.info("AI analysis request accepted", extra={
                        "report_id": report.id,
                        "attachment_id": attachment.id,
                        "job_id": job.id,
                    })
                else:
                    current_app.logger.warning("AI analysis request failed", extra={
                        "report_id": report.id,
                        "attachment_id": attachment.id,
                        "job_id": job.id,
                        "response": response,
                    })

            except Exception:
                current_app.logger.exception("AI analysis request raised exception", extra={
                    "report_id": report.id,
                    "attachment_id": attachment.id,
                    "job_id": job.id,
                })

        status_code = 201 if created_jobs else 200
        message = "분석 작업이 생성되었습니다." if created_jobs else "이미 분석 작업이 대기 또는 진행 중입니다."

        return {
            "success": True,
            "message": message,
            "report_id": report.id,
            "jobs": [ReportUploadService._to_dict(job) for job in jobs],
            "job_id": jobs[0].id if len(jobs) == 1 else None,
            "job_status": jobs[0].job_status if len(jobs) == 1 else None,
        }, status_code

    @staticmethod
    def process_file_upload(file):
        if file is None or not getattr(file, "filename", ""):
            raise ValueError("파일이 업로드되지 않았습니다.")

        original_filename = ReportUploadService._clean_original_filename(file.filename)
        file_type = ReportUploadService._get_file_type(original_filename)

        if file_type == "UNKNOWN":
            raise ValueError("지원하지 않는 파일 형식입니다.")

        upload_path = current_app.config.get("UPLOAD_BASE_PATH")
        if not upload_path:
            raise RuntimeError("UPLOAD_BASE_PATH 설정이 없습니다.")

        os.makedirs(upload_path, exist_ok=True)

        file.seek(0, os.SEEK_END)
        file_length = file.tell()
        file.seek(0)

        ReportUploadService._validate_file_size(file_type, file_length)

        file.seek(0)
        file_hash = hashlib.md5(file.read()).hexdigest()
        file.seek(0)

        stored_filename = ReportUploadService._stored_filename(original_filename)
        file_full_path = os.path.join(upload_path, stored_filename)

        file.save(file_full_path)

        return {
            "filename": original_filename,
            "original_filename": original_filename,
            "stored_filename": stored_filename,
            "file_type": file_type,
            "content_type": getattr(file, "content_type", None),
            "mime_type": getattr(file, "content_type", None) or "application/octet-stream",
            "storage_type": "LOCAL",
            "file_path": file_full_path,
            "file_size": file_length,
            "file_hash": file_hash,
            "scan_status": "PENDING",
            "is_private": 1,
        }
