import hashlib
import os
import uuid
from datetime import UTC, datetime, time
from decimal import Decimal
from pathlib import PurePath

from flask import current_app, send_file
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
    def _is_previewable_attachment(attachment):
        mime_type = (getattr(attachment, "mime_type", None) or "").lower()
        file_type = (getattr(attachment, "file_type", None) or "").upper()

        return (
            file_type in {"IMAGE", "VIDEO"}
            or mime_type.startswith("image/")
            or mime_type.startswith("video/")
        )

    @staticmethod
    def _attachment_response(attachment):
        data = ReportUploadService._to_dict(attachment)

        is_previewable = ReportUploadService._is_previewable_attachment(attachment)
        preview_url = (
            f"/api/reports/attachments/{attachment.id}/preview"
            if is_previewable
            else None
        )
        download_url = f"/api/reports/attachments/{attachment.id}/download"

        data["preview_url"] = preview_url
        data["download_url"] = download_url

        # 기존 DB 컬럼이 NULL이어도 프론트가 사용할 수 있는 URL을 보강합니다.
        if not data.get("thumbnail_url") and preview_url:
            data["thumbnail_url"] = preview_url
        if not data.get("file_url"):
            data["file_url"] = download_url

        return data

    @staticmethod
    def _first_preview_url(attachments):
        for attachment in attachments:
            if ReportUploadService._is_previewable_attachment(attachment):
                return f"/api/reports/attachments/{attachment.id}/preview"
        return None

    @staticmethod
    def _attach_list_attachment_summaries(reports, items):
        from app.models import ReportAttachment

        report_ids = [report.id for report in reports]
        if not report_ids:
            return items

        query = ReportAttachment.query.filter(ReportAttachment.report_id.in_(report_ids))

        if hasattr(ReportAttachment, "deleted_at"):
            query = query.filter(ReportAttachment.deleted_at.is_(None))

        attachments = (
            query
            .order_by(ReportAttachment.report_id.asc(), ReportAttachment.id.asc())
            .all()
        )

        grouped = {}
        for attachment in attachments:
            grouped.setdefault(attachment.report_id, []).append(attachment)

        for item in items:
            report_attachments = grouped.get(item.get("id"), [])
            attachment_items = [
                ReportUploadService._attachment_response(attachment)
                for attachment in report_attachments
            ]

            item["attachments"] = attachment_items
            item["attachment_count"] = len(attachment_items)
            item["thumbnail_url"] = ReportUploadService._first_preview_url(report_attachments)

        return items

    @staticmethod
    def _resolve_attachment_path(attachment):
        raw_path = getattr(attachment, "file_path", None)
        if not raw_path:
            return None, {
                "success": False,
                "error": "첨부파일 경로가 없습니다.",
            }, 404

        file_path = os.path.abspath(raw_path)
        upload_base = current_app.config.get("UPLOAD_BASE_PATH")

        if not upload_base:
            return None, {
                "success": False,
                "error": "UPLOAD_BASE_PATH 설정이 없습니다.",
            }, 500

        upload_base = os.path.abspath(upload_base)

        try:
            is_inside_upload_base = os.path.commonpath([upload_base, file_path]) == upload_base
        except ValueError:
            is_inside_upload_base = False

        if not is_inside_upload_base:
            current_app.logger.warning(
                "Unsafe report attachment path blocked",
                extra={
                    "attachment_id": getattr(attachment, "id", None),
                    "file_path": file_path,
                    "upload_base": upload_base,
                },
            )
            return None, {
                "success": False,
                "error": "허용되지 않은 첨부파일 경로입니다.",
            }, 403

        if not os.path.isfile(file_path):
            current_app.logger.warning(
                "Report attachment file missing",
                extra={
                    "attachment_id": getattr(attachment, "id", None),
                    "file_path": file_path,
                },
            )
            return None, {
                "success": False,
                "error": "첨부파일을 찾을 수 없습니다.",
            }, 404

        return file_path, None, 200

    @staticmethod
    def get_attachment_file(attachment_id, current_user, as_download=False):
        from app.extensions import db
        from app.models import IncidentReport, ReportAttachment

        try:
            attachment_id = int(attachment_id)
        except (TypeError, ValueError):
            return {
                "success": False,
                "error": "첨부파일 ID가 올바르지 않습니다.",
            }, 400

        if attachment_id <= 0:
            return {
                "success": False,
                "error": "첨부파일 ID가 올바르지 않습니다.",
            }, 400

        attachment = db.session.get(ReportAttachment, attachment_id)
        if not attachment or getattr(attachment, "deleted_at", None):
            return {
                "success": False,
                "error": "첨부파일을 찾을 수 없습니다.",
            }, 404

        report = db.session.get(IncidentReport, attachment.report_id)
        if not report or getattr(report, "deleted_at", None):
            return {
                "success": False,
                "error": "신고를 찾을 수 없습니다.",
            }, 404

        if not ReportUploadService._can_manage_report(report, current_user):
            return {
                "success": False,
                "error": "첨부파일 접근 권한이 없습니다.",
            }, 403

        if not as_download and not ReportUploadService._is_previewable_attachment(attachment):
            return {
                "success": False,
                "error": "미리보기를 지원하지 않는 파일 형식입니다.",
            }, 415

        file_path, error_response, status_code = ReportUploadService._resolve_attachment_path(attachment)
        if error_response:
            return error_response, status_code

        try:
            if as_download:
                attachment.download_count = (attachment.download_count or 0) + 1
            else:
                attachment.access_count = (attachment.access_count or 0) + 1

            db.session.commit()
        except Exception:
            db.session.rollback()
            current_app.logger.exception(
                "Report attachment access counter update failed",
                extra={"attachment_id": attachment.id},
            )

        original_filename = getattr(attachment, "original_filename", None)
        stored_filename = getattr(attachment, "stored_filename", None)
        download_name = secure_filename(original_filename or "") or stored_filename or f"attachment-{attachment.id}"

        mimetype = getattr(attachment, "mime_type", None) or "application/octet-stream"

        response = send_file(
            file_path,
            mimetype=mimetype,
            as_attachment=as_download,
            download_name=download_name,
            conditional=True,
            max_age=0,
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "private, no-store"

        return response, 200

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

        data["attachments"] = [ReportUploadService._attachment_response(item) for item in attachments]
        data["attachment_count"] = len(attachments)
        data["thumbnail_url"] = ReportUploadService._first_preview_url(attachments)
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

        reports = list(pagination.items)
        items = [
            ReportUploadService._report_response(report, include_children=False)
            for report in reports
        ]
        ReportUploadService._attach_list_attachment_summaries(reports, items)

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
        jobs_to_process = []

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

                # 시연/개발 환경에서는 QUEUED 상태로 남아 있는 작업도 즉시 처리합니다.
                if (
                    existing_job.job_status == "QUEUED"
                    and existing_job.result_summary is None
                    and existing_job.completed_at is None
                ):
                    jobs_to_process.append((existing_job, attachment))

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
            jobs_to_process.append((job, attachment))

        db.session.commit()

        for job in jobs:
            emit_report_analysis_updated(job)

        for job, attachment in jobs_to_process:
            try:
                started_at = ReportUploadService._now()

                job.job_status = "PROCESSING"
                job.started_at = job.started_at or started_at
                job.updated_at = started_at
                job.progress_percent = 10
                db.session.add(job)
                db.session.commit()
                emit_report_analysis_updated(job)

                success, response = AIGatewayService.request_analysis(report.id, attachment.file_path)
                completed_at = ReportUploadService._now()

                if success:
                    result_summary = response if isinstance(response, dict) else {
                        "raw_response": str(response)
                    }

                    job.job_status = "COMPLETED"
                    job.completed_at = completed_at
                    job.updated_at = completed_at
                    job.progress_percent = 100
                    job.total_frames = 1
                    job.processed_frames = 1
                    job.result_summary = result_summary
                    job.raw_result_path = None
                    job.error_message = None
                    job.failed_reason_code = None
                    job.primary_model_name = "YOLO11"
                    job.primary_model_version = "current.pt"

                    db.session.add(job)
                    db.session.commit()
                    emit_report_analysis_updated(job)

                    current_app.logger.info("AI analysis completed", extra={
                        "report_id": report.id,
                        "attachment_id": attachment.id,
                        "job_id": job.id,
                        "count": result_summary.get("count"),
                    })
                else:
                    job.job_status = "FAILED"
                    job.completed_at = completed_at
                    job.updated_at = completed_at
                    job.progress_percent = 100
                    job.failed_reason_code = (
                        response.get("status")
                        if isinstance(response, dict)
                        else "AI_REQUEST_FAILED"
                    )
                    job.error_message = str(response)[:2000]

                    db.session.add(job)
                    db.session.commit()
                    emit_report_analysis_updated(job)

                    current_app.logger.warning("AI analysis failed", extra={
                        "report_id": report.id,
                        "attachment_id": attachment.id,
                        "job_id": job.id,
                        "response": response,
                    })

            except Exception as exc:
                current_app.logger.exception("AI analysis request raised exception", extra={
                    "report_id": report.id,
                    "attachment_id": attachment.id,
                    "job_id": job.id,
                })

                failed_at = ReportUploadService._now()
                job.job_status = "FAILED"
                job.completed_at = failed_at
                job.updated_at = failed_at
                job.progress_percent = 100
                job.failed_reason_code = "AI_REQUEST_EXCEPTION"
                job.error_message = str(exc)[:2000]

                db.session.add(job)
                db.session.commit()
                emit_report_analysis_updated(job)

        status_code = 201 if created_jobs else 200
        message = "분석 작업이 생성되었습니다." if created_jobs else "기존 대기 작업을 처리했습니다."

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
