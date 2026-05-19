import os
from datetime import datetime
from io import BytesIO
from uuid import uuid4

import pytest
from werkzeug.datastructures import FileStorage

from app import create_app
from app.extensions import db
from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment, ReportLocation, User
from app.modules.report_upload.service import ReportUploadService
from db_cleanup import cleanup_database


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
            login_id=f"report_user_{suffix}",
            email=f"report_user_{suffix}@test.local",
            password_hash="hashed_pw",
            name="Report Tester",
            role="CONTROL_ADMIN",
            account_status="ACTIVE",
            is_email_verified=1,
            created_at=datetime.utcnow(),
        )
        db.session.add(user)
        db.session.commit()
        return user.id


def make_file(filename="귀여운 강아지.jpg", content=b"fake image content"):
    return FileStorage(
        stream=BytesIO(content),
        filename=filename,
        content_type="image/jpeg",
    )


def test_create_report_preserves_original_filename_and_location_text(app, test_user):
    with app.app_context():
        report = ReportUploadService.create_report(
            user_id=test_user,
            data={
                "report_type": "ACCIDENT",
                "upload_purpose": "REPORT",
                "title": "파일명 보존 테스트",
                "description": "한글 파일명과 위치 텍스트 저장을 검증합니다.",
                "priority": "NORMAL",
                "latitude": "37.2636",
                "longitude": "127.0286",
                "location": "경부고속도로 수원IC 123.4K",
            },
            files=[make_file()],
        )

        attachment = ReportAttachment.query.filter_by(report_id=report.id).one()
        location = ReportLocation.query.filter_by(report_id=report.id).one()

        assert attachment.original_filename == "귀여운 강아지.jpg"
        assert attachment.stored_filename.endswith(".jpg")
        assert attachment.stored_filename != attachment.original_filename

        if hasattr(location, "place_name"):
            assert location.place_name == "경부고속도로 수원IC 123.4K"
        if hasattr(location, "address_raw"):
            assert location.address_raw == "경부고속도로 수원IC 123.4K"


def test_request_report_analysis_creates_job_and_is_idempotent(app, test_user, monkeypatch):
    calls = []

    def fake_request_analysis(report_id, file_path):
        calls.append((report_id, file_path))
        return True, {"status": "queued"}

    monkeypatch.setattr(
        "app.modules.ai_gateway.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )

    with app.app_context():
        report = ReportUploadService.create_report(
            user_id=test_user,
            data={
                "report_type": "ACCIDENT",
                "upload_purpose": "ANALYSIS",
                "title": "분석 작업 생성 테스트",
                "latitude": "37.2636",
                "longitude": "127.0286",
            },
            files=[make_file(filename="incident-test.jpg")],
        )

        result, status_code = ReportUploadService.request_report_analysis(
            report_id=report.id,
            user_id=test_user,
        )

        assert status_code == 201
        assert result["success"] is True
        assert result["report_id"] == report.id
        assert result["job_id"] is not None

        job = ReportAnalysisJob.query.filter_by(report_id=report.id).one()
        attachment = ReportAttachment.query.filter_by(report_id=report.id).one()

        assert job.attachment_id == attachment.id
        assert job.job_status == "QUEUED"
        assert job.analysis_type == "INCIDENT_DETECTION"
        assert job.requested_by == test_user
        assert calls == [(report.id, attachment.file_path)]

        second_result, second_status_code = ReportUploadService.request_report_analysis(
            report_id=report.id,
            user_id=test_user,
        )

        assert second_status_code == 200
        assert second_result["job_id"] == job.id
        assert ReportAnalysisJob.query.filter_by(report_id=report.id).count() == 1
        assert calls == [(report.id, attachment.file_path)]
