import os
from datetime import datetime, timedelta

import pytest

from app import create_app
from app.extensions import db
from app.models import RealtimeEvent
from app.modules.realtime.routes import (
    DEFAULT_INCIDENT_MESSAGE,
    DEFAULT_RECENT_INCIDENT_LIMIT,
    MAX_RECENT_INCIDENT_LIMIT,
    RECENT_INCIDENT_EVENT_NAME,
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


def _create_realtime_event(
    *,
    event_name=RECENT_INCIDENT_EVENT_NAME,
    payload_incident_id=1,
    incident_code="ITS-TEST-001",
    created_at=None,
    send_status="SENT",
):
    now = created_at or datetime.utcnow()

    event = RealtimeEvent(
        event_type="INCIDENT",
        event_name=event_name,
        target_user_id=None,
        target_role="CONTROL_CENTER",
        target_room=None,
        target_resource_type="incident",
        target_resource_id=payload_incident_id,
        incident_id=None,
        payload={
            "type": "INCIDENT_CREATED",
            "event_name": event_name,
            "incident_id": payload_incident_id,
            "incident_code": incident_code,
            "event_type": "STOPPED_VEHICLE",
            "severity": "HIGH",
            "incident_status": "DETECTED",
            "cctv_id": None,
            "source_cctv_id": "CCTV-001",
            "detection_log_id": payload_incident_id * 10,
            "occurred_at": "2026-05-23T08:10:00",
            "message": "갓길 정차 의심 차량 감지",
            "vehicle_class": "car",
            "track_id": 17,
            "roi_type": "SHOULDER",
            "confidence": 0.91,
            "bbox": {"x1": 10, "y1": 20, "x2": 30, "y2": 40},
            "snapshot_path": "/storage/generated/incidents/demo.jpg",
            "clip_path": "/storage/generated/incidents/demo.mp4",
        },
        send_status=send_status,
        error_message=None,
        created_at=now,
        sent_at=now if send_status == "SENT" else None,
    )
    db.session.add(event)
    return event


def test_recent_incident_events_returns_latest_incident_created_events(client, app):
    with app.app_context():
        older = _create_realtime_event(
            payload_incident_id=1,
            incident_code="ITS-OLD",
            created_at=datetime.utcnow() - timedelta(minutes=10),
        )
        newer = _create_realtime_event(
            payload_incident_id=2,
            incident_code="ITS-NEW",
            created_at=datetime.utcnow(),
        )
        _create_realtime_event(
            event_name="report_analysis_updated",
            payload_incident_id=3,
            incident_code="SHOULD-NOT-BE-INCLUDED",
            created_at=datetime.utcnow() + timedelta(minutes=10),
        )
        db.session.commit()

        older_id = older.id
        newer_id = newer.id

    response = client.get("/api/realtime/incidents/recent")

    assert response.status_code == 200
    body = response.get_json()

    assert body["success"] is True
    assert body["count"] == 2

    items = body["items"]
    assert [item["realtime_event_id"] for item in items] == [newer_id, older_id]
    assert items[0]["incident_id"] == 2
    assert items[0]["incident_code"] == "ITS-NEW"
    assert items[0]["event_type"] == "STOPPED_VEHICLE"
    assert items[0]["severity"] == "HIGH"
    assert items[0]["source_cctv_id"] == "CCTV-001"
    assert items[0]["message"] == "갓길 정차 의심 차량 감지"
    assert items[0]["bbox_metadata"]["valid"] is True
    assert items[0]["bbox_metadata"]["coordinates"]["x1"] == 10.0
    assert items[0]["snapshot_path"] == "/storage/generated/incidents/demo.jpg"
    assert items[0]["clip_path"] == "/storage/generated/incidents/demo.mp4"


def test_recent_incident_events_respects_limit_max_100(client, app):
    with app.app_context():
        for index in range(105):
            _create_realtime_event(
                payload_incident_id=index + 1,
                incident_code=f"ITS-{index + 1:03d}",
                created_at=datetime.utcnow() + timedelta(seconds=index),
            )
        db.session.commit()

    response = client.get("/api/realtime/incidents/recent?limit=1000")

    assert response.status_code == 200
    body = response.get_json()

    assert body["success"] is True
    assert body["count"] == MAX_RECENT_INCIDENT_LIMIT
    assert len(body["items"]) == MAX_RECENT_INCIDENT_LIMIT


def test_recent_incident_events_uses_default_limit_for_invalid_limit(client, app):
    with app.app_context():
        for index in range(35):
            _create_realtime_event(
                payload_incident_id=index + 1,
                incident_code=f"ITS-INVALID-LIMIT-{index + 1:03d}",
                created_at=datetime.utcnow() + timedelta(seconds=index),
            )
        db.session.commit()

    response = client.get("/api/realtime/incidents/recent?limit=bad")

    assert response.status_code == 200
    body = response.get_json()

    assert body["success"] is True
    assert body["count"] == DEFAULT_RECENT_INCIDENT_LIMIT
    assert len(body["items"]) == DEFAULT_RECENT_INCIDENT_LIMIT


def test_recent_incident_events_handles_empty_payload_without_incident_join(client, app):
    with app.app_context():
        event = RealtimeEvent(
            event_type="INCIDENT",
            event_name=RECENT_INCIDENT_EVENT_NAME,
            target_user_id=None,
            target_role="CONTROL_CENTER",
            target_room=None,
            target_resource_type="incident",
            target_resource_id=None,
            incident_id=None,
            payload=None,
            send_status="FAILED",
            error_message="Socket.IO emit failed.",
            created_at=datetime.utcnow(),
            sent_at=None,
        )
        db.session.add(event)
        db.session.commit()

        event_id = event.id

    response = client.get("/api/realtime/incidents/recent")

    assert response.status_code == 200
    body = response.get_json()

    assert body["success"] is True
    assert body["count"] == 1
    assert body["items"][0]["realtime_event_id"] == event_id
    assert body["items"][0]["incident_id"] is None
    assert body["items"][0]["message"] == DEFAULT_INCIDENT_MESSAGE
    assert body["items"][0]["send_status"] == "FAILED"
