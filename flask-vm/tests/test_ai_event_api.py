import os

import pytest

from app import create_app
from app.extensions import db
from app.models import AiEvent, Incident
from app.modules.incident_event.service import (
    IncidentEventService,
    IncidentEventValidationError,
)
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
        "event_id": "evt_20260526_0001",
        "camera_id": "camera-1",
        "event_type": "STOPPED_VEHICLE",
        "severity": "WARNING",
        "timestamp": "2026-05-26T10:45:12+09:00",
        "track_id": 7,
        "roi_id": "shoulder_1",
        "lane_type": "SHOULDER",
        "bbox": [820, 430, 940, 510],
        "snapshot_url": "http://127.0.0.1:5001/events/evt_20260526_0001.jpg",
        "video_url": "http://127.0.0.1:5001/events/evt_20260526_0001.mp4",
        "stream_url": "http://127.0.0.1:5001/streams/camera-1.mjpeg",
        "message": "Stopped vehicle detected in shoulder ROI",
        "detections": [{"class": "car", "confidence": 0.94}],
    }
    payload.update(overrides)
    return payload


def test_post_api_events_persists_event_media_bbox_and_raw_json(client, app):
    response = client.post("/api/events", json=_payload())

    assert response.status_code == 201
    body = response.get_json()
    assert body["ok"] is True
    assert body["success"] is True
    assert body["status"] == "created"
    assert body["event"]["event_id"] == "evt_20260526_0001"
    assert body["event"]["video_url"].endswith(".mp4")
    assert body["event"]["snapshot_url"].endswith(".jpg")
    assert body["event"]["stream_url"].endswith(".mjpeg")
    assert body["event"]["bbox"] == [820, 430, 940, 510]
    assert body["event"]["bbox_metadata"]["valid"] is True
    assert body["event"]["bbox_metadata"]["format"] == "xyxy"
    assert body["event"]["detection_count"] == 1
    assert body["event"]["detections"][0]["bbox_metadata"]["present"] is False
    assert body["event"]["raw_event_json"]["detections"][0]["class"] == "car"

    with app.app_context():
        event = db.session.get(AiEvent, "evt_20260526_0001")
        assert event is not None
        assert event.camera_id == "camera-1"
        assert event.event_type == "STOPPED_VEHICLE"
        assert event.video_url == "http://192.168.0.186:5001/events/evt_20260526_0001.mp4"
        assert event.snapshot_url == "http://192.168.0.186:5001/events/evt_20260526_0001.jpg"
        assert event.stream_url == "http://192.168.0.186:5001/streams/camera-1.mjpeg"
        assert event.bbox_json == [820, 430, 940, 510]
        assert event.raw_event_json["message"] == "Stopped vehicle detected in shoulder ROI"

        incident = Incident.query.filter_by(incident_code="evt_20260526_0001").one()
        assert incident.incident_type == "STOPPED_VEHICLE"
        assert incident.incident_status == "DETECTED"
        assert incident.risk_level == "MEDIUM"


def test_get_api_events_detail_and_replay_return_saved_event(client):
    client.post("/api/events", json=_payload())

    list_response = client.get("/api/events")
    assert list_response.status_code == 200
    list_body = list_response.get_json()
    assert list_body["count"] == 1
    assert list_body["events"][0]["event_id"] == "evt_20260526_0001"

    detail_response = client.get("/api/events/evt_20260526_0001")
    assert detail_response.status_code == 200
    detail_body = detail_response.get_json()
    assert detail_body["event"]["camera_id"] == "camera-1"

    replay_response = client.get("/api/replays/evt_20260526_0001")
    assert replay_response.status_code == 200
    replay_body = replay_response.get_json()
    assert replay_body["replay"]["video_url"].endswith(".mp4")
    assert replay_body["replay"]["snapshot_url"].endswith(".jpg")
    assert replay_body["replay"]["event"]["raw_event_json"]["event_id"] == "evt_20260526_0001"


def test_post_api_events_requires_minimum_fields(client):
    payload = _payload()
    payload.pop("timestamp")

    response = client.post("/api/events", json=payload)

    assert response.status_code == 400
    body = response.get_json()
    assert body["ok"] is False
    assert "timestamp" in body["error"]


def test_post_api_events_updates_existing_event_by_event_id(client, app):
    first = client.post("/api/events", json=_payload())
    second = client.post(
        "/api/events",
        json=_payload(
            video_url="http://127.0.0.1:5001/events/evt_20260526_0001_v2.mp4",
            message="Updated media URL",
        ),
    )

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.get_json()["status"] == "updated"
    assert second.get_json()["event"]["message"] == "Updated media URL"

    with app.app_context():
        assert AiEvent.query.count() == 1
        event = db.session.get(AiEvent, "evt_20260526_0001")
        assert event.video_url.endswith("_v2.mp4")


def test_post_api_events_requires_internal_token_when_configured(client, app):
    app.config["INTERNAL_API_TOKEN"] = "test-internal-token"
    app.config["REQUIRE_INTERNAL_API_TOKEN_IN_TESTING"] = True

    rejected = client.post(
        "/api/events",
        json=_payload(event_id="evt_requires_token"),
    )
    assert rejected.status_code == 401

    accepted = client.post(
        "/api/events",
        json=_payload(event_id="evt_requires_token"),
        headers={"X-Internal-API-Token": "test-internal-token"},
    )
    assert accepted.status_code == 201
    assert accepted.get_json()["incident"]["incident_code"] == "evt_requires_token"



def test_post_api_events_rolls_back_ai_event_when_incident_creation_fails(
    client,
    app,
    monkeypatch,
):
    def fail_create_from_its_event(payload, *, commit=True, emit_socket=True):
        raise IncidentEventValidationError("forced incident failure")

    monkeypatch.setattr(
        IncidentEventService,
        "create_from_its_event",
        staticmethod(fail_create_from_its_event),
    )

    response = client.post(
        "/api/events",
        json=_payload(event_id="evt_atomic_failure"),
    )

    assert response.status_code == 400
    assert "forced incident failure" in response.get_json()["error"]

    with app.app_context():
        assert db.session.get(AiEvent, "evt_atomic_failure") is None
        assert Incident.query.filter_by(incident_code="evt_atomic_failure").count() == 0
