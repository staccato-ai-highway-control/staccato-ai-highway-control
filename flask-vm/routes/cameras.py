"""Camera API routes for the Flask-VM Relay."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from db import get_camera_status, list_camera_statuses, upsert_camera_status
from models import ValidationError, normalize_camera_status_payload
from websocket import broadcast_event


bp = Blueprint("cameras", __name__, url_prefix="/api/cameras")


@bp.get("")
def get_cameras():
    cameras = list_camera_statuses()
    return jsonify({"ok": True, "cameras": cameras, "count": len(cameras)})


@bp.get("/<camera_id>")
def get_camera(camera_id: str):
    camera = get_camera_status(camera_id)
    if camera is None:
        return jsonify({"ok": False, "error": "camera not found"}), 404
    return jsonify({"ok": True, "camera": camera})


@bp.post("/<camera_id>/status")
def update_camera_status(camera_id: str):
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"ok": False, "error": "JSON body is required"}), 400

    try:
        status = normalize_camera_status_payload(camera_id, payload)
        stored = upsert_camera_status(status)
    except ValidationError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    broadcast_event("camera:status", stored)
    return jsonify({"ok": True, "camera": stored})
