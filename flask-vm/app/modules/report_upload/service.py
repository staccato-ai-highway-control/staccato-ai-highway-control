import os
import hashlib
import uuid
from datetime import datetime, UTC
from werkzeug.utils import secure_filename
from flask import current_app


class ReportUploadService:
    @staticmethod
    def create_report(user_id, data, files):
        from app.extensions import db
        from app.models import IncidentReport, ReportAttachment
        from app.models import ReportLocation

        try:
            # 1. 리포트 기본 정보 생성
            timestamp = datetime.now(UTC).strftime("%Y%m%d")
            unique_suffix = uuid.uuid4().hex[:4].upper()
            report_code = f"REP-{timestamp}-{unique_suffix}"

            report = IncidentReport(
                report_code=report_code,
                report_type=data.get("report_type", "GENERAL"),
                upload_purpose=data.get("upload_purpose", "ANALYSIS"),
                report_source_type="WEB",
                title=data.get("subject") or data.get("title", f"New Report {timestamp}"),
                description=data.get("description"),
                reporter_id=user_id,
                status="SUBMITTED",
                priority=data.get("priority", "NORMAL"),
                is_demo_data=str(data.get("is_demo_data", "false")).lower() == "true",
                submitted_at=datetime.now(UTC),
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )

            db.session.add(report)
            db.session.flush()

            # 2. 첨부 파일 처리 및 크기 검증
            if files:
                upload_path = current_app.config.get("UPLOAD_BASE_PATH")
                if not os.path.exists(upload_path):
                    os.makedirs(upload_path, exist_ok=True)

                for file in files:
                    if not file or file.filename == "":
                        continue

                    file_type = ReportUploadService._get_file_type(file.filename)

                    file.seek(0, os.SEEK_END)
                    file_length = file.tell()
                    file.seek(0)

                    if file_type == "IMAGE":
                        max_mb = current_app.config.get("UPLOAD_MAX_IMAGE_SIZE_MB", 20)
                        if file_length > max_mb * 1024 * 1024:
                            raise ValueError(f"이미지 크기가 너무 큽니다. (최대 {max_mb}MB)")

                    elif file_type == "VIDEO":
                        max_mb = current_app.config.get("UPLOAD_MAX_VIDEO_SIZE_MB", 500)
                        if file_length > max_mb * 1024 * 1024:
                            raise ValueError(f"영상 크기가 너무 큽니다. (최대 {max_mb}MB)")

                    # 파일 해시 계산
                    file.seek(0)
                    file_hash = hashlib.md5(file.read()).hexdigest()
                    file.seek(0)

                    original_filename = secure_filename(file.filename)
                    stored_filename = f"{uuid.uuid4().hex}_{original_filename}"
                    file_full_path = os.path.join(upload_path, stored_filename)

                    file.save(file_full_path)

                    attachment = ReportAttachment(
                        report_id=report.id,
                        file_type=file_type,
                        original_filename=original_filename,
                        stored_filename=stored_filename,
                        storage_type="LOCAL",
                        file_path=file_full_path,
                        file_size=file_length,
                        file_hash=file_hash,
                        mime_type=file.content_type,
                        scan_status="PENDING",
                        is_private=False,
                        download_count=0,
                        access_count=0,
                        uploaded_by=user_id,
                        uploaded_at=datetime.now(UTC),
                        created_at=datetime.now(UTC),
                    )
                    db.session.add(attachment)

            # 3. 위치 정보 저장
            location = ReportLocation(
                report_id=report.id,
                location_source="USER",
                latitude=data.get("latitude"),
                longitude=data.get("longitude"),
                is_location_confirmed=0,
                created_at=datetime.now(UTC),
            )
            db.session.add(location)

            db.session.commit()
            return report

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Report creation failed: {str(e)}")
            raise e


    @staticmethod
    def process_file_upload(file):
        """Persist a single uploaded file and return attachment metadata.

        This helper is used by incident routes. It performs the same core
        persistence steps as create_report(): filename sanitization, file type
        detection, size validation, hash calculation, local save, and metadata
        generation for ReportAttachment.
        """
        if file is None or not getattr(file, "filename", ""):
            raise ValueError("파일이 업로드되지 않았습니다.")

        original_filename = secure_filename(file.filename)
        if not original_filename:
            raise ValueError("유효하지 않은 파일명입니다.")

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

        if file_type == "IMAGE":
            max_mb = current_app.config.get("UPLOAD_MAX_IMAGE_SIZE_MB", 20)
            if file_length > max_mb * 1024 * 1024:
                raise ValueError(f"이미지 크기가 너무 큽니다. (최대 {max_mb}MB)")

        elif file_type == "VIDEO":
            max_mb = current_app.config.get("UPLOAD_MAX_VIDEO_SIZE_MB", 500)
            if file_length > max_mb * 1024 * 1024:
                raise ValueError(f"영상 크기가 너무 큽니다. (최대 {max_mb}MB)")

        file.seek(0)
        file_hash = hashlib.md5(file.read()).hexdigest()
        file.seek(0)

        stored_filename = f"{uuid.uuid4().hex}_{original_filename}"
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

    @staticmethod
    def _get_file_type(filename):
        ext = filename.lower().split(".")[-1]
        if ext in ["jpg", "jpeg", "png", "gif"]:
            return "IMAGE"
        elif ext in ["mp4", "mov", "avi", "mkv"]:
            return "VIDEO"
        return "UNKNOWN"
