from flask import Blueprint, jsonify, request

from app.extensions import socketio
from app.modules.ai_relay.service import (
    RelayValidationError,
    build_replay,
    get_camera_status,
    get_event,
    list_camera_statuses,
    list_events,
    store_event,
    upsert_camera_status,
)


ai_relay_bp = Blueprint("ai_relay", __name__, url_prefix="/api")


@ai_relay_bp.post("/events")
def create_event():
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"ok": False, "error": "JSON body is required"}), 400

    try:
        event = store_event(payload)
    except RelayValidationError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    _emit("ai_event_received", event)
    return jsonify({"ok": True, "event": event, "broadcast_queued": True}), 201


@ai_relay_bp.get("/events")
def get_events():
    limit = request.args.get("limit", default=100, type=int)
    events = list_events(
        limit=limit,
        camera_id=request.args.get("camera_id"),
        event_type=request.args.get("event_type"),
        status=request.args.get("status"),
    )
    return jsonify({"ok": True, "events": events, "count": len(events)})


@ai_relay_bp.get("/events/<event_id>")
def get_event_detail(event_id: str):
    event = get_event(event_id)
    if event is None:
        return jsonify({"ok": False, "error": "event not found"}), 404
    return jsonify({"ok": True, "event": event})


@ai_relay_bp.get("/replays/<event_id>")
def get_replay(event_id: str):
    event = get_event(event_id)
    if event is None:
        return jsonify({"ok": False, "error": "event not found"}), 404

    return jsonify({"ok": True, "replay": build_replay(event)})


@ai_relay_bp.get("/cameras")
def get_cameras():
    cameras = list_camera_statuses()
    return jsonify({"ok": True, "cameras": cameras, "count": len(cameras)})


@ai_relay_bp.get("/cameras/<camera_id>")
def get_camera(camera_id: str):
    camera = get_camera_status(camera_id)
    if camera is None:
        return jsonify({"ok": False, "error": "camera not found"}), 404
    return jsonify({"ok": True, "camera": camera})


@ai_relay_bp.post("/cameras/<camera_id>/status")
def update_camera_status(camera_id: str):
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"ok": False, "error": "JSON body is required"}), 400

    try:
        status = upsert_camera_status(camera_id, payload)
    except RelayValidationError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    _emit("ai_camera_status_updated", status)
    return jsonify({"ok": True, "camera": status})


def _emit(event_name: str, payload: dict):
    try:
        socketio.emit(event_name, payload)
    except Exception:
        pass
