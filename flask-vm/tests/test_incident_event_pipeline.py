import os
from datetime import datetime

import pytest

from app import create_app
from app.extensions import db
from app.models import DetectionLog, Incident, IncidentSnapshot, RealtimeEvent
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


def _payload(**overrides):
    payload = {
        "event_id": "its-test-000001",
        "event_type": "STOPPED_VEHICLE",
        "severity": "HIGH",
        "cctv_id": "CCTV-001",
        "occurred_at": "2026-05-23T08:10:00Z",
        "roi_type": "SHOULDER",
        "track_id": 17,
        "vehicle_class": "car",
        "confidence": 0.91,
        "bbox": {
            "x1": 120,
            "y1": 240,
            "x2": 280,
            "y2": 360,
        },
        "snapshot_path": "/storage/generated/incidents/test.jpg",
        "clip_path": "/storage/generated/incidents/test.mp4",
        "message": "갓길 정차 의심 차량 감지",
    }
    payload.update(overrides)
    return payload


def test_create_its_event_saves_incident_detection_snapshot_and_realtime_event(client, app):
    response = client.post("/internal/its/events", json=_payload())

    assert response.status_code == 201
    body = response.get_json()
    assert body["success"] is True
    assert body["status"] == "created"
    assert body["incident_id"]
    assert body["detection_log_id"]
    assert body["snapshot_id"]
    assert body["realtime_event_id"]
    assert body["socket_emitted"] is True

    with app.app_context():
        incident = Incident.query.filter_by(incident_code="its-test-000001").one()
        assert incident.incident_type == "STOPPED_VEHICLE"
        assert incident.incident_status == "DETECTED"
        assert incident.risk_level == "HIGH"
        assert float(incident.confidence) == 0.91
        assert incident.cctv_id is None

        detection_log = DetectionLog.query.filter_by(incident_id=incident.id).one()
        assert detection_log.detected_class == "car"
        assert detection_log.roi_type == "SHOULDER"
        assert detection_log.bbox_json["x1"] == 120.0
        assert detection_log.raw_result_json["cctv_id"] == "CCTV-001"

        snapshot = IncidentSnapshot.query.filter_by(incident_id=incident.id).one()
        assert snapshot.file_path == "/storage/generated/incidents/test.jpg"
        assert snapshot.detection_log_id == detection_log.id

        realtime_event = RealtimeEvent.query.filter_by(incident_id=incident.id).one()
        assert realtime_event.event_name == "incident.created"
        assert realtime_event.send_status == "SENT"
        assert realtime_event.payload["incident_id"] == incident.id


def test_create_its_event_rejects_missing_required_field(client):
    payload = _payload()
    payload.pop("event_type")

    response = client.post("/internal/its/events", json=payload)

    assert response.status_code == 400
    body = response.get_json()
    assert body["success"] is False
    assert "event_type" in body["error"]


def test_create_its_event_rejects_invalid_bbox(client):
    response = client.post(
        "/internal/its/events",
        json=_payload(bbox={"x1": 10, "y1": 10, "x2": 5, "y2": 20}),
    )

    assert response.status_code == 400
    body = response.get_json()
    assert body["success"] is False
    assert "bbox" in body["error"]


def test_create_its_event_is_idempotent_by_event_id(client, app):
    first = client.post("/internal/its/events", json=_payload(event_id="its-test-duplicate"))
    second = client.post("/internal/its/events", json=_payload(event_id="its-test-duplicate"))

    assert first.status_code == 201
    assert second.status_code == 200

    second_body = second.get_json()
    assert second_body["success"] is True
    assert second_body["status"] == "duplicate"
    assert second_body["socket_emitted"] is False

    with app.app_context():
        assert Incident.query.filter_by(incident_code="its-test-duplicate").count() == 1


def test_socket_emit_failure_does_not_break_api(client, app, monkeypatch):
    def raise_emit(*args, **kwargs):
        raise RuntimeError("forced socket failure")

    monkeypatch.setattr(
        "app.modules.socketio.emitters.socketio.emit",
        raise_emit,
    )

    response = client.post(
        "/internal/its/events",
        json=_payload(event_id="its-test-emit-failure"),
    )

    assert response.status_code == 201
    body = response.get_json()
    assert body["success"] is True
    assert body["socket_emitted"] is False

    with app.app_context():
        incident = Incident.query.filter_by(incident_code="its-test-emit-failure").one()
        assert DetectionLog.query.filter_by(incident_id=incident.id).count() == 1

        realtime_event = RealtimeEvent.query.filter_by(incident_id=incident.id).one()
        assert realtime_event.send_status == "FAILED"
        assert realtime_event.error_message == "Socket.IO emit failed."


def test_create_its_event_requires_internal_token_when_configured(client, app):
    app.config["INTERNAL_API_TOKEN"] = "test-internal-token"
    app.config["REQUIRE_INTERNAL_API_TOKEN_IN_TESTING"] = True

    rejected = client.post(
        "/internal/its/events",
        json=_payload(event_id="its-requires-token"),
    )
    assert rejected.status_code == 401

    accepted = client.post(
        "/internal/its/events",
        json=_payload(event_id="its-requires-token"),
        headers={"X-Internal-API-Token": "test-internal-token"},
    )
    assert accepted.status_code == 201
    assert accepted.get_json()["incident_code"] == "its-requires-token"
