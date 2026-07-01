from datetime import datetime
from types import SimpleNamespace

from app.modules.incident_event.service import _build_socket_payload
from app.modules.realtime.routes import _normalize_incident_payload


EVENT_ID = "evt_gateway_regression_001"
PRIVATE_SNAPSHOT_URL = f"http://ai-media.invalid:5001/events/{EVENT_ID}.jpg"
PRIVATE_VIDEO_URL = f"http://ai-media.invalid:5001/events/{EVENT_ID}.mp4"


def _realtime_event(payload, *, event_id=1, incident_id=101):
    return SimpleNamespace(
        id=event_id,
        send_status="SENT",
        created_at=datetime(2026, 7, 1, 3, 0, 0),
        sent_at=None,
        incident_id=incident_id,
        payload=payload,
    )


def test_recent_endpoint_converts_private_ai_media_to_gateway_urls():
    payload = _normalize_incident_payload(
        _realtime_event(
            {
                "incident_id": 101,
                "incident_code": EVENT_ID,
                "snapshot_path": PRIVATE_SNAPSHOT_URL,
                "clip_path": PRIVATE_VIDEO_URL,
            }
        )
    )

    assert payload["snapshot_path"] == (
        f"/api/ai-media/events/{EVENT_ID}/snapshot"
    )
    assert payload["clip_path"] == f"/api/ai-media/events/{EVENT_ID}/video"


def test_recent_endpoint_keeps_existing_storage_paths():
    payload = _normalize_incident_payload(
        _realtime_event(
            {
                "incident_id": 101,
                "incident_code": "ITS-101",
                "snapshot_path": "/storage/generated/incidents/demo.jpg",
                "clip_path": "/storage/generated/incidents/demo.mp4",
            }
        )
    )

    assert payload["snapshot_path"] == "/storage/generated/incidents/demo.jpg"
    assert payload["clip_path"] == "/storage/generated/incidents/demo.mp4"


def test_recent_endpoint_hides_private_media_without_event_identifier():
    payload = _normalize_incident_payload(
        _realtime_event(
            {
                "snapshot_path": PRIVATE_SNAPSHOT_URL,
                "clip_path": PRIVATE_VIDEO_URL,
            },
            incident_id=None,
        )
    )

    assert payload["snapshot_path"] is None
    assert payload["clip_path"] is None


def test_new_incident_socket_payload_uses_gateway_urls():
    incident = SimpleNamespace(
        id=101,
        incident_code=EVENT_ID,
        incident_type="SHOULDER_STOP",
        risk_level="MEDIUM",
        incident_status="DETECTED",
        cctv_id=1,
        detected_at=datetime(2026, 7, 1, 3, 0, 0),
        confidence=0.91,
    )
    detection_log = SimpleNamespace(id=501, bbox_json=None)
    snapshot = SimpleNamespace(file_path=PRIVATE_SNAPSHOT_URL)

    payload = _build_socket_payload(
        incident=incident,
        detection_log=detection_log,
        snapshot=snapshot,
        source_payload={
            "event_id": EVENT_ID,
            "clip_path": PRIVATE_VIDEO_URL,
        },
    )

    assert payload["snapshot_path"] == (
        f"/api/ai-media/events/{EVENT_ID}/snapshot"
    )
    assert payload["clip_path"] == f"/api/ai-media/events/{EVENT_ID}/video"
