#!/usr/bin/env python3
"""
Clean up generated incident media files.

Policy:
- Run every 3 days by systemd timer.
- Keep HIGH / CRITICAL media unless emergency deletion is explicitly allowed.
- Delete LOW / INFO / NORMAL media after a short retention period.
- Delete orphan files that are not referenced by RealtimeEvent after orphan retention.
- Enforce max storage size by deleting oldest non-protected files first.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app import create_app
from app.models import RealtimeEvent


MEDIA_EXTENSIONS = {".mp4", ".jpg", ".jpeg", ".png", ".webm"}


def env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def normalize_severity(value: Any) -> str:
    if value is None:
        return "UNKNOWN"
    return str(value).strip().upper()


def is_protected_severity(severity: str) -> bool:
    protected = {
        item.strip().upper()
        for item in os.getenv("EVENT_MEDIA_PROTECTED_SEVERITIES", "HIGH,CRITICAL").split(",")
        if item.strip()
    }
    return severity in protected


def retention_days_for(severity: str, referenced: bool) -> int:
    if not referenced:
        return env_int("EVENT_MEDIA_ORPHAN_RETENTION_DAYS", 3)

    severity = normalize_severity(severity)

    if severity == "CRITICAL":
        return env_int("EVENT_MEDIA_CRITICAL_RETENTION_DAYS", 3650)
    if severity == "HIGH":
        return env_int("EVENT_MEDIA_HIGH_RETENTION_DAYS", 3650)
    if severity == "MEDIUM":
        return env_int("EVENT_MEDIA_MEDIUM_RETENTION_DAYS", 14)
    if severity in {"LOW", "INFO", "NORMAL"}:
        return env_int("EVENT_MEDIA_LOW_RETENTION_DAYS", 3)

    return env_int("EVENT_MEDIA_UNKNOWN_RETENTION_DAYS", 3)


def to_storage_relative(path_value: str | None) -> str | None:
    if not path_value:
        return None

    value = path_value.strip()
    if not value:
        return None

    if value.startswith("/storage/"):
        return value.removeprefix("/storage/")

    # 이미 relative path인 경우도 허용
    if value.startswith("generated/"):
        return value

    return None


def get_payload(event: RealtimeEvent) -> dict[str, Any]:
    payload = getattr(event, "payload", None)
    return payload if isinstance(payload, dict) else {}


def get_event_severity(event: RealtimeEvent) -> str:
    payload = get_payload(event)
    return normalize_severity(
        payload.get("severity")
        or payload.get("risk_level")
        or payload.get("riskLevel")
        or payload.get("priority")
    )


def iter_referenced_media(storage_root: Path) -> dict[Path, str]:
    references: dict[Path, str] = {}

    events = RealtimeEvent.query.order_by(RealtimeEvent.created_at.desc()).all()
    for event in events:
        payload = get_payload(event)
        severity = get_event_severity(event)

        for key in ("clip_path", "snapshot_path", "video_url", "snapshot_url"):
            relative = to_storage_relative(payload.get(key))
            if not relative:
                continue

            references[(storage_root / relative).resolve()] = severity

    return references


@dataclass
class MediaFile:
    path: Path
    size: int
    mtime: datetime
    severity: str
    referenced: bool
    protected: bool


def scan_media(storage_root: Path, references: dict[Path, str]) -> list[MediaFile]:
    media_dir = storage_root / "generated" / "incidents"

    if not media_dir.exists():
        return []

    files: list[MediaFile] = []
    for path in media_dir.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in MEDIA_EXTENSIONS:
            continue

        resolved = path.resolve()
        severity = references.get(resolved, "UNKNOWN")
        referenced = resolved in references
        stat = path.stat()

        files.append(
            MediaFile(
                path=path,
                size=stat.st_size,
                mtime=datetime.fromtimestamp(stat.st_mtime),
                severity=normalize_severity(severity),
                referenced=referenced,
                protected=referenced and is_protected_severity(severity),
            )
        )

    return files


def delete_file(media: MediaFile, dry_run: bool, reason: str) -> bool:
    print(
        f"{'[DRY-RUN]' if dry_run else '[DELETE]'} "
        f"{media.path} size={media.size} severity={media.severity} "
        f"referenced={media.referenced} protected={media.protected} reason={reason}"
    )

    if dry_run:
        return False

    try:
        media.path.unlink()
        return True
    except FileNotFoundError:
        return False


def cleanup_by_age(files: list[MediaFile], dry_run: bool) -> int:
    now = datetime.now()
    deleted = 0

    for media in files:
        if media.protected:
            continue

        days = retention_days_for(media.severity, media.referenced)
        expire_at = media.mtime + timedelta(days=days)

        if now >= expire_at:
            if delete_file(media, dry_run, f"age>{days}d"):
                deleted += 1

    return deleted


def cleanup_by_capacity(files: list[MediaFile], storage_root: Path, dry_run: bool) -> int:
    max_gb = env_float("EVENT_MEDIA_MAX_GB", 20.0)
    max_bytes = int(max_gb * 1024 * 1024 * 1024)

    current_files = [media for media in files if media.path.exists()]
    total = sum(media.size for media in current_files)

    print(f"[INFO] storage_root={storage_root}")
    print(f"[INFO] media_total_bytes={total}")
    print(f"[INFO] media_max_bytes={max_bytes}")

    if total <= max_bytes:
        return 0

    allow_delete_protected = os.getenv("EVENT_MEDIA_ALLOW_DELETE_PROTECTED", "false").lower() == "true"

    candidates = [
        media
        for media in current_files
        if allow_delete_protected or not media.protected
    ]

    # 오래된 파일부터 삭제. 보호 파일은 기본적으로 제외.
    candidates.sort(key=lambda media: media.mtime)

    deleted = 0
    for media in candidates:
        if total <= max_bytes:
            break

        if delete_file(media, dry_run, f"capacity>{max_gb}GB"):
            total -= media.size
            deleted += 1

    return deleted


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print what would be deleted without deleting files.")
    args = parser.parse_args()

    app = create_app()

    with app.app_context():
        storage_root = Path(
            os.getenv("STORAGE_ROOT")
            or app.config.get("STORAGE_ROOT")
            or Path(app.root_path).parent / "storage"
        ).resolve()

        references = iter_referenced_media(storage_root)
        files = scan_media(storage_root, references)

        print(f"[INFO] referenced_media={len(references)}")
        print(f"[INFO] scanned_files={len(files)}")

        deleted_by_age = cleanup_by_age(files, args.dry_run)
        deleted_by_capacity = cleanup_by_capacity(files, storage_root, args.dry_run)

        print(f"[INFO] deleted_by_age={deleted_by_age}")
        print(f"[INFO] deleted_by_capacity={deleted_by_capacity}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
