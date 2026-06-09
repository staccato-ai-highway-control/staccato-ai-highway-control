import os
from datetime import datetime, UTC, timedelta
from uuid import uuid4

import jwt
import pytest

from app import create_app
from app.extensions import db, socketio
from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment, User
from app.modules.socketio.emitters import build_report_analysis_payload
from app.modules.report_upload.service import ReportUploadService
from db_cleanup import cleanup_database


@pytest.fixture
def app(tmp_path):
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    assert test_database_url, "TEST_DATABASE_URL is required for MySQL-isolated tests."
    assert "staccato_test" in test_database_url, "Refusing to run tests outside staccato_test database."

    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": test_database_url,
        "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "UPLOAD_BASE_PATH": str(tmp_path / "uploads"),
    })

    with app.app_context():
        assert "staccato_test" in str(db.engine.url), f"Unsafe test DB: {db.engine.url}"
        db.session.remove()
        db.create_all()
        cleanup_database(db)

    yield app

    with app.app_context():
        db.session.remove()
        cleanup_database(db)


def _create_user(role="CONTROL_ADMIN", account_status="ACTIVE"):
    suffix = uuid4().hex[:12]
    user = User(
        login_id=f"socket_user_{suffix}",
        email=f"socket_user_{suffix}@test.local",
        password_hash="hashed_pw",
        name="Socket Tester",
        role=role,
        account_status=account_status,
        is_email_verified=1,
        created_at=datetime.now(UTC),
    )
    db.session.add(user)
    db.session.commit()
    return user


def _token_for(app, user):
    now = datetime.now(UTC)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    return jwt.encode(payload, app.config["JWT_SECRET_KEY"], algorithm="HS256")


def _create_report(reporter_id):
    now = datetime.now(UTC)
    report = IncidentReport(
        report_code=f"REP-{uuid4().hex[:8]}",
        report_type="ACCIDENT",
        upload_purpose="ANALYSIS",
        report_source_type="WEB",
        title="Socket report",
        description="Socket report test",
        reporter_id=reporter_id,
        status="SUBMITTED",
        priority="NORMAL",
        is_demo_data=0,
        submitted_at=now,
        created_at=now,
    )
    db.session.add(report)
    db.session.commit()
    return report


def _create_attachment(report_id, uploaded_by):
    now = datetime.now(UTC)
    attachment = ReportAttachment(
        report_id=report_id,
        file_type="IMAGE",
        original_filename="socket-test.jpg",
        stored_filename=f"{uuid4().hex}.jpg",
        storage_type="LOCAL",
        file_path="/tmp/socket-test.jpg",
        file_url=None,
        thumbnail_url=None,
        file_hash=uuid4().hex,
        file_size=10,
        mime_type="image/jpeg",
        scan_status="CLEAN",
        is_private=0,
        download_count=0,
        access_count=0,
        uploaded_by=uploaded_by,
        uploaded_at=now,
        created_at=now,
    )
    db.session.add(attachment)
    db.session.commit()
    return attachment


def test_socket_connect_rejects_missing_token(app):
    client = socketio.test_client(app)

    assert client.is_connected() is False


def test_socket_connect_rejects_invalid_token(app):
    client = socketio.test_client(app, auth={"token": "invalid-token"})

    assert client.is_connected() is False


def test_socket_connect_rejects_inactive_user(app):
    with app.app_context():
        user = _create_user(account_status="PENDING")
        token = _token_for(app, user)

    client = socketio.test_client(app, auth={"token": token})

    assert client.is_connected() is False


def test_socket_connect_accepts_valid_active_user(app):
    with app.app_context():
        user = _create_user()
        token = _token_for(app, user)

    client = socketio.test_client(app, auth={"token": token})

    assert client.is_connected() is True
    events = client.get_received()
    assert any(event["name"] == "socket_connected" for event in events)


def test_join_report_rejects_invalid_report_id(app):
    with app.app_context():
        user = _create_user()
        token = _token_for(app, user)

    client = socketio.test_client(app, auth={"token": token})
    assert client.is_connected() is True

    client.emit("join_report", {"report_id": "abc"})
    events = client.get_received()

    assert any(
        event["name"] == "socket_error"
        and event["args"][0]["code"] == "INVALID_REPORT_ID"
        for event in events
    )


def test_join_report_rejects_missing_report(app):
    with app.app_context():
        user = _create_user()
        token = _token_for(app, user)

    client = socketio.test_client(app, auth={"token": token})
    assert client.is_connected() is True

    client.emit("join_report", {"report_id": 999999999})
    events = client.get_received()

    assert any(
        event["name"] == "socket_error"
        and event["args"][0]["code"] == "REPORT_NOT_FOUND"
        for event in events
    )


def test_join_report_rejects_forbidden_user(app):
    with app.app_context():
        owner = _create_user(role="VIEWER")
        other = _create_user(role="VIEWER")
        report = _create_report(reporter_id=owner.id)
        report_id = report.id
        token = _token_for(app, other)

    client = socketio.test_client(app, auth={"token": token})
    assert client.is_connected() is True

    client.emit("join_report", {"report_id": report_id})
    events = client.get_received()

    assert any(
        event["name"] == "socket_error"
        and event["args"][0]["code"] == "FORBIDDEN"
        for event in events
    )


def test_join_and_leave_report_success_for_reporter(app):
    with app.app_context():
        user = _create_user(role="VIEWER")
        report = _create_report(reporter_id=user.id)
        report_id = report.id
        token = _token_for(app, user)

    client = socketio.test_client(app, auth={"token": token})
    assert client.is_connected() is True

    client.emit("join_report", {"report_id": report_id})
    join_events = client.get_received()

    assert any(
        event["name"] == "report_joined"
        and event["args"][0]["report_id"] == report_id
        for event in join_events
    )

    client.emit("leave_report", {"report_id": report_id})
    leave_events = client.get_received()

    assert any(
        event["name"] == "report_left"
        and event["args"][0]["report_id"] == report_id
        for event in leave_events
    )


def test_build_report_analysis_payload_contract(app):
    with app.app_context():
        user = _create_user()
        report = _create_report(reporter_id=user.id)
        attachment = _create_attachment(report_id=report.id, uploaded_by=user.id)

        now = datetime.now(UTC)
        job = ReportAnalysisJob(
            report_id=report.id,
            attachment_id=attachment.id,
            job_status="QUEUED",
            analysis_type="INCIDENT_DETECTION",
            ai_engine_type="YOLOV8",
            confidence_threshold=0.450,
            lane_stop_threshold=10,
            shoulder_stop_threshold=15,
            movement_threshold_px=5,
            retry_count=0,
            requested_by=user.id,
            requested_at=now,
            created_at=now,
        )
        db.session.add(job)
        db.session.commit()

        payload = build_report_analysis_payload(job)
        report_id = report.id
        job_id = job.id

    assert payload["type"] == "REPORT_ANALYSIS_UPDATED"
    assert payload["report_id"] == report_id
    assert payload["job_id"] == job_id
    assert payload["job_status"] == "QUEUED"
    assert payload["analysis_type"] == "INCIDENT_DETECTION"
    assert payload["severity"] == "info"
    assert payload["message"] == "분석 작업이 대기열에 등록되었습니다."
    assert payload["updated_at"].endswith("Z")


def test_request_report_analysis_emits_update_to_joined_report_room(app, monkeypatch):
    def fake_request_analysis(report_id, file_path):
        return True, {"status": "queued"}

    monkeypatch.setattr(
        "app.modules.ai_gateway.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )

    with app.app_context():
        user = _create_user(role="VIEWER")
        user_id = user.id
        report = _create_report(reporter_id=user_id)
        report_id = report.id
        _create_attachment(report_id=report_id, uploaded_by=user_id)
        token = _token_for(app, user)

    client = socketio.test_client(app, auth={"token": token})
    assert client.is_connected() is True

    client.get_received()

    client.emit("join_report", {"report_id": report_id})
    client.get_received()

    with app.app_context():
        result, status_code = ReportUploadService.request_report_analysis(
            report_id=report_id,
            user_id=user_id,
        )

    assert status_code == 201
    assert result["success"] is True

    events = client.get_received()

    assert any(
        event["name"] == "report_analysis_updated"
        and event["args"][0]["report_id"] == report_id
        and event["args"][0]["job_status"] == "QUEUED"
        and event["args"][0]["type"] == "REPORT_ANALYSIS_UPDATED"
        for event in events
    )


def test_request_report_analysis_survives_socket_emit_failure(app, monkeypatch):
    def fake_request_analysis(report_id, file_path):
        return True, {"status": "queued"}

    def broken_emit(*args, **kwargs):
        raise RuntimeError("socket emit failed")

    monkeypatch.setattr(
        "app.modules.ai_gateway.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )
    monkeypatch.setattr(
        "app.modules.socketio.emitters.socketio.emit",
        broken_emit,
    )

    with app.app_context():
        user = _create_user(role="VIEWER")
        user_id = user.id
        report = _create_report(reporter_id=user_id)
        report_id = report.id
        _create_attachment(report_id=report_id, uploaded_by=user_id)

        result, status_code = ReportUploadService.request_report_analysis(
            report_id=report_id,
            user_id=user_id,
        )

    assert status_code == 201
    assert result["success"] is True
    assert result["report_id"] == report_id

