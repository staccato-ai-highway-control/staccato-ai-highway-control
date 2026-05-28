"""Health API routes for the Flask-VM Relay."""

from __future__ import annotations

from flask import Blueprint, jsonify

from db import get_db_path
from websocket import hub


bp = Blueprint("health", __name__)


@bp.get("/api/health")
@bp.get("/health")
def health():
    return jsonify(
        {
            "ok": True,
            "service": "flask-vm-relay",
            "db_path": str(get_db_path()),
            "websocket_clients": hub.count(),
            "websocket": hub.stats(),
        }
    )
