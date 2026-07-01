"""Replay AI event media Gateway regression tests."""

from datetime import datetime
from types import SimpleNamespace

from app.modules.replay import service as replay_service


EVENT_ID = "evt_20260701_010426_a02f1b3b"
GATEWAY_SNAPSHOT_URL = f"/api/ai-media/events/{EVENT_ID}/snapshot"
GATEWAY_VIDEO_URL = f"/api/ai-media/events/{EVENT_ID}/video"
PRIVATE_SNAPSHOT_URL = f"http://192.168.0.188:5001/events/{EVENT_ID}.jpg"
PRIVATE_VIDEO_URL = f"http://192.168.0.188:5001/events/{EVENT_ID}.mp4"


def _incident(**overrides):
    timestamp = datetime(2026, 7, 1, 1, 4, 26)
    data = {
        "id": 3800,
        "incident_code": EVENT_ID,
        "incident_type": "SHOULDER_STOP",
        "incident_status": "DETECTED",
        "risk_level": "HIGH",
        "detected_at": timestamp,
        "created_at": timestamp,
        "updated_at": timestamp,
        "cctv_id": "camera-2",
        "location_name": "",
        "report_id": None,
        "attachment_id": None,
        "analysis_job_id": None,
        "incident_source_type": "AI_STREAM",
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _ai_event(video_url=PRIVATE_VIDEO_URL):
    return SimpleNamespace(
        event_id=EVENT_ID,
        video_url=video_url,
    )


def _patch_common(
    monkeypatch,
    *,
    snapshot_path=None,
    ai_event=None,
    realtime_payload=None,
    attachment=None,
):
    snapshot = (
        SimpleNamespace(file_path=snapshot_path)
        if snapshot_path is not None
        else None
    )
    realtime_event = (
        SimpleNamespace(payload=realtime_payload)
        if realtime_payload is not None
        else None
    )

    monkeypatch.setattr(replay_service, "_get_cctv", lambda _incident: None)
    monkeypatch.setattr(replay_service, "_get_report", lambda _incident: None)
    monkeypatch.setattr(
        replay_service,
        "_get_attachment",
        lambda _incident, report=None: attachment,
    )
    monkeypatch.setattr(
        replay_service,
        "_get_analysis_job",
        lambda _incident: None,
    )
    monkeypatch.setattr(
        replay_service,
        "_latest_snapshot",
        lambda _incident_id: snapshot,
    )
    monkeypatch.setattr(
        replay_service,
        "_latest_realtime_event",
        lambda _incident_id: realtime_event,
    )
    monkeypatch.setattr(replay_service, "_public_url", lambda value: value)
    monkeypatch.setattr(
        replay_service,
        "_storage_media_exists",
        lambda _url: True,
    )
    monkeypatch.setattr(
        replay_service,
        "_latest_ai_event_for_replay",
        lambda _incident, source_type=None: ai_event,
    )


def test_ai_event_replay_uses_gateway_snapshot_and_video(monkeypatch):
    _patch_common(
        monkeypatch,
        snapshot_path=PRIVATE_SNAPSHOT_URL,
        ai_event=_ai_event(),
    )

    payload = replay_service.serialize_replay_item(_incident())

    assert payload["snapshot_url"] == GATEWAY_SNAPSHOT_URL
    assert payload["replay_url"] == GATEWAY_VIDEO_URL
    assert payload["has_snapshot"] is True
    assert payload["has_video"] is True
    assert ":5001" not in payload["snapshot_url"]
    assert ":5001" not in payload["replay_url"]


def test_missing_snapshot_uses_ai_event_gateway(monkeypatch):
    _patch_common(
        monkeypatch,
        snapshot_path=None,
        ai_event=_ai_event(),
    )

    payload = replay_service.serialize_replay_item(_incident())

    assert payload["snapshot_url"] == GATEWAY_SNAPSHOT_URL
    assert payload["has_snapshot"] is True


def test_private_ai_urls_without_ai_event_are_not_exposed(monkeypatch):
    _patch_common(
        monkeypatch,
        snapshot_path=PRIVATE_SNAPSHOT_URL,
        ai_event=None,
        realtime_payload={"video_url": PRIVATE_VIDEO_URL},
    )

    payload = replay_service.serialize_replay_item(_incident())

    assert payload["snapshot_url"] is None
    assert payload["replay_url"] is None
    assert payload["has_snapshot"] is False
    assert payload["has_video"] is False


def test_report_attachment_keeps_existing_storage_url(monkeypatch):
    attachment = SimpleNamespace(
        id=91,
        file_type="VIDEO",
        mime_type="video/mp4",
        file_url="/storage/reports/manual-report.mp4",
    )

    _patch_common(
        monkeypatch,
        snapshot_path="/storage/reports/manual-evidence.jpg",
        ai_event=None,
        attachment=attachment,
    )

    payload = replay_service.serialize_replay_item(
        _incident(
            cctv_id=None,
            incident_source_type="REPORT",
        )
    )

    assert payload["source_type"] == replay_service.REPORT_SOURCE
    assert payload["snapshot_url"] == "/storage/reports/manual-evidence.jpg"
    assert payload["replay_url"] == "/storage/reports/manual-report.mp4"
    assert payload["has_video"] is True


def test_private_ai_url_is_not_browser_safe_storage_url():
    assert replay_service._resolve_storage_media_url(PRIVATE_SNAPSHOT_URL) is None
