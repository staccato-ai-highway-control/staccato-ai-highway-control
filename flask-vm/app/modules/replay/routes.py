from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.modules.replay.service import get_replay_detail, list_replays


replay_bp = Blueprint("replay", __name__, url_prefix="/api/replays")


@replay_bp.get("")
def list_replays_api():
    try:
        page = _positive_int(request.args.get("page"), 1)
        size = _positive_int(request.args.get("size"), 20, maximum=100)
    except ValueError as exc:
        return jsonify({
            "success": False,
            "error_code": "INVALID_REPLAY_QUERY",
            "message": str(exc),
            "details": None,
        }), 400

    filters = {
        "source_type": request.args.get("source_type"),
        "incident_type": request.args.get("incident_type"),
        "risk_level": request.args.get("risk_level"),
        "status": request.args.get("status"),
        "keyword": request.args.get("keyword"),
    }

    try:
        result = list_replays(page=page, size=size, filters=filters)
    except ValueError as exc:
        return jsonify({
            "success": False,
            "error_code": "INVALID_REPLAY_QUERY",
            "message": str(exc),
            "details": None,
        }), 400

    return jsonify(result), 200


@replay_bp.get("/<int:incident_id>")
def get_replay_detail_api(incident_id: int):
    result = get_replay_detail(incident_id)
    status_code = 200 if result.get("success") else 404
    return jsonify(result), status_code


def _positive_int(value, default: int, maximum: int | None = None) -> int:
    if value in (None, ""):
        return default

    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("page and size must be positive integers.") from exc

    if parsed <= 0:
        raise ValueError("page and size must be positive integers.")

    if maximum is not None:
        return min(parsed, maximum)

    return parsed
