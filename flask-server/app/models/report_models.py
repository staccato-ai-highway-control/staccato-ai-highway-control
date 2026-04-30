from app.extensions import db


class ReportUpload(db.Model):
    __tablename__ = "report_uploads"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    uploaded_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    upload_type = db.Column(db.String(50), nullable=False, default="OTHER")
    upload_status = db.Column(db.String(50), nullable=False, default="UPLOADED")
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=True)
    mime_type = db.Column(db.String(100), nullable=True)
    uploaded_at = db.Column(db.DateTime, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "uploaded_by": self.uploaded_by,
            "incident_id": self.incident_id,
            "upload_type": self.upload_type,
            "upload_status": self.upload_status,
            "original_filename": self.original_filename,
            "stored_filename": self.stored_filename,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
        }


class ReportAttachment(db.Model):
    __tablename__ = "report_attachments"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    upload_id = db.Column(db.BigInteger, db.ForeignKey("report_uploads.id"), nullable=True)
    attachment_type = db.Column(db.String(50), nullable=False, default="OTHER")
    file_path = db.Column(db.String(500), nullable=False)
    thumbnail_path = db.Column(db.String(500), nullable=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "upload_id": self.upload_id,
            "attachment_type": self.attachment_type,
            "file_path": self.file_path,
            "thumbnail_path": self.thumbnail_path,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AnalysisJob(db.Model):
    __tablename__ = "analysis_jobs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    requested_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    cctv_id = db.Column(db.BigInteger, db.ForeignKey("cctvs.id"), nullable=True)
    upload_id = db.Column(db.BigInteger, db.ForeignKey("report_uploads.id"), nullable=True)
    job_type = db.Column(db.String(50), nullable=False)
    job_status = db.Column(db.String(50), nullable=False, default="QUEUED")
    request_payload_json = db.Column(db.JSON, nullable=True)
    result_json = db.Column(db.JSON, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "requested_by": self.requested_by,
            "incident_id": self.incident_id,
            "cctv_id": self.cctv_id,
            "upload_id": self.upload_id,
            "job_type": self.job_type,
            "job_status": self.job_status,
            "request_payload_json": self.request_payload_json,
            "result_json": self.result_json,
            "error_message": self.error_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
