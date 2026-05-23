from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request

from app.modules.incident_event.service import (
    IncidentEventService,
    IncidentEventValidationError,
)


logger = logging.getLogger(__name__)

incident_event_bp = Blueprint(
    "incident_event",
    __name__,
    url_prefix="/internal/its",
)


@incident_event_bp.route("/events", methods=["POST"])
def create_its_event():
    payload = request.get_json(silent=True)

    try:
        result = IncidentEventService.create_from_its_event(payload)
    except IncidentEventValidationError as exc:
        return jsonify({
            "success": False,
            "error": str(exc),
        }), 400
    except Exception:
        logger.exception("Unexpected ITS incident event error")
        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다.",
        }), 500

    status_code = 200 if result.get("status") == "duplicate" else 201

    return jsonify({
        "success": True,
        **result,
    }), status_code
