"""Database helpers for the Flask-VM Relay."""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "relay.db"


def get_db_path() -> Path:
    return Path(os.environ.get("FLASK_RELAY_DB", DEFAULT_DB_PATH))


def get_connection() -> sqlite3.Connection:
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 3000")
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA synchronous = NORMAL")
        connection.execute("PRAGMA busy_timeout = 3000")
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS events (
                event_id TEXT PRIMARY KEY,
                camera_id TEXT NOT NULL,
                camera_name TEXT,
                event_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                bbox TEXT,
                track_id INTEGER,
                roi_id TEXT,
                lane_type TEXT,
                estimated_speed_kmh REAL,
                message TEXT,
                snapshot_url TEXT,
                video_url TEXT,
                stream_url TEXT,
                status TEXT NOT NULL DEFAULT 'NEW',
                raw_event_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_events_timestamp
                ON events(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_events_camera_id
                ON events(camera_id);
            CREATE INDEX IF NOT EXISTS idx_events_event_type
                ON events(event_type);

            CREATE TABLE IF NOT EXISTS camera_status (
                camera_id TEXT PRIMARY KEY,
                camera_name TEXT,
                status TEXT NOT NULL,
                stream_url TEXT,
                last_frame_at TEXT,
                last_event_at TEXT,
                raw_status_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )


def insert_event(event: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO events (
                event_id, camera_id, camera_name, event_type, severity, timestamp,
                bbox, track_id, roi_id, lane_type, estimated_speed_kmh, message,
                snapshot_url, video_url, stream_url, status, raw_event_json, created_at
            ) VALUES (
                :event_id, :camera_id, :camera_name, :event_type, :severity, :timestamp,
                :bbox, :track_id, :roi_id, :lane_type, :estimated_speed_kmh, :message,
                :snapshot_url, :video_url, :stream_url, :status, :raw_event_json, :created_at
            )
            """,
            {
                **event,
                "bbox": json.dumps(event.get("bbox"), ensure_ascii=False)
                if event.get("bbox") is not None
                else None,
            },
        )
    stored = get_event(event["event_id"])
    if stored is None:
        raise RuntimeError("event insert succeeded but the row could not be read back")
    return stored


def list_events(
    *,
    limit: int = 100,
    camera_id: str | None = None,
    event_type: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {"limit": max(1, min(limit, 500))}

    if camera_id:
        clauses.append("camera_id = :camera_id")
        params["camera_id"] = camera_id
    if event_type:
        clauses.append("event_type = :event_type")
        params["event_type"] = event_type.upper()
    if status:
        clauses.append("status = :status")
        params["status"] = status.upper()

    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    query = f"""
        SELECT * FROM events
        {where_sql}
        ORDER BY timestamp DESC, created_at DESC
        LIMIT :limit
    """

    with get_connection() as connection:
        rows = connection.execute(query, params).fetchall()
    return [serialize_event_row(row) for row in rows]


def get_event(event_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM events WHERE event_id = ?",
            (event_id,),
        ).fetchone()
    return serialize_event_row(row) if row else None


def upsert_camera_status(status: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO camera_status (
                camera_id, camera_name, status, stream_url, last_frame_at,
                last_event_at, raw_status_json, updated_at
            ) VALUES (
                :camera_id, :camera_name, :status, :stream_url, :last_frame_at,
                :last_event_at, :raw_status_json, :updated_at
            )
            ON CONFLICT(camera_id) DO UPDATE SET
                camera_name = excluded.camera_name,
                status = excluded.status,
                stream_url = excluded.stream_url,
                last_frame_at = excluded.last_frame_at,
                last_event_at = excluded.last_event_at,
                raw_status_json = excluded.raw_status_json,
                updated_at = excluded.updated_at
            """,
            status,
        )
    stored = get_camera_status(status["camera_id"])
    if stored is None:
        raise RuntimeError("camera status upsert succeeded but the row could not be read back")
    return stored


def list_camera_statuses() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM camera_status ORDER BY camera_id ASC"
        ).fetchall()
    return [serialize_camera_status_row(row) for row in rows]


def get_camera_status(camera_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM camera_status WHERE camera_id = ?",
            (camera_id,),
        ).fetchone()
    return serialize_camera_status_row(row) if row else None


def serialize_event_row(row: sqlite3.Row) -> dict[str, Any]:
    event = dict(row)
    event["bbox"] = json.loads(event["bbox"]) if event.get("bbox") else None
    event["raw_event_json"] = (
        json.loads(event["raw_event_json"]) if event.get("raw_event_json") else {}
    )
    return event


def serialize_camera_status_row(row: sqlite3.Row) -> dict[str, Any]:
    status = dict(row)
    status["raw_status_json"] = (
        json.loads(status["raw_status_json"]) if status.get("raw_status_json") else {}
    )
    return status
