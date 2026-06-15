"""bug report models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `BugReport` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class BugReport(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'bug_reports'로 설정한다.
    __tablename__ = "bug_reports"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    # 설명: `reporter_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    reporter_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `assigned_to`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    assigned_to = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)

    # 설명: `title`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    title = db.Column(db.String(200), nullable=False)
    # 설명: `description`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    description = db.Column(db.Text, nullable=False)

    # 설명: `category`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    category = db.Column(db.String(50), nullable=False, default="GENERAL")
    # 설명: `severity`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    severity = db.Column(db.String(30), nullable=False, default="MINOR")
    # 설명: `priority`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    priority = db.Column(db.String(30), nullable=False, default="MEDIUM")
    # 설명: `status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = db.Column(db.String(30), nullable=False, default="OPEN")

    # 설명: `page_url`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    page_url = db.Column(db.String(500), nullable=True)
    # 설명: `steps_to_reproduce`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    steps_to_reproduce = db.Column(db.Text, nullable=True)
    # 설명: `expected_result`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    expected_result = db.Column(db.Text, nullable=True)
    # 설명: `actual_result`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    actual_result = db.Column(db.Text, nullable=True)

    # 설명: `browser`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    browser = db.Column(db.String(100), nullable=True)
    # 설명: `os`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    os = db.Column(db.String(100), nullable=True)
    # 설명: `device`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    device = db.Column(db.String(100), nullable=True)
    # 설명: `app_version`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    app_version = db.Column(db.String(100), nullable=True)

    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self, attachments=None):
        # 설명: 호출자에게 {'id': self.id, 'reporter_id': self.reporter_id, 'assigned_to': self.assigned_t... 값을 함수 결과로 반환한다.
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


# 설명: `BugReportAttachment` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class BugReportAttachment(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'bug_report_attachments'로 설정한다.
    __tablename__ = "bug_report_attachments"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    # 설명: `bug_report_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    bug_report_id = db.Column(
        db.BigInteger,
        db.ForeignKey("bug_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    # 설명: `uploaded_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    uploaded_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # 설명: `original_filename`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    original_filename = db.Column(db.String(255), nullable=False)
    # 설명: `stored_filename`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    stored_filename = db.Column(db.String(255), nullable=False)
    # 설명: `file_path`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_path = db.Column(db.String(500), nullable=False)

    # 설명: `file_size`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_size = db.Column(db.BigInteger, nullable=False)
    # 설명: `mime_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    mime_type = db.Column(db.String(100), nullable=False)
    # 설명: `file_ext`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_ext = db.Column(db.String(20), nullable=True)

    # 설명: `width`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    width = db.Column(db.Integer, nullable=True)
    # 설명: `height`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    height = db.Column(db.Integer, nullable=True)

    # 설명: `checksum_sha256`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    checksum_sha256 = db.Column(db.String(64), nullable=True)

    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
        # 설명: 호출자에게 {'id': self.id, 'bug_report_id': self.bug_report_id, 'uploaded_by': self.upload... 값을 함수 결과로 반환한다.
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
