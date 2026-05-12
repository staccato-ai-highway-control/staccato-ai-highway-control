from decimal import Decimal

from app.extensions import db


class IncidentReport(db.Model):
    __tablename__ = "incident_reports"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    report_code = db.Column(db.String(50), nullable=False)
    report_type = db.Column(db.String(50), nullable=False)
    upload_purpose = db.Column(db.String(30), nullable=False)
    report_source_type = db.Column(db.String(30), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    reporter_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    cctv_id = db.Column(db.BigInteger, nullable=True)
    status = db.Column(db.String(30), nullable=False)
    priority = db.Column(db.String(20), nullable=False)
    risk_level = db.Column(db.String(20), nullable=True)
    risk_score = db.Column(db.Integer, nullable=True)
    reviewed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    closed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    reject_reason = db.Column(db.Text, nullable=True)
    is_demo_data = db.Column(db.Integer, nullable=False)
    converted_incident_id = db.Column(db.BigInteger, nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=False)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    closed_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        data = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            elif isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data


class ReportAttachment(db.Model):
    __tablename__ = "report_attachments"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    file_type = db.Column(db.String(30), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    storage_type = db.Column(db.String(30), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_url = db.Column(db.String(500), nullable=True)
    thumbnail_url = db.Column(db.String(500), nullable=True)
    file_hash = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    scan_status = db.Column(db.String(30), nullable=False)
    is_private = db.Column(db.Integer, nullable=False)
    download_count = db.Column(db.Integer, nullable=False)
    access_count = db.Column(db.Integer, nullable=False)
    duration_seconds = db.Column(db.Numeric(8, 2), nullable=True)
    fps = db.Column(db.Numeric(5, 2), nullable=True)
    resolution_width = db.Column(db.Integer, nullable=True)
    resolution_height = db.Column(db.Integer, nullable=True)
    exif_latitude = db.Column(db.Numeric(10, 7), nullable=True)
    exif_longitude = db.Column(db.Numeric(10, 7), nullable=True)
    recorded_at = db.Column(db.DateTime, nullable=True)
    uploaded_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    uploaded_at = db.Column(db.DateTime, nullable=False)
    deleted_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    delete_reason = db.Column(db.Text, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        data = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            elif isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data


class ReportAnalysisJob(db.Model):
    __tablename__ = "report_analysis_jobs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    attachment_id = db.Column(db.BigInteger, db.ForeignKey("report_attachments.id"), nullable=False)
    job_status = db.Column(db.String(30), nullable=False)
    analysis_type = db.Column(db.String(30), nullable=False)
    ai_engine_type = db.Column(db.String(30), nullable=False)
    primary_model_name = db.Column(db.String(100), nullable=True)
    primary_model_version = db.Column(db.String(50), nullable=True)
    secondary_model_name = db.Column(db.String(100), nullable=True)
    secondary_model_version = db.Column(db.String(50), nullable=True)
    model_strategy = db.Column(db.String(30), nullable=True)
    confidence_threshold = db.Column(db.Numeric(4, 3), nullable=False)
    lane_stop_threshold = db.Column(db.Integer, nullable=False)
    shoulder_stop_threshold = db.Column(db.Integer, nullable=False)
    movement_threshold_px = db.Column(db.Integer, nullable=False)
    sample_fps = db.Column(db.Numeric(5, 2), nullable=True)
    total_frames = db.Column(db.Integer, nullable=True)
    processed_frames = db.Column(db.Integer, nullable=True)
    progress_percent = db.Column(db.Numeric(5, 2), nullable=True)
    retry_count = db.Column(db.Integer, nullable=False)
    latency_ms = db.Column(db.Integer, nullable=True)
    result_summary = db.Column(db.JSON, nullable=True)
    raw_result_path = db.Column(db.String(500), nullable=True)
    created_incident_id = db.Column(db.BigInteger, nullable=True)
    requested_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    requested_at = db.Column(db.DateTime, nullable=False)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    failed_reason_code = db.Column(db.String(50), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        data = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            elif isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data

