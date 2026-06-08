from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request

from app.modules.internal_auth import require_internal_api_token
from app.modules.incident_event.service import (
    IncidentEventService,
    IncidentEventValidationError,
)

from app.extensions import db, socketio
from app.modules.ai_relay.service import (
    RelayValidationError,
    build_incident_event_payload,
    build_replay,
    get_event,
    list_events,
    serialize_event,
    store_event,
)


logger = logging.getLogger(__name__)

ai_relay_bp = Blueprint("ai_relay", __name__, url_prefix="/api")


@ai_relay_bp.post("/events")
def create_event():
    auth_error = require_internal_api_token()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"ok": False, "success": False, "error": "JSON body is required"}), 400

    try:
        event, status = store_event(payload, commit=False)
        incident_result = IncidentEventService.create_from_its_event(
            build_incident_event_payload(payload),
            commit=False,
            emit_socket=False,
        )
        db.session.commit()
    except RelayValidationError as exc:
        db.session.rollback()
        return jsonify({"ok": False, "success": False, "error": str(exc)}), 400
    except IncidentEventValidationError as exc:
        db.session.rollback()
        return jsonify({"ok": False, "success": False, "error": str(exc)}), 400
    except Exception:
        db.session.rollback()
        logger.exception("Unexpected AI event persistence error")
        return jsonify({"ok": False, "success": False, "error": "Internal server error"}), 500

    if incident_result.get("status") == "created":
        try:
            incident_result["socket_emitted"] = (
                IncidentEventService.emit_realtime_event_by_id(
                    incident_result.get("realtime_event_id")
                )
            )
        except Exception:
            incident_result["socket_emitted"] = False
            logger.exception(
                "Failed to emit AI-created incident socket after commit. event_id=%s",
                payload.get("event_id"),
            )

    event_dict = event.to_dict()
    broadcast_queued = _emit("ai_event_received", serialize_event(event))
    status_code = 201 if status == "created" else 200

    return jsonify({
        "ok": True,
        "success": True,
        "status": status,
        "event": event_dict,
        "incident": incident_result,
        "broadcast_queued": broadcast_queued,
    }), status_code


@ai_relay_bp.get("/events")
def get_events():
    events = list_events(
        limit=request.args.get("limit", default=100, type=int),
        camera_id=request.args.get("camera_id"),
        event_type=request.args.get("event_type"),
        status=request.args.get("status"),
    )
    event_items = [serialize_event(event) for event in events]

    return jsonify({
        "ok": True,
        "success": True,
        "events": event_items,
        "count": len(event_items),
    }), 200


@ai_relay_bp.get("/events/<event_id>")
def get_event_detail(event_id: str):
    event = get_event(event_id)
    if event is None:
        return jsonify({"ok": False, "success": False, "error": "event not found"}), 404

    return jsonify({"ok": True, "success": True, "event": serialize_event(event)}), 200


@ai_relay_bp.get("/replays/<event_id>")
def get_replay(event_id: str):
    event = get_event(event_id)
    if event is None:
        return jsonify({"ok": False, "success": False, "error": "event not found"}), 404

    return jsonify({"ok": True, "success": True, "replay": build_replay(event)}), 200


def _emit(event_name: str, payload: dict) -> bool:
    try:
        socketio.emit(event_name, payload)
        return True
    except Exception:
        logger.exception("Failed to emit %s", event_name)
        return False
