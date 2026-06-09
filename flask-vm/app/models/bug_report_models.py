from app.extensions import db


class BugReport(db.Model):
    __tablename__ = "bug_reports"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    reporter_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    assigned_to = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)

    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)

    category = db.Column(db.String(50), nullable=False, default="GENERAL")
    severity = db.Column(db.String(30), nullable=False, default="MINOR")
    priority = db.Column(db.String(30), nullable=False, default="MEDIUM")
    status = db.Column(db.String(30), nullable=False, default="OPEN")

    page_url = db.Column(db.String(500), nullable=True)
    steps_to_reproduce = db.Column(db.Text, nullable=True)
    expected_result = db.Column(db.Text, nullable=True)
    actual_result = db.Column(db.Text, nullable=True)

    browser = db.Column(db.String(100), nullable=True)
    os = db.Column(db.String(100), nullable=True)
    device = db.Column(db.String(100), nullable=True)
    app_version = db.Column(db.String(100), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self, attachments=None):
        return {
            "id": self.id,
            "reporter_id": self.reporter_id,
            "assigned_to": self.assigned_to,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "severity": self.severity,
            "priority": self.priority,
            "status": self.status,
            "page_url": self.page_url,
            "steps_to_reproduce": self.steps_to_reproduce,
            "expected_result": self.expected_result,
            "actual_result": self.actual_result,
            "browser": self.browser,
            "os": self.os,
            "device": self.device,
            "app_version": self.app_version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "attachments": attachments if attachments is not None else [],
        }


class BugReportAttachment(db.Model):
    __tablename__ = "bug_report_attachments"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    bug_report_id = db.Column(
        db.BigInteger,
        db.ForeignKey("bug_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    uploaded_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)

    file_size = db.Column(db.BigInteger, nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    file_ext = db.Column(db.String(20), nullable=True)

    width = db.Column(db.Integer, nullable=True)
    height = db.Column(db.Integer, nullable=True)

    checksum_sha256 = db.Column(db.String(64), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "bug_report_id": self.bug_report_id,
            "uploaded_by": self.uploaded_by,
            "original_filename": self.original_filename,
            "stored_filename": self.stored_filename,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "file_ext": self.file_ext,
            "width": self.width,
            "height": self.height,
            "checksum_sha256": self.checksum_sha256,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "download_url": f"/api/bug-reports/attachments/{self.id}/download",
        }
