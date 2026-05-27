import hashlib
import os
import uuid
from datetime import UTC, datetime, time
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
    def _to_optional_decimal(value, field_name):
        if value is None:
            return None

        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None

        try:
            return Decimal(str(value))
        except Exception as exc:
            raise ValueError(f"{field_name} 값이 올바르지 않습니다.") from exc

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
    def _to_positive_int(value, default, minimum=1, maximum=200):
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            parsed = default

        return max(minimum, min(parsed, maximum))

    @staticmethod
    def _to_bool(value):
        if isinstance(value, bool):
            return value

        if value is None:
            return False

        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    @staticmethod
    def _parse_date(value, field_name, end_of_day=False):
        if value is None:
            return None

        raw = str(value).strip()
        if not raw:
            return None

        try:
            if len(raw) == 10:
                parsed_date = datetime.fromisoformat(raw).date()
                parsed_time = time.max if end_of_day else time.min
                return datetime.combine(parsed_date, parsed_time)

            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(f"{field_name} 값이 올바르지 않습니다.") from exc

    @staticmethod
    def _is_report_editable(report):
        return report.status not in {"CLOSED", "CANCELLED", "DELETED"}

    @staticmethod
    def _can_manage_report(report, current_user):
        return (
            report.reporter_id == current_user.id
            or current_user.role in {"SUPER_ADMIN", "CONTROL_ADMIN"}
        )

    @staticmethod
    def _upsert_report_location(report_id, data, user_id=None):
        from app.models import ReportLocation

        now = ReportUploadService._now()
        has_location_key = any(
            key in data
            for key in ("location", "address", "place_name", "latitude", "longitude")
        )

        if not has_location_key:
            return

        location_text = (
            data.get("location")
            or data.get("address")
            or data.get("place_name")
            or ""
        ).strip()
        latitude = ReportUploadService._to_optional_decimal(data.get("latitude"), "위도")
        longitude = ReportUploadService._to_optional_decimal(data.get("longitude"), "경도")

        if not location_text and latitude is None and longitude is None:
            return

        location = (
            ReportLocation.query
            .filter_by(report_id=report_id)
            .order_by(ReportLocation.id.asc())
            .first()
        )

        if location is None:
            location = ReportLocation(**ReportUploadService._model_kwargs(
                ReportLocation,
                {
                    "report_id": report_id,
                    "location_source": "USER",
                    "is_location_confirmed": 0,
                    "created_at": now,
                },
            ))

        for key, value in ReportUploadService._model_kwargs(
            ReportLocation,
            {
                "latitude": latitude,
                "longitude": longitude,
                "place_name": location_text or None,
                "address_raw": location_text or None,
                "updated_at": now,
            },
        ).items():
            setattr(location, key, value)

        return location

    @staticmethod
    def list_reports(args, current_user=None, mine_only=False):
        from app.models import IncidentReport
        from sqlalchemy import or_

        page = ReportUploadService._to_positive_int(args.get("page"), 1, maximum=100000)
        size = ReportUploadService._to_positive_int(
            args.get("size", args.get("limit", 10)),
            10,
            maximum=200,
        )

        query = IncidentReport.query

        status = args.get("status")
        if status:
            query = query.filter(IncidentReport.status == status)
        else:
            query = query.filter(IncidentReport.status.notin_(("CANCELLED", "DELETED")))
            if hasattr(IncidentReport, "deleted_at"):
                query = query.filter(IncidentReport.deleted_at.is_(None))

        keyword = args.get("keyword")
        if keyword:
            like_keyword = f"%{keyword}%"
            query = query.filter(or_(
                IncidentReport.title.ilike(like_keyword),
                IncidentReport.description.ilike(like_keyword),
                IncidentReport.report_code.ilike(like_keyword),
            ))

        filters = {
            "report_type": IncidentReport.report_type,
            "priority": IncidentReport.priority,
            "risk_level": IncidentReport.risk_level,
        }

        for param_name, column in filters.items():
            value = args.get(param_name)
            if value:
                query = query.filter(column == value)

        cctv_id = args.get("cctv_id")
        if cctv_id not in (None, ""):
            try:
                query = query.filter(IncidentReport.cctv_id == int(cctv_id))
            except (TypeError, ValueError) as exc:
                raise ValueError("cctv_id 값이 올바르지 않습니다.") from exc

        start_date = ReportUploadService._parse_date(args.get("start_date"), "start_date")
        end_date = ReportUploadService._parse_date(args.get("end_date"), "end_date", end_of_day=True)

        if start_date:
            query = query.filter(IncidentReport.submitted_at >= start_date)

        if end_date:
            query = query.filter(IncidentReport.submitted_at <= end_date)

        mine = mine_only or ReportUploadService._to_bool(args.get("mine"))
        if mine:
            if current_user is None:
                raise ValueError("mine 필터는 로그인 사용자가 필요합니다.")
            query = query.filter(IncidentReport.reporter_id == current_user.id)

        pagination = query.order_by(IncidentReport.id.desc()).paginate(
            page=page,
            per_page=size,
            error_out=False,
        )

        items = [
            ReportUploadService._report_response(report, include_children=False)
            for report in pagination.items
        ]

        data = {
            "items": items,
            "page": page,
            "size": size,
            "total_count": pagination.total,
            "total_pages": pagination.pages,
        }

        return {
            "success": True,
            "data": data,
            "reports": items,
            "page": page,
            "size": size,
            "total_count": pagination.total,
            "total_pages": pagination.pages,
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

            location_text = (data.get("location") or data.get("address") or data.get("place_name") or "").strip()
            latitude = ReportUploadService._to_optional_decimal(data.get("latitude"), "위도")
            longitude = ReportUploadService._to_optional_decimal(data.get("longitude"), "경도")

            if location_text or latitude is not None or longitude is not None:
                location = ReportLocation(**ReportUploadService._model_kwargs(
                    ReportLocation,
                    {
                        "report_id": report.id,
                        "location_source": "USER",
                        "latitude": latitude,
                        "longitude": longitude,
                        "place_name": location_text or None,
                        "address_raw": location_text or None,
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
    def update_report(report_id, current_user, data):
        from app.extensions import db
        from app.models import IncidentReport

        data = data or {}
        report = db.session.get(IncidentReport, report_id)

        if not report:
            return {
                "success": False,
                "error": "리포트를 찾을 수 없습니다.",
            }, 404

        if not ReportUploadService._can_manage_report(report, current_user):
            return {
                "success": False,
                "error": "신고 수정 권한이 없습니다.",
            }, 403

        if not ReportUploadService._is_report_editable(report):
            return {
                "success": False,
                "error": "수정할 수 없는 신고 상태입니다.",
            }, 400

        try:
            if "report_type" in data:
                report.report_type = data.get("report_type") or report.report_type
            if "upload_purpose" in data:
                report.upload_purpose = data.get("upload_purpose") or report.upload_purpose
            if "title" in data or "subject" in data:
                report.title = data.get("title") or data.get("subject") or report.title
            if "description" in data:
                report.description = data.get("description")
            if "priority" in data:
                report.priority = data.get("priority") or report.priority

            report.updated_at = ReportUploadService._now()

            location = ReportUploadService._upsert_report_location(
                report_id=report.id,
                data=data,
                user_id=current_user.id,
            )
            if location is not None:
                db.session.add(location)

            db.session.commit()

        except ValueError as exc:
            db.session.rollback()
            return {
                "success": False,
                "error": str(exc),
            }, 400
        except Exception:
            db.session.rollback()
            current_app.logger.exception("Report update failed", extra={"report_id": report_id})
            raise

        return {
            "success": True,
            "message": "신고가 수정되었습니다.",
            "data": ReportUploadService._report_response(report),
        }, 200

    @staticmethod
    def delete_report(report_id, current_user):
        from app.extensions import db
        from app.models import IncidentReport, ReportAnalysisJob

        report = db.session.get(IncidentReport, report_id)

        if not report:
            return {
                "success": False,
                "error": "리포트를 찾을 수 없습니다.",
            }, 404

        if not ReportUploadService._can_manage_report(report, current_user):
            return {
                "success": False,
                "error": "신고 삭제 권한이 없습니다.",
            }, 403

        if report.converted_incident_id:
            return {
                "success": False,
                "error": "이상상황으로 전환된 신고는 삭제할 수 없습니다.",
            }, 409

        active_job = (
            ReportAnalysisJob.query
            .filter(
                ReportAnalysisJob.report_id == report.id,
                ReportAnalysisJob.job_status.in_(ReportUploadService.ACTIVE_JOB_STATUSES),
            )
            .first()
        )
        if active_job:
            return {
                "success": False,
                "error": "분석 중인 신고는 삭제할 수 없습니다.",
            }, 409

        if report.status in {"CANCELLED", "DELETED"}:
            return {
                "success": False,
                "error": "이미 삭제 또는 취소 처리된 신고입니다.",
            }, 400

        now = ReportUploadService._now()
        report.status = "CANCELLED"
        report.deleted_at = now
        report.deleted_by = current_user.id
        report.updated_at = now

        db.session.commit()

        return {
            "success": True,
            "message": "신고가 삭제 또는 취소 처리되었습니다.",
        }, 200

    @staticmethod
    def request_report_analysis(report_id, user_id):
        from app.extensions import db
        from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment
        from app.modules.ai_gateway.service import AIGatewayService
        from app.modules.socketio.emitters import emit_report_analysis_updated

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
                ai_engine_type="YOLOV11",
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

        for job in jobs:
            emit_report_analysis_updated(job)

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
