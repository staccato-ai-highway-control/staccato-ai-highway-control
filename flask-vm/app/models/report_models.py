from app.extensions import db


class IncidentReport(db.Model):
    __tablename__ = "incident_reports"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    title = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)

    reporter_user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    cctv_id = db.Column(db.BigInteger, nullable=True)

    report_type = db.Column(db.String(50), nullable=False, default="MANUAL")
    report_status = db.Column(db.String(50), nullable=False, default="RECEIVED")

    source_type = db.Column(db.String(50), nullable=False, default="UPLOAD")
    location_name = db.Column(db.String(255), nullable=True)
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    longitude = db.Column(db.Numeric(10, 7), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "reporter_user_id": self.reporter_user_id,
            "cctv_id": self.cctv_id,
            "report_type": self.report_type,
            "report_status": self.report_status,
            "source_type": self.source_type,
            "location_name": self.location_name,
            "latitude": float(self.latitude) if self.latitude is not None else None,
            "longitude": float(self.longitude) if self.longitude is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
        }


class ReportAttachment(db.Model):
    __tablename__ = "report_attachments"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=True)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)

    attachment_type = db.Column(db.String(50), nullable=False, default="OTHER")
    original_filename = db.Column(db.String(255), nullable=True)
    stored_filename = db.Column(db.String(255), nullable=True)
    file_path = db.Column(db.String(500), nullable=False)
    thumbnail_path = db.Column(db.String(500), nullable=True)
    mime_type = db.Column(db.String(100), nullable=True)
    file_size = db.Column(db.BigInteger, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "report_id": self.report_id,
            "incident_id": self.incident_id,
            "attachment_type": self.attachment_type,
            "original_filename": self.original_filename,
            "stored_filename": self.stored_filename,
            "file_path": self.file_path,
            "thumbnail_path": self.thumbnail_path,
            "mime_type": self.mime_type,
            "file_size": self.file_size,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
        }


class ReportAnalysisJob(db.Model):
    __tablename__ = "report_analysis_jobs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    requested_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)

    job_type = db.Column(db.String(50), nullable=False, default="AI_ANALYSIS")
    job_status = db.Column(db.String(50), nullable=False, default="QUEUED")

    ai_request_json = db.Column(db.JSON, nullable=True)
    ai_result_json = db.Column(db.JSON, nullable=True)
    error_message = db.Column(db.Text, nullable=True)

    started_at = db.Column(db.DateTime, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "report_id": self.report_id,
            "requested_by": self.requested_by,
            "job_type": self.job_type,
            "job_status": self.job_status,
            "ai_request_json": self.ai_request_json,
            "ai_result_json": self.ai_result_json,
            "error_message": self.error_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
