from db_cleanup import cleanup_database
import os
import jwt
import pytest
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app import create_app
from app.extensions import db
from app.models import User, IncidentReport, ReportAttachment, ReportAnalysisJob


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
        cleanup_database(db)
        db.create_all()
        yield app
        db.session.remove()
        cleanup_database(db)


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_user_and_header(app):
    with app.app_context():
        suffix = uuid4().hex[:12]
        user = User(
            login_id=f"analysis_compare_admin_{suffix}",
            name="비교분석관리자",
            password_hash="hashed_pw",
            email=f"analysis_compare_admin_{suffix}@test.local",
            role="SUPER_ADMIN",
            account_status="ACTIVE",
            created_at=datetime.now(UTC),
        )
        db.session.add(user)
        db.session.commit()

        now = datetime.now(UTC)
        payload = {
            "sub": str(user.id),
            "user_id": user.id,
            "id": user.id,
            "login_id": user.login_id,
            "role": user.role,
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")
        return user, {"Authorization": f"Bearer {token}"}


def _create_completed_analysis_job(user, title, count, confidence):
    now = datetime.now(UTC)

    report = IncidentReport(
        report_code=f"REP-CMP-{uuid4().hex[:8].upper()}",
        report_type="STALLED_VEHICLE",
        upload_purpose="ANALYSIS",
        report_source_type="WEB",
        title=title,
        description="비교분석 테스트 신고",
        reporter_id=user.id,
        status="SUBMITTED",
        priority="NORMAL",
        risk_level="MEDIUM",
        risk_score=count * 10,
        is_demo_data=0,
        submitted_at=now,
        created_at=now,
        updated_at=now,
    )
    db.session.add(report)
    db.session.flush()

    attachment = ReportAttachment(
        report_id=report.id,
        file_type="IMAGE",
        original_filename=f"{title}.jpg",
        stored_filename=f"{uuid4().hex}.jpg",
        storage_type="LOCAL",
        file_path=f"/tmp/{uuid4().hex}.jpg",
        file_hash=uuid4().hex,
        file_size=1024,
        mime_type="image/jpeg",
        scan_status="PENDING",
        is_private=1,
        download_count=0,
        access_count=0,
        uploaded_by=user.id,
        uploaded_at=now,
        created_at=now,
    )
    db.session.add(attachment)
    db.session.flush()

    detections = [
        {
            "label": "vehicle",
            "confidence": confidence,
        }
        for _ in range(count)
    ]

    job = ReportAnalysisJob(
        report_id=report.id,
        attachment_id=attachment.id,
        job_status="COMPLETED",
        analysis_type="INCIDENT_DETECTION",
        ai_engine_type="YOLOV11",
        primary_model_name="YOLO11",
        primary_model_version="current.pt",
        confidence_threshold=0.450,
        lane_stop_threshold=10,
        shoulder_stop_threshold=15,
        movement_threshold_px=5,
        total_frames=1,
        processed_frames=1,
        progress_percent=100,
        retry_count=0,
        result_summary={
            "status": "OK",
            "count": count,
            "detections": detections,
        },
        requested_by=user.id,
        requested_at=now,
        started_at=now,
        completed_at=now,
        created_at=now,
        updated_at=now,
    )
    db.session.add(job)
    db.session.commit()

    return report, attachment, job


def test_list_analysis_comparison_candidates_returns_completed_jobs(client, auth_user_and_header):
    user, headers = auth_user_and_header

    _create_completed_analysis_job(user, "비교 후보 A", count=1, confidence=0.91)
    _create_completed_analysis_job(user, "비교 후보 B", count=3, confidence=0.82)

    response = client.get(
        "/api/reports/analysis-comparisons/candidates?page=1&size=10",
        headers=headers,
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["total_count"] >= 2
    assert len(body["items"]) >= 2
    assert all(item["job_status"] == "COMPLETED" for item in body["items"])


def test_compare_analysis_jobs_returns_metrics(client, auth_user_and_header):
    user, headers = auth_user_and_header

    _, _, first_job = _create_completed_analysis_job(user, "비교 대상 A", count=1, confidence=0.95)
    _, _, second_job = _create_completed_analysis_job(user, "비교 대상 B", count=4, confidence=0.75)

    response = client.post(
        "/api/reports/analysis-comparisons",
        json={"job_ids": [first_job.id, second_job.id]},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["count"] == 2
    assert body["job_ids"] == [first_job.id, second_job.id]
    assert body["comparison"]["metrics"]["detection_count"]["min"] == 1.0
    assert body["comparison"]["metrics"]["detection_count"]["max"] == 4.0
    assert body["comparison"]["metrics"]["detection_count"]["delta"] == 3.0


def test_compare_analysis_jobs_requires_at_least_two_jobs(client, auth_user_and_header):
    _, headers = auth_user_and_header

    response = client.post(
        "/api/reports/analysis-comparisons",
        json={"job_ids": [1]},
        headers=headers,
    )

    assert response.status_code == 400
    body = response.get_json()
    assert body["success"] is False
