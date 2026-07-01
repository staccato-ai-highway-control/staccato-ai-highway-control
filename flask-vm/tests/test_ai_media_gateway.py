"""AI media gateway route security and streaming tests."""

import os
from datetime import datetime, timedelta

import jwt
import pytest
import requests

from app import create_app
from app.extensions import db
from app.models import AiEvent, Cctv, IncidentReport, ReportAnalysisJob, ReportAttachment, User
from db_cleanup import cleanup_database


@pytest.fixture
def app():
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    assert test_database_url, "TEST_DATABASE_URL is required for MySQL-isolated tests."
    assert "staccato_test" in test_database_url, "Refusing to run tests outside staccato_test database."

    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": test_database_url,
        "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "INTERNAL_API_TOKEN": "test-internal-token",
        "AI_VM_INTERNAL_BASE_URLS": "http://127.0.0.1:5001,http://localhost:5001,http://192.168.0.186:5001",
    })

    with app.app_context():
        db.create_all()
        cleanup_database(db)

    yield app

    with app.app_context():
        cleanup_database(db)


@pytest.fixture
def client(app):
    return app.test_client()


def _create_user(role="CONTROL_ADMIN"):
    suffix = str(datetime.utcnow().timestamp()).replace(".", "_")
    user = User(
        login_id=f"media_{role.lower()}_{suffix}",
        email=f"media_{role.lower()}_{suffix}@test.local",
        password_hash="hashed_pw",
        name="AI Media Test User",
        role=role,
        account_status="ACTIVE",
        created_at=datetime.utcnow(),
    )
    db.session.add(user)
    db.session.flush()
    return user


def _auth_header(app, user):
    token = jwt.encode(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=1),
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def users_and_headers(app):
    with app.app_context():
        admin = _create_user("CONTROL_ADMIN")
        owner = _create_user("VIEWER")
        other = _create_user("VIEWER")
        db.session.commit()
        return {
            "admin": admin.id,
            "owner": owner.id,
            "other": other.id,
            "admin_header": _auth_header(app, admin),
            "owner_header": _auth_header(app, owner),
            "other_header": _auth_header(app, other),
        }


def _create_event(event_id="evt_media", snapshot_url="http://127.0.0.1:5001/events/evt_media.jpg", video_url="http://127.0.0.1:5001/events/evt_media.mp4"):
    event = AiEvent(
        event_id=event_id,
        camera_id="camera-1",
        event_type="STOPPED_VEHICLE",
        severity="WARNING",
        status="NEW",
        event_timestamp=datetime.utcnow(),
        snapshot_url=f"/api/ai-media/events/{event_id}/snapshot",
        video_url=f"/api/ai-media/events/{event_id}/video",
        stream_url=f"/api/ai-media/events/{event_id}/stream",
        message="media test",
        raw_event_json={
            "event_id": event_id,
            "camera_id": "camera-1",
            "event_type": "STOPPED_VEHICLE",
            "timestamp": datetime.utcnow().isoformat(),
            "snapshot_url": snapshot_url,
            "video_url": video_url,
            "stream_url": "http://127.0.0.1:5001/streams/camera-1.mjpeg",
        },
        received_at=datetime.utcnow(),
    )
    db.session.add(event)
    db.session.flush()
    return event


def _create_report_job(owner_id, video_url="http://127.0.0.1:5001/analysis/job-1.mp4"):
    report = IncidentReport(
        report_code="RPT-MEDIA-1",
        report_type="INCIDENT",
        upload_purpose="REPORT",
        report_source_type="USER",
        title="Media report",
        description="media",
        reporter_id=owner_id,
        status="SUBMITTED",
        priority="NORMAL",
        is_demo_data=0,
        submitted_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.session.add(report)
    db.session.flush()

    attachment = ReportAttachment(
        report_id=report.id,
        file_type="VIDEO",
        original_filename="media.mp4",
        stored_filename="media.mp4",
        storage_type="LOCAL",
        file_path="/tmp/media.mp4",
        file_hash="hash",
        file_size=5,
        mime_type="video/mp4",
        scan_status="CLEAN",
        is_private=1,
        download_count=0,
        access_count=0,
        uploaded_by=owner_id,
        uploaded_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.session.add(attachment)
    db.session.flush()

    job = ReportAnalysisJob(
        report_id=report.id,
        attachment_id=attachment.id,
        job_status="COMPLETED",
        analysis_type="INCIDENT_DETECTION",
        ai_engine_type="AI_VM",
        confidence_threshold=0.5,
        lane_stop_threshold=30,
        shoulder_stop_threshold=30,
        movement_threshold_px=10,
        retry_count=0,
        result_summary={"video_url": video_url, "snapshot_url": "http://127.0.0.1:5001/analysis/job-1.jpg"},
        requested_by=owner_id,
        requested_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.session.add(job)
    db.session.flush()
    return report, job


class FakeUpstreamResponse:
    def __init__(self, chunks, status_code=200, headers=None, json_payload=None):
        self._chunks = chunks
        self.status_code = status_code
        self.headers = headers or {"Content-Type": "image/jpeg"}
        self._json_payload = json_payload
        self.closed = False

    @property
    def ok(self):
        return 200 <= self.status_code < 400

    def iter_content(self, chunk_size=1):
        yield from self._chunks

    def json(self):
        if self._json_payload is None:
            raise ValueError("No JSON payload")
        return self._json_payload

    def close(self):
        self.closed = True


def test_event_media_auth_role_and_bearer_header(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        _create_event()
        db.session.commit()

    assert client.get("/api/ai-media/events/evt_media/snapshot").status_code == 401
    assert client.get("/api/ai-media/events/evt_media/snapshot", headers=users_and_headers["owner_header"]).status_code == 403

    captured = {}

    def fake_get(url, headers, stream, timeout):
        captured.update({"url": url, "headers": headers, "stream": stream, "timeout": timeout})
        return FakeUpstreamResponse([b"jpeg-bytes"], headers={"Content-Type": "image/jpeg", "Content-Length": "10"})

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", fake_get)
    response = client.get("/api/ai-media/events/evt_media/snapshot", headers=users_and_headers["admin_header"])

    assert response.status_code == 200
    assert response.data == b"jpeg-bytes"
    assert captured["url"].endswith("/events/evt_media.jpg")
    assert captured["headers"]["Authorization"] == "Bearer test-internal-token"
    assert "Authorization" not in users_and_headers["admin_header"] or captured["headers"]["Authorization"] != users_and_headers["admin_header"]["Authorization"]
    assert captured["stream"] is True


def test_missing_internal_token_fails_safely(client, app, users_and_headers):
    app.config["INTERNAL_API_TOKEN"] = ""
    with app.app_context():
        _create_event(event_id="evt_no_token")
        db.session.commit()

    response = client.get("/api/ai-media/events/evt_no_token/snapshot", headers=users_and_headers["admin_header"])
    assert response.status_code == 503
    assert "test-internal-token" not in response.get_data(as_text=True)


def test_event_media_ignores_untrusted_legacy_snapshot_url_and_uses_canonical_target(
    client,
    app,
    users_and_headers,
    monkeypatch,
):
    with app.app_context():
        _create_event(
            event_id="evt_traversal",
            snapshot_url="http://127.0.0.1:5001/events/%2e%2e/secret.jpg",
        )
        db.session.commit()

    captured = {}

    def fake_get(url, headers, stream, timeout):
        captured.update(
            {
                "url": url,
                "headers": headers,
                "stream": stream,
                "timeout": timeout,
            }
        )
        return FakeUpstreamResponse(
            [b"jpeg-bytes"],
            headers={"Content-Type": "image/jpeg"},
        )

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", fake_get)

    response = client.get(
        "/api/ai-media/events/evt_traversal/snapshot",
        headers=users_and_headers["admin_header"],
    )

    assert response.status_code == 200
    assert response.data == b"jpeg-bytes"
    assert captured["url"].endswith("/events/evt_traversal.jpg")
    assert "%2e%2e" not in captured["url"].lower()
    assert captured["headers"]["Authorization"] == "Bearer test-internal-token"
    assert captured["stream"] is True


def test_mjpeg_chunk_streaming_and_close(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        cctv = Cctv(
            cctv_code="CCTV-MJPEG",
            cctv_name="MJPEG Camera",
            stream_url="http://127.0.0.1:5001/streams/CCTV-MJPEG.mjpeg",
            is_active=1,
            created_at=datetime.utcnow(),
        )
        db.session.add(cctv)
        db.session.commit()

    upstream = FakeUpstreamResponse(
        [b"--frame\r\n", b"Content-Type: image/jpeg\r\n\r\n", b"frame-bytes"],
        headers={"Content-Type": "multipart/x-mixed-replace; boundary=frame"},
    )

    def fake_get(url, headers, stream, timeout):
        return upstream

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", fake_get)
    response = client.get("/api/ai-media/cctvs/CCTV-MJPEG/stream.mjpeg", headers=users_and_headers["admin_header"])

    assert response.status_code == 200
    assert response.data == b"--frame\r\nContent-Type: image/jpeg\r\n\r\nframe-bytes"
    assert response.headers["Content-Type"] == "multipart/x-mixed-replace; boundary=frame"
    assert upstream.closed is True


def test_mjpeg_lowercase_content_type_preserves_boundary(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        cctv = Cctv(
            cctv_code="CCTV-MJPEG-LOWER",
            cctv_name="MJPEG Lowercase Camera",
            stream_url="https://external-cctv.example.local/source/lower.mjpeg",
            is_active=1,
            created_at=datetime.utcnow(),
        )
        db.session.add(cctv)
        db.session.commit()
        camera_id = f"camera-{cctv.id}"

    def fake_get(url, headers, stream, timeout):
        assert url.endswith(f"/streams/{camera_id}.mjpeg")
        return FakeUpstreamResponse(
            [b"frame"],
            headers={"content-type": "multipart/x-mixed-replace; boundary=frame"},
        )

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", fake_get)
    response = client.get(
        "/api/ai-media/cctvs/CCTV-MJPEG-LOWER/stream.mjpeg",
        headers=users_and_headers["admin_header"],
    )

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "multipart/x-mixed-replace; boundary=frame"


def test_cctv_stream_accepts_cctv_code_and_camera_worker_id(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        _create_media_cctv(
            "CCTV-001",
            cctv_id=1,
            stream_url="https://external-cctv.example.local/source/camera-1.mjpeg",
        )
        db.session.commit()

    captured = []

    def fake_get(url, headers, stream, timeout):
        captured.append({"url": url, "headers": headers, "stream": stream})
        return FakeUpstreamResponse(
            [b"frame"],
            headers={"Content-Type": "multipart/x-mixed-replace; boundary=frame"},
        )

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", fake_get)

    by_code = client.get("/api/ai-media/cctvs/CCTV-001/stream.mjpeg", headers=users_and_headers["admin_header"])
    by_worker = client.get("/api/ai-media/cctvs/camera-1/stream.mjpeg", headers=users_and_headers["admin_header"])

    assert by_code.status_code == 200
    assert by_worker.status_code == 200
    assert [call["url"] for call in captured] == [
        "http://127.0.0.1:5001/streams/camera-1.mjpeg",
        "http://127.0.0.1:5001/streams/camera-1.mjpeg",
    ]
    assert all("external-cctv.example.local" not in call["url"] for call in captured)
    assert all(call["headers"]["Authorization"] == "Bearer test-internal-token" for call in captured)
    assert all(call["headers"]["Authorization"] != users_and_headers["admin_header"]["Authorization"] for call in captured)
    assert all(call["stream"] is True for call in captured)


def test_mp4_range_is_forwarded_and_206_headers_preserved(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        _create_event(event_id="evt_range")
        db.session.commit()

    captured = {}

    def fake_get(url, headers, stream, timeout):
        captured.update({"url": url, "headers": headers})
        return FakeUpstreamResponse(
            [b"partial-video"],
            status_code=206,
            headers={
                "Content-Type": "video/mp4",
                "Content-Range": "bytes 0-11/100",
                "Accept-Ranges": "bytes",
                "Content-Length": "12",
            },
        )

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", fake_get)
    response = client.get(
        "/api/ai-media/events/evt_range/video",
        headers={**users_and_headers["admin_header"], "Range": "bytes=0-11"},
    )

    assert response.status_code == 206
    assert captured["url"].endswith("/events/evt_range.mp4")
    assert captured["headers"]["Range"] == "bytes=0-11"
    assert response.headers["Content-Range"] == "bytes 0-11/100"
    assert response.headers["Accept-Ranges"] == "bytes"
    assert response.headers["Content-Length"] == "12"
    assert response.headers["Content-Type"].startswith("video/mp4")


def test_report_media_owner_and_other_user_access(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        _, job = _create_report_job(users_and_headers["owner"])
        job_id = job.id
        db.session.commit()

    def fake_get(url, headers, stream, timeout):
        return FakeUpstreamResponse([b"video"], headers={"Content-Type": "video/mp4"})

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", fake_get)

    owner_response = client.get(
        f"/api/ai-media/report-analysis/jobs/{job_id}/video",
        headers=users_and_headers["owner_header"],
    )
    assert owner_response.status_code == 200

    other_response = client.get(
        f"/api/ai-media/report-analysis/jobs/{job_id}/video",
        headers=users_and_headers["other_header"],
    )
    assert other_response.status_code == 403



def _create_media_cctv(code="CCTV-SNAPSHOT", *, cctv_id=None, stream_url=None):
    cctv = Cctv(
        id=cctv_id,
        cctv_code=code,
        cctv_name=f"{code} Camera",
        stream_url=stream_url or f"http://127.0.0.1:5001/streams/{code}.mjpeg",
        is_active=1,
        created_at=datetime.utcnow(),
    )
    db.session.add(cctv)
    db.session.flush()
    return cctv


def test_cctv_snapshot_auth_role_success_and_bearer_header(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        cctv = _create_media_cctv("CCTV-SNAPSHOT")
        ai_camera_id = f"camera-{cctv.id}"
        db.session.commit()

    assert client.get("/api/ai-media/cctvs/CCTV-SNAPSHOT/snapshot/latest.jpg").status_code == 401
    assert client.get(
        "/api/ai-media/cctvs/CCTV-SNAPSHOT/snapshot/latest.jpg",
        headers=users_and_headers["owner_header"],
    ).status_code == 403

    captured = {}

    def fake_get(url, headers, stream, timeout):
        captured.update({"url": url, "headers": headers, "stream": stream, "timeout": timeout})
        return FakeUpstreamResponse([b"snapshot-bytes"], headers={"Content-Type": "image/jpeg"})

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", fake_get)
    response = client.get(
        "/api/ai-media/cctvs/CCTV-SNAPSHOT/snapshot/latest.jpg",
        headers=users_and_headers["admin_header"],
    )

    assert response.status_code == 200
    assert response.data == b"snapshot-bytes"
    assert response.headers["Content-Type"].startswith("image/jpeg")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert captured["url"].endswith(f"/internal/cameras/{ai_camera_id}/snapshot/latest.jpg")
    assert captured["headers"]["Authorization"] == "Bearer test-internal-token"
    assert captured["headers"]["Authorization"] != users_and_headers["admin_header"]["Authorization"]
    assert captured["stream"] is True


def test_cctv_detections_auth_role_success_and_sanitizes_json(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        cctv = _create_media_cctv("CCTV-DETECT")
        ai_camera_id = f"camera-{cctv.id}"
        db.session.commit()

    assert client.get("/api/ai-media/cctvs/CCTV-DETECT/detections").status_code == 401
    assert client.get(
        "/api/ai-media/cctvs/CCTV-DETECT/detections",
        headers=users_and_headers["owner_header"],
    ).status_code == 403

    captured = {}

    def fake_get(url, headers, timeout):
        captured.update({"url": url, "headers": headers, "timeout": timeout})
        return FakeUpstreamResponse(
            [],
            headers={"Content-Type": "application/json"},
            json_payload={
                "detections": [{"bbox": [1, 2, 3, 4], "label": "car", "path": "/home/ai/private.jpg"}],
                "snapshot_url": "http://192.168.0.186:5001/ai-media/private.jpg",
                "safe_count": 1,
            },
        )

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", fake_get)
    response = client.get(
        "/api/ai-media/cctvs/CCTV-DETECT/detections",
        headers=users_and_headers["admin_header"],
    )

    assert response.status_code == 200
    assert response.headers["Content-Type"].startswith("application/json")
    body = response.get_json()
    assert body["safe_count"] == 1
    assert "snapshot_url" not in body
    assert "path" not in body["detections"][0]
    assert captured["url"].endswith(f"/internal/cameras/{ai_camera_id}/detections")
    assert captured["headers"]["Authorization"] == "Bearer test-internal-token"
    assert captured["headers"]["Authorization"] != users_and_headers["admin_header"]["Authorization"]


def test_cctv_media_missing_token_and_camera_id_traversal_are_blocked(client, app, users_and_headers):
    with app.app_context():
        _create_media_cctv("CCTV-NO-TOKEN")
        db.session.commit()

    app.config["INTERNAL_API_TOKEN"] = ""
    missing_token = client.get(
        "/api/ai-media/cctvs/CCTV-NO-TOKEN/snapshot/latest.jpg",
        headers=users_and_headers["admin_header"],
    )
    assert missing_token.status_code == 503
    assert "test-internal-token" not in missing_token.get_data(as_text=True)

    app.config["INTERNAL_API_TOKEN"] = "test-internal-token"
    traversal = client.get(
        "/api/ai-media/cctvs/%2e%2e/snapshot/latest.jpg",
        headers=users_and_headers["admin_header"],
    )
    assert traversal.status_code == 400


def test_cctv_snapshot_upstream_error_timeout_and_connection_failure(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        _create_media_cctv("CCTV-UPSTREAM")
        db.session.commit()

    def upstream_404(url, headers, stream, timeout):
        return FakeUpstreamResponse([b"not found"], status_code=404, headers={"Content-Type": "text/plain"})

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", upstream_404)
    not_found = client.get(
        "/api/ai-media/cctvs/CCTV-UPSTREAM/snapshot/latest.jpg",
        headers=users_and_headers["admin_header"],
    )
    assert not_found.status_code == 404
    assert not_found.get_json()["success"] is False

    def timeout(url, headers, stream, timeout):
        raise requests.Timeout()

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", timeout)
    timed_out = client.get(
        "/api/ai-media/cctvs/CCTV-UPSTREAM/snapshot/latest.jpg",
        headers=users_and_headers["admin_header"],
    )
    assert timed_out.status_code == 504

    def connection_error(url, headers, stream, timeout):
        raise requests.ConnectionError()

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", connection_error)
    failed = client.get(
        "/api/ai-media/cctvs/CCTV-UPSTREAM/snapshot/latest.jpg",
        headers=users_and_headers["admin_header"],
    )
    assert failed.status_code == 502


def test_cctv_detection_upstream_404_timeout_and_connection_failure(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        _create_media_cctv("CCTV-DETECT-FAIL")
        db.session.commit()

    def upstream_404(url, headers, timeout):
        return FakeUpstreamResponse([], status_code=404, headers={"Content-Type": "application/json"}, json_payload={})

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", upstream_404)
    not_found = client.get(
        "/api/ai-media/cctvs/CCTV-DETECT-FAIL/detections",
        headers=users_and_headers["admin_header"],
    )
    assert not_found.status_code == 404
    assert not_found.get_json()["success"] is False

    def timeout(url, headers, timeout):
        raise requests.Timeout()

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", timeout)
    timed_out = client.get(
        "/api/ai-media/cctvs/CCTV-DETECT-FAIL/detections",
        headers=users_and_headers["admin_header"],
    )
    assert timed_out.status_code == 504

    def connection_error(url, headers, timeout):
        raise requests.ConnectionError()

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", connection_error)
    failed = client.get(
        "/api/ai-media/cctvs/CCTV-DETECT-FAIL/detections",
        headers=users_and_headers["admin_header"],
    )
    assert failed.status_code == 502



def test_cctv_snapshot_and_detection_accept_camera_worker_id(client, app, users_and_headers, monkeypatch):
    with app.app_context():
        _create_media_cctv(
            "CCTV-001",
            cctv_id=1,
            stream_url="http://127.0.0.1:5001/streams/camera-1.mjpeg",
        )
        db.session.commit()

    captured = []

    def fake_get(url, headers, timeout, stream=False):
        captured.append({"url": url, "headers": headers, "stream": stream})
        if url.endswith("/detections"):
            return FakeUpstreamResponse(
                [],
                headers={"Content-Type": "application/json"},
                json_payload={"detections": []},
            )
        return FakeUpstreamResponse([b"snapshot"], headers={"Content-Type": "image/jpeg"})

    monkeypatch.setattr("app.modules.ai_media.service.requests.get", fake_get)

    snapshot = client.get(
        "/api/ai-media/cctvs/camera-1/snapshot/latest.jpg",
        headers=users_and_headers["admin_header"],
    )
    detections = client.get(
        "/api/ai-media/cctvs/camera-1/detections",
        headers=users_and_headers["admin_header"],
    )

    assert snapshot.status_code == 200
    assert detections.status_code == 200
    assert captured[0]["url"].endswith("/internal/cameras/camera-1/snapshot/latest.jpg")
    assert captured[1]["url"].endswith("/internal/cameras/camera-1/detections")
    assert all(call["headers"]["Authorization"] == "Bearer test-internal-token" for call in captured)
    assert all(call["headers"]["Authorization"] != users_and_headers["admin_header"]["Authorization"] for call in captured)
