"""Flask-VM Relay entrypoint."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from flask import Flask, jsonify, request


BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from db import init_db
from routes.cameras import bp as cameras_bp
from routes.events import bp as events_bp
from routes.health import bp as health_bp
from routes.replays import bp as replays_bp
from websocket import init_websocket


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["JSON_AS_ASCII"] = False

    init_db()

    app.register_blueprint(health_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(replays_bp)
    app.register_blueprint(cameras_bp)
    init_websocket(app)

    @app.get("/")
    def index():
        return jsonify(
            {
                "ok": True,
                "service": "flask-vm-relay",
                "endpoints": [
                    "GET /api/health",
                    "POST /api/events",
                    "GET /api/events",
                    "GET /api/events/{event_id}",
                    "GET /api/replays/{event_id}",
                    "GET /api/cameras",
                    "POST /api/cameras/{camera_id}/status",
                    "GET /ws",
                ],
            }
        )

    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            return "", 204
        return None

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = os.environ.get(
            "CORS_ALLOW_ORIGIN", "*"
        )
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization"
        )
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
        return response

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"ok": False, "error": "not found"}), 404

    @app.errorhandler(500)
    def internal_error(_error):
        return jsonify({"ok": False, "error": "internal server error"}), 500

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_RELAY_PORT", "8000"))
    app.run(host="0.0.0.0", port=port, threaded=True)
