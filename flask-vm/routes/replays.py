"""Replay API routes for the Flask-VM Relay."""

from __future__ import annotations

from flask import Blueprint, jsonify

from db import get_event


bp = Blueprint("replays", __name__, url_prefix="/api/replays")


@bp.get("/<event_id>")
def get_replay(event_id: str):
    event = get_event(event_id)
    if event is None:
        return jsonify({"ok": False, "error": "event not found"}), 404

    return jsonify(
        {
            "ok": True,
            "replay": {
                "event_id": event["event_id"],
                "camera_id": event["camera_id"],
                "timestamp": event["timestamp"],
                "snapshot_url": event.get("snapshot_url"),
                "video_url": event.get("video_url"),
                "stream_url": event.get("stream_url"),
                "event": event,
            },
        }
    )
