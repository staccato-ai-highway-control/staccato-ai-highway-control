"""Event API routes for the Flask-VM Relay."""

from __future__ import annotations

from sqlite3 import IntegrityError

from flask import Blueprint, jsonify, request

from db import get_event, insert_event, list_events
from models import ValidationError, normalize_event_payload
from websocket import broadcast_event


bp = Blueprint("events", __name__, url_prefix="/api/events")


@bp.post("")
def create_event():
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"ok": False, "error": "JSON body is required"}), 400

    try:
        event = normalize_event_payload(payload)
        stored = insert_event(event)
    except ValidationError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except IntegrityError:
        return jsonify({"ok": False, "error": "event_id already exists"}), 409

    broadcast_queued = broadcast_event("event:new", stored)
    return jsonify({"ok": True, "event": stored, "broadcast_queued": broadcast_queued}), 201


@bp.get("")
def get_events():
    limit = request.args.get("limit", default=100, type=int)
    events = list_events(
        limit=limit,
        camera_id=request.args.get("camera_id"),
        event_type=request.args.get("event_type"),
        status=request.args.get("status"),
    )
    return jsonify({"ok": True, "events": events, "count": len(events)})


@bp.get("/<event_id>")
def get_event_detail(event_id: str):
    event = get_event(event_id)
    if event is None:
        return jsonify({"ok": False, "error": "event not found"}), 404
    return jsonify({"ok": True, "event": event})
