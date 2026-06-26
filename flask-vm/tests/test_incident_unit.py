import os
from datetime import datetime
from uuid import uuid4

import pytest

from app import create_app
from app.extensions import db
from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment, User
from db_cleanup import cleanup_database
from app.modules.incident.service import IncidentService


@pytest.fixture
def app(tmp_path):
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    assert test_database_url, "TEST_DATABASE_URL is required for MySQL-isolated tests."
    assert "staccato_test" in test_database_url, "Refusing to run tests outside staccato_test database."

    upload_path = tmp_path / "uploads"

    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": test_database_url,
        "UPLOAD_BASE_PATH": str(upload_path),
        "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
    })

    with app.app_context():
        db.create_all()
        cleanup_database(db)

    yield app

    with app.app_context():
        cleanup_database(db)


@pytest.fixture
def test_user(app):
    with app.app_context():
        suffix = uuid4().hex[:8]
        user = User(
            login_id=f"incident_user_{suffix}",
            email=f"incident_user_{suffix}@test.local",
            password_hash="hashed_pw",
            name="Incident Tester",
            role="USER",
            account_status="ACTIVE",
            created_at=datetime.utcnow(),
        )
        db.session.add(user)
        db.session.commit()
        user_id = user.id

    return user_id


def test_incident_creation_creates_report_attachment_and_job(app, test_user, tmp_path, monkeypatch):
    calls = []

    def fake_request_analysis(report_id, file_path):
        calls.append({
            "report_id": report_id,
            "file_path": file_path,
        })
        return True, {"job_status": "QUEUED"}

    monkeypatch.setattr(
        "app.modules.incident.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )

    uploaded_file = tmp_path / "incident.jpg"
    uploaded_file.write_bytes(b"fake image content")

    file_info = {
        "file_path": str(uploaded_file),
        "original_filename": "incident.jpg",
        "stored_filename": "incident_stored.jpg",
        "file_type": "IMAGE",
        "storage_type": "LOCAL",
        "file_size": uploaded_file.stat().st_size,
        "file_hash": "fakehash",
        "mime_type": "image/jpeg",
        "scan_status": "PENDING",
        "is_private": 1,
    }

    form_data = {
        "report_type": "ACCIDENT",
        "title": "테스트 사고 신고",
        "description": "이상상황 테스트 신고입니다.",
    }

    with app.app_context():
        result = IncidentService.create_incident(
            form_data,
            file_info,
            user_id=test_user,
        )

        assert result["status"] == "success"
        assert result["report_id"]

        report = IncidentReport.query.get(result["report_id"])
        assert report is not None
        assert report.report_type == "ACCIDENT"
        assert report.report_source_type == "MOBILE_UPLOAD"
        assert report.reporter_id == test_user
        assert report.status == "PENDING"

        attachment = ReportAttachment.query.filter_by(report_id=report.id).one()
        assert attachment.original_filename == "incident.jpg"
        assert attachment.stored_filename == "incident_stored.jpg"
        assert attachment.uploaded_by == test_user

        job = ReportAnalysisJob.query.filter_by(report_id=report.id).one()
        assert job.attachment_id == attachment.id
        assert job.job_status == "QUEUED"
        assert job.analysis_type == "INCIDENT_DETECTION"
        assert job.requested_by == test_user

        assert calls == [{
            "report_id": report.id,
            "file_path": str(uploaded_file),
        }]


def test_incident_creation_rolls_back_and_removes_uploaded_file_on_failure(app, test_user, tmp_path, monkeypatch):
    def fake_request_analysis(report_id, file_path):
        return True, {"job_status": "QUEUED"}

    monkeypatch.setattr(
        "app.modules.incident.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )

    uploaded_file = tmp_path / "bad_incident.jpg"
    uploaded_file.write_bytes(b"fake image content")

    file_info = {
        "file_path": str(uploaded_file),
        "original_filename": "bad_incident.jpg",
        "stored_filename": "bad_incident_stored.jpg",
        "file_type": "IMAGE",
        "storage_type": "LOCAL",
        "file_size": uploaded_file.stat().st_size,
        "file_hash": "fakehash",
        "mime_type": "image/jpeg",
        "scan_status": "PENDING",
        "is_private": 1,
    }

    form_data = {
        "report_type": "ACCIDENT",
        "title": None,
        "description": "title fallback을 검증합니다.",
    }

    original_add = db.session.add

    def failing_add(instance):
        if isinstance(instance, ReportAnalysisJob):
            raise RuntimeError("forced job insert failure")
        return original_add(instance)

    monkeypatch.setattr(db.session, "add", failing_add)

    with app.app_context():
        with pytest.raises(RuntimeError, match="forced job insert failure"):
            IncidentService.create_incident(
                form_data,
                file_info,
                user_id=test_user,
            )

        assert IncidentReport.query.count() == 0
        assert ReportAttachment.query.count() == 0
        assert ReportAnalysisJob.query.count() == 0
        assert not uploaded_file.exists()
