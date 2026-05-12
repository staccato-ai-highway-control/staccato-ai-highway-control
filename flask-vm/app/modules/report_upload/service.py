import os
import uuid
import hashlib
from datetime import datetime, timezone

from app.extensions import db
from app.models.report_models import ReportAttachment


class ReportUploadService:
    UPLOAD_PATH = "/home/lsh/staccato-ai-highway-control/storage/uploads"
    ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'jpg', 'jpeg', 'png'}

    @staticmethod
    def process_file_upload(file):
        if not file or file.filename == '':
            raise ValueError("파일이 없습니다.")

        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if ext not in ReportUploadService.ALLOWED_EXTENSIONS:
            raise ValueError(f"허용되지 않는 확장자입니다: {ext}")

        stored_filename = f"{uuid.uuid4().hex}.{ext}"
        file_path = os.path.join(ReportUploadService.UPLOAD_PATH, stored_filename)
        os.makedirs(ReportUploadService.UPLOAD_PATH, exist_ok=True)
        file.save(file_path)

        file_size = os.path.getsize(file_path)
        with open(file_path, 'rb') as f:
            file_hash = hashlib.md5(f.read()).hexdigest()

        return {
            "file_type": 'VIDEO' if ext in {'mp4', 'mov', 'avi'} else 'IMAGE',
            "original_filename": file.filename,
            "stored_filename": stored_filename,
            "file_path": file_path,
            "file_size": file_size,
            "file_hash": file_hash,
            "mime_type": file.content_type
        }

    # ──────────────────────────────────────────
    # 파일 업로드 후 DB 저장
    # ──────────────────────────────────────────
    @staticmethod
    def save_attachment(report_id: int, file, current_user) -> dict:
        file_info = ReportUploadService.process_file_upload(file)

        now = datetime.now(timezone.utc)

        attachment = ReportAttachment(
            report_id=report_id,
            file_type=file_info["file_type"],
            original_filename=file_info["original_filename"],
            stored_filename=file_info["stored_filename"],
            storage_type="LOCAL",
            file_path=file_info["file_path"],
            file_hash=file_info["file_hash"],
            file_size=file_info["file_size"],
            mime_type=file_info["mime_type"],
            scan_status="PENDING",
            is_private=True,
            download_count=0,
            access_count=0,
            uploaded_by=current_user.id,
            uploaded_at=now,
            created_at=now,
        )
        db.session.add(attachment)
        db.session.commit()

        return attachment.to_dict()

    # ──────────────────────────────────────────
    # 첨부파일 목록 조회
    # ──────────────────────────────────────────
    @staticmethod
    def list_attachments(report_id: int) -> list:
        attachments = ReportAttachment.query.filter_by(
            report_id=report_id,
            deleted_at=None
        ).order_by(ReportAttachment.created_at.desc()).all()

        return [a.to_dict() for a in attachments]

    # ──────────────────────────────────────────
    # 첨부파일 삭제 (논리 삭제)
    # ──────────────────────────────────────────
    @staticmethod
    def delete_attachment(report_id: int, attachment_id: int, current_user) -> None:
        attachment = ReportAttachment.query.filter_by(
            id=attachment_id,
            report_id=report_id,
            deleted_at=None
        ).first()

        if not attachment:
            raise ValueError("첨부파일을 찾을 수 없습니다.")

        now = datetime.now(timezone.utc)
        attachment.deleted_at = now
        attachment.deleted_by = current_user.id
        db.session.commit()
