"""Incident snapshot URL selection regression tests."""

from datetime import datetime
from types import SimpleNamespace

from app.modules.incident import routes as incident_routes


EVENT_ID = "evt_20260701_010426_a02f1b3b"
GATEWAY_SNAPSHOT_URL = f"/api/ai-media/events/{EVENT_ID}/snapshot"


def _incident():
    return SimpleNamespace(
        id=3800,
        cctv_id=None,
        incident_type="SHOULDER_STOP",
        incident_status="DETECTED",
        risk_level="HIGH",
        confidence=0.91,
        stopped_duration_seconds=12,
        location_name="",
        incident_code=EVENT_ID,
        detected_at=datetime(2026, 7, 1, 1, 4, 26),
        report_id=None,
    )


def _ai_event():
    return SimpleNamespace(
        event_id=EVENT_ID,
        camera_id="camera-2",
        snapshot_url=GATEWAY_SNAPSHOT_URL,
        video_url=f"/api/ai-media/events/{EVENT_ID}/video",
        stream_url="",
        bbox_json=None,
        raw_event_json={},
    )


def _serialize(monkeypatch, *, snapshot_path=None, ai_event=None):
    snapshot = (
        SimpleNamespace(file_path=snapshot_path)
        if snapshot_path is not None
        else None
    )

    monkeypatch.setattr(incident_routes, "_get_cctv", lambda _cctv_id: None)
    monkeypatch.setattr(
        incident_routes,
        "_latest_detection_log",
        lambda _incident_id: None,
    )
    monkeypatch.setattr(
        incident_routes,
        "_latest_snapshot",
        lambda _incident_id: snapshot,
    )
    monkeypatch.setattr(
        incident_routes,
        "_latest_ai_event_for_incident",
        lambda _incident: ai_event,
    )

    return incident_routes._to_frontend_incident(_incident())


def test_private_snapshot_uses_ai_event_gateway(monkeypatch):
    payload = _serialize(
        monkeypatch,
        snapshot_path=f"http://192.168.0.188:5001/events/{EVENT_ID}.jpg",
        ai_event=_ai_event(),
    )

    assert payload["snapshotUrl"] == GATEWAY_SNAPSHOT_URL
    assert ":5001" not in payload["snapshotUrl"]


def test_browser_safe_incident_snapshot_is_preserved(monkeypatch):
    safe_snapshot_path = "/uploads/incidents/manual-evidence.jpg"

    payload = _serialize(
        monkeypatch,
        snapshot_path=safe_snapshot_path,
        ai_event=_ai_event(),
    )

    assert payload["snapshotUrl"] == safe_snapshot_path


def test_private_snapshot_without_ai_event_is_not_exposed(monkeypatch):
    payload = _serialize(
        monkeypatch,
        snapshot_path=f"http://192.168.0.188:5001/events/{EVENT_ID}.jpg",
        ai_event=None,
    )

    assert payload["snapshotUrl"] == ""


def test_missing_snapshot_uses_ai_event_gateway(monkeypatch):
    payload = _serialize(
        monkeypatch,
        snapshot_path=None,
        ai_event=_ai_event(),
    )

    assert payload["snapshotUrl"] == GATEWAY_SNAPSHOT_URL
