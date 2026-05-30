from __future__ import annotations

import json
from collections.abc import Iterable

from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO


db = SQLAlchemy()
migrate = Migrate()
socketio = SocketIO(
    cors_allowed_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://192.168.0.188:3001"
    ]
)

def _normalize_cors_origins(value, fallback="*"):
    """
    Normalize CORS origin config for Flask-CORS and Flask-SocketIO.

    Supported inputs:
    - "*"
    - "http://localhost:3000,http://192.168.0.188:3000"
    - ["http://localhost:3000", "http://192.168.0.188:3000"]
    - tuple/set equivalents
    - JSON list string: '["http://localhost:3000"]'

    Empty values fall back to fallback.
    If "*" is included anywhere, wildcard is used.
    """
    if value is None:
        value = fallback

    if isinstance(value, str):
        raw = value.strip()

        if not raw:
            raw = str(fallback).strip() if fallback is not None else ""

        if raw == "*":
            return "*"

        parsed = None
        if raw.startswith("[") and raw.endswith("]"):
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = None

        if isinstance(parsed, list):
            candidates = parsed
        else:
            candidates = raw.split(",")

    elif isinstance(value, Iterable):
        candidates = list(value)

    else:
        candidates = [value]

    origins = []
    for origin in candidates:
        if origin is None:
            continue

        cleaned = str(origin).strip()

        if not cleaned:
            continue

        if cleaned == "*":
            return "*"

        origins.append(cleaned.rstrip("/"))

    if not origins:
        return fallback if fallback else []

    return origins


def init_extensions(app):
    cors_origins = _normalize_cors_origins(
        app.config.get("CORS_ORIGINS"),
        fallback="*",
    )
    socketio_cors_origins = _normalize_cors_origins(
        app.config.get("SOCKETIO_CORS_ORIGINS"),
        fallback=cors_origins,
    )

    CORS(
        app,
        resources={
            r"/*": {
                "origins": cors_origins,
            }
        },
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    db.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(app, cors_allowed_origins=socketio_cors_origins)
