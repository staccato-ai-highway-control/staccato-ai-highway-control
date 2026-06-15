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

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: argparse 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import argparse
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: sys 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import sys
# 설명: dataclasses에서 dataclass 이름을 가져와 아래 로직에서 재사용한다.
from dataclasses import dataclass
# 설명: datetime에서 datetime, timedelta 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timedelta
# 설명: pathlib에서 Path 이름을 가져와 아래 로직에서 재사용한다.
from pathlib import Path
# 설명: typing에서 Any 이름을 가져와 아래 로직에서 재사용한다.
from typing import Any


# 설명: `PROJECT_ROOT`에 Path(__file__).resolve().parents[1] 표현식의 계산 결과를 저장한다.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
# 설명: `str(PROJECT_ROOT) not in sys.path` 조건 결과에 따라 실행 경로를 분기한다.
if str(PROJECT_ROOT) not in sys.path:
    # 설명: `sys.path.insert`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    sys.path.insert(0, str(PROJECT_ROOT))

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.models에서 RealtimeEvent 이름을 가져와 아래 로직에서 재사용한다.
from app.models import RealtimeEvent


# 설명: `MEDIA_EXTENSIONS`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
MEDIA_EXTENSIONS = {".mp4", ".jpg", ".jpeg", ".png", ".webm"}


# 설명: `env_int` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def env_int(name: str, default: int) -> int:
    # 설명: `raw`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw = os.getenv(name)
    # 설명: `raw is None or raw == ''` 조건 결과에 따라 실행 경로를 분기한다.
    if raw is None or raw == "":
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: 호출자에게 int(raw) 값을 함수 결과로 반환한다.
        return int(raw)
    except ValueError:
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default


# 설명: `env_float` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def env_float(name: str, default: float) -> float:
    # 설명: `raw`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw = os.getenv(name)
    # 설명: `raw is None or raw == ''` 조건 결과에 따라 실행 경로를 분기한다.
    if raw is None or raw == "":
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: 호출자에게 float(raw) 값을 함수 결과로 반환한다.
        return float(raw)
    except ValueError:
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default


# 설명: `normalize_severity` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def normalize_severity(value: Any) -> str:
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 호출자에게 'UNKNOWN' 값을 함수 결과로 반환한다.
        return "UNKNOWN"
    # 설명: 호출자에게 str(value).strip().upper() 값을 함수 결과로 반환한다.
    return str(value).strip().upper()


# 설명: `is_protected_severity` 함수는 조건의 참/거짓을 판정하는 함수다.
def is_protected_severity(severity: str) -> bool:
    # 설명: `protected`에 {item.strip().upper() for item in os.getenv('EVENT_MEDIA_PROTECTED_SE... 표현식의 계산 결과를 저장한다.
    protected = {
        item.strip().upper()
        for item in os.getenv("EVENT_MEDIA_PROTECTED_SEVERITIES", "HIGH,CRITICAL").split(",")
        if item.strip()
    }
    # 설명: 호출자에게 severity in protected 값을 함수 결과로 반환한다.
    return severity in protected


# 설명: `retention_days_for` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def retention_days_for(severity: str, referenced: bool) -> int:
    # 설명: `not referenced` 조건 결과에 따라 실행 경로를 분기한다.
    if not referenced:
        # 설명: 호출자에게 env_int('EVENT_MEDIA_ORPHAN_RETENTION_DAYS', 3) 값을 함수 결과로 반환한다.
        return env_int("EVENT_MEDIA_ORPHAN_RETENTION_DAYS", 3)

    # 설명: `severity`에 `normalize_severity` 호출 결과를 저장해 다음 처리에서 사용한다.
    severity = normalize_severity(severity)

    # 설명: `severity == 'CRITICAL'` 조건 결과에 따라 실행 경로를 분기한다.
    if severity == "CRITICAL":
        # 설명: 호출자에게 env_int('EVENT_MEDIA_CRITICAL_RETENTION_DAYS', 3650) 값을 함수 결과로 반환한다.
        return env_int("EVENT_MEDIA_CRITICAL_RETENTION_DAYS", 3650)
    # 설명: `severity == 'HIGH'` 조건 결과에 따라 실행 경로를 분기한다.
    if severity == "HIGH":
        # 설명: 호출자에게 env_int('EVENT_MEDIA_HIGH_RETENTION_DAYS', 3650) 값을 함수 결과로 반환한다.
        return env_int("EVENT_MEDIA_HIGH_RETENTION_DAYS", 3650)
    # 설명: `severity == 'MEDIUM'` 조건 결과에 따라 실행 경로를 분기한다.
    if severity == "MEDIUM":
        # 설명: 호출자에게 env_int('EVENT_MEDIA_MEDIUM_RETENTION_DAYS', 14) 값을 함수 결과로 반환한다.
        return env_int("EVENT_MEDIA_MEDIUM_RETENTION_DAYS", 14)
    # 설명: `severity in {'LOW', 'INFO', 'NORMAL'}` 조건 결과에 따라 실행 경로를 분기한다.
    if severity in {"LOW", "INFO", "NORMAL"}:
        # 설명: 호출자에게 env_int('EVENT_MEDIA_LOW_RETENTION_DAYS', 3) 값을 함수 결과로 반환한다.
        return env_int("EVENT_MEDIA_LOW_RETENTION_DAYS", 3)

    # 설명: 호출자에게 env_int('EVENT_MEDIA_UNKNOWN_RETENTION_DAYS', 3) 값을 함수 결과로 반환한다.
    return env_int("EVENT_MEDIA_UNKNOWN_RETENTION_DAYS", 3)


# 설명: `to_storage_relative` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def to_storage_relative(path_value: str | None) -> str | None:
    # 설명: `not path_value` 조건 결과에 따라 실행 경로를 분기한다.
    if not path_value:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `value`에 `path_value.strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    value = path_value.strip()
    # 설명: `not value` 조건 결과에 따라 실행 경로를 분기한다.
    if not value:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `value.startswith('/storage/')` 조건 결과에 따라 실행 경로를 분기한다.
    if value.startswith("/storage/"):
        # 설명: 호출자에게 value.removeprefix('/storage/') 값을 함수 결과로 반환한다.
        return value.removeprefix("/storage/")

    # 이미 relative path인 경우도 허용
    if value.startswith("generated/"):
        # 설명: 호출자에게 value 값을 함수 결과로 반환한다.
        return value

    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None


# 설명: `get_payload` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_payload(event: RealtimeEvent) -> dict[str, Any]:
    # 설명: `payload`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = getattr(event, "payload", None)
    # 설명: 호출자에게 payload if isinstance(payload, dict) else {} 값을 함수 결과로 반환한다.
    return payload if isinstance(payload, dict) else {}


# 설명: `get_event_severity` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_event_severity(event: RealtimeEvent) -> str:
    # 설명: `payload`에 `get_payload` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = get_payload(event)
    # 설명: 호출자에게 normalize_severity(payload.get('severity') or payload.get('risk_level') or payl... 값을 함수 결과로 반환한다.
    return normalize_severity(
        payload.get("severity")
        or payload.get("risk_level")
        or payload.get("riskLevel")
        or payload.get("priority")
    )


# 설명: `iter_referenced_media` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def iter_referenced_media(storage_root: Path) -> dict[Path, str]:
    # 설명: `references`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    references: dict[Path, str] = {}

    # 설명: `events`에 `RealtimeEvent.query.order_by(RealtimeEvent.created_at.desc()).all` 호출 결과를 저장해 다음 처리에서 사용한다.
    events = RealtimeEvent.query.order_by(RealtimeEvent.created_at.desc()).all()
    # 설명: `events`의 각 항목을 `event`로 받아 반복 처리한다.
    for event in events:
        # 설명: `payload`에 `get_payload` 호출 결과를 저장해 다음 처리에서 사용한다.
        payload = get_payload(event)
        # 설명: `severity`에 `get_event_severity` 호출 결과를 저장해 다음 처리에서 사용한다.
        severity = get_event_severity(event)

        # 설명: `('clip_path', 'snapshot_path', 'video_url', 'snapshot_url')`의 각 항목을 `key`로 받아 반복 처리한다.
        for key in ("clip_path", "snapshot_path", "video_url", "snapshot_url"):
            # 설명: `relative`에 `to_storage_relative` 호출 결과를 저장해 다음 처리에서 사용한다.
            relative = to_storage_relative(payload.get(key))
            # 설명: `not relative` 조건 결과에 따라 실행 경로를 분기한다.
            if not relative:
                # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                continue

            # 설명: `references[(storage_root / relative).resolve()]`에 severity 표현식의 계산 결과를 저장한다.
            references[(storage_root / relative).resolve()] = severity

    # 설명: 호출자에게 references 값을 함수 결과로 반환한다.
    return references


# 설명: `MediaFile` 클래스를 정의하고 기본 object의 동작 또는 계약을 확장한다.
@dataclass
class MediaFile:
    # 설명: `path`에 NoneType 표현식의 계산 결과를 저장한다.
    path: Path
    # 설명: `size`에 NoneType 표현식의 계산 결과를 저장한다.
    size: int
    # 설명: `mtime`에 NoneType 표현식의 계산 결과를 저장한다.
    mtime: datetime
    # 설명: `severity`에 NoneType 표현식의 계산 결과를 저장한다.
    severity: str
    # 설명: `referenced`에 NoneType 표현식의 계산 결과를 저장한다.
    referenced: bool
    # 설명: `protected`에 NoneType 표현식의 계산 결과를 저장한다.
    protected: bool


# 설명: `scan_media` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def scan_media(storage_root: Path, references: dict[Path, str]) -> list[MediaFile]:
    # 설명: `media_dir`에 storage_root / 'generated' / 'incidents' 표현식의 계산 결과를 저장한다.
    media_dir = storage_root / "generated" / "incidents"

    # 설명: `not media_dir.exists()` 조건 결과에 따라 실행 경로를 분기한다.
    if not media_dir.exists():
        # 설명: 호출자에게 [] 값을 함수 결과로 반환한다.
        return []

    # 설명: `files`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    files: list[MediaFile] = []
    # 설명: `media_dir.rglob('*')`의 각 항목을 `path`로 받아 반복 처리한다.
    for path in media_dir.rglob("*"):
        # 설명: `not path.is_file()` 조건 결과에 따라 실행 경로를 분기한다.
        if not path.is_file():
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue
        # 설명: `path.suffix.lower() not in MEDIA_EXTENSIONS` 조건 결과에 따라 실행 경로를 분기한다.
        if path.suffix.lower() not in MEDIA_EXTENSIONS:
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue

        # 설명: `resolved`에 `path.resolve` 호출 결과를 저장해 다음 처리에서 사용한다.
        resolved = path.resolve()
        # 설명: `severity`에 `references.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        severity = references.get(resolved, "UNKNOWN")
        # 설명: `referenced`에 resolved in references 표현식의 계산 결과를 저장한다.
        referenced = resolved in references
        # 설명: `stat`에 `path.stat` 호출 결과를 저장해 다음 처리에서 사용한다.
        stat = path.stat()

        # 설명: `files.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
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

    # 설명: 호출자에게 files 값을 함수 결과로 반환한다.
    return files


# 설명: `delete_file` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
def delete_file(media: MediaFile, dry_run: bool, reason: str) -> bool:
    # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    print(
        f"{'[DRY-RUN]' if dry_run else '[DELETE]'} "
        f"{media.path} size={media.size} severity={media.severity} "
        f"referenced={media.referenced} protected={media.protected} reason={reason}"
    )

    # 설명: `dry_run` 조건 결과에 따라 실행 경로를 분기한다.
    if dry_run:
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `media.path.unlink`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        media.path.unlink()
        # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
        return True
    except FileNotFoundError:
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False


# 설명: `cleanup_by_age` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def cleanup_by_age(files: list[MediaFile], dry_run: bool) -> int:
    # 설명: `now`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = datetime.now()
    # 설명: `deleted`의 기준값 또는 기본값을 0로 설정한다.
    deleted = 0

    # 설명: `files`의 각 항목을 `media`로 받아 반복 처리한다.
    for media in files:
        # 설명: `media.protected` 조건 결과에 따라 실행 경로를 분기한다.
        if media.protected:
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue

        # 설명: `days`에 `retention_days_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        days = retention_days_for(media.severity, media.referenced)
        # 설명: `expire_at`에 media.mtime + timedelta(days=days) 표현식의 계산 결과를 저장한다.
        expire_at = media.mtime + timedelta(days=days)

        # 설명: `now >= expire_at` 조건 결과에 따라 실행 경로를 분기한다.
        if now >= expire_at:
            # 설명: `delete_file(media, dry_run, f'age>{days}d')` 조건 결과에 따라 실행 경로를 분기한다.
            if delete_file(media, dry_run, f"age>{days}d"):
                # 설명: `deleted`의 기준값 또는 기본값을 1로 설정한다.
                deleted += 1

    # 설명: 호출자에게 deleted 값을 함수 결과로 반환한다.
    return deleted


# 설명: `cleanup_by_capacity` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def cleanup_by_capacity(files: list[MediaFile], storage_root: Path, dry_run: bool) -> int:
    # 설명: `max_gb`에 `env_float` 호출 결과를 저장해 다음 처리에서 사용한다.
    max_gb = env_float("EVENT_MEDIA_MAX_GB", 20.0)
    # 설명: `max_bytes`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
    max_bytes = int(max_gb * 1024 * 1024 * 1024)

    # 설명: `current_files`에 [media for media in files if media.path.exists()] 표현식의 계산 결과를 저장한다.
    current_files = [media for media in files if media.path.exists()]
    # 설명: `total`에 `sum` 호출 결과를 저장해 다음 처리에서 사용한다.
    total = sum(media.size for media in current_files)

    # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    print(f"[INFO] storage_root={storage_root}")
    # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    print(f"[INFO] media_total_bytes={total}")
    # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    print(f"[INFO] media_max_bytes={max_bytes}")

    # 설명: `total <= max_bytes` 조건 결과에 따라 실행 경로를 분기한다.
    if total <= max_bytes:
        # 설명: 호출자에게 0 값을 함수 결과로 반환한다.
        return 0

    # 설명: `allow_delete_protected`에 os.getenv('EVENT_MEDIA_ALLOW_DELETE_PROTECTED', 'false').lower() == '... 표현식의 계산 결과를 저장한다.
    allow_delete_protected = os.getenv("EVENT_MEDIA_ALLOW_DELETE_PROTECTED", "false").lower() == "true"

    # 설명: `candidates`에 [media for media in current_files if allow_delete_protected or not me... 표현식의 계산 결과를 저장한다.
    candidates = [
        media
        for media in current_files
        if allow_delete_protected or not media.protected
    ]

    # 오래된 파일부터 삭제. 보호 파일은 기본적으로 제외.
    candidates.sort(key=lambda media: media.mtime)

    # 설명: `deleted`의 기준값 또는 기본값을 0로 설정한다.
    deleted = 0
    # 설명: `candidates`의 각 항목을 `media`로 받아 반복 처리한다.
    for media in candidates:
        # 설명: `total <= max_bytes` 조건 결과에 따라 실행 경로를 분기한다.
        if total <= max_bytes:
            # 설명: 필요한 조건을 충족했으므로 현재 반복문을 즉시 종료한다.
            break

        # 설명: `delete_file(media, dry_run, f'capacity>{max_gb}GB')` 조건 결과에 따라 실행 경로를 분기한다.
        if delete_file(media, dry_run, f"capacity>{max_gb}GB"):
            # 설명: `total`에 media.size 표현식의 계산 결과를 저장한다.
            total -= media.size
            # 설명: `deleted`의 기준값 또는 기본값을 1로 설정한다.
            deleted += 1

    # 설명: 호출자에게 deleted 값을 함수 결과로 반환한다.
    return deleted


# 설명: `main` 함수는 명령행 실행 흐름을 시작하는 함수다.
def main() -> int:
    # 설명: `parser`에 `argparse.ArgumentParser` 호출 결과를 저장해 다음 처리에서 사용한다.
    parser = argparse.ArgumentParser()
    # 설명: `parser.add_argument`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    parser.add_argument("--dry-run", action="store_true", help="Print what would be deleted without deleting files.")
    # 설명: `args`에 `parser.parse_args` 호출 결과를 저장해 다음 처리에서 사용한다.
    args = parser.parse_args()

    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app()

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `storage_root`에 `Path(os.getenv('STORAGE_ROOT') or app.config.get('STORAGE_ROOT') or...` 호출 결과를 저장해 다음 처리에서 사용한다.
        storage_root = Path(
            os.getenv("STORAGE_ROOT")
            or app.config.get("STORAGE_ROOT")
            or Path(app.root_path).parent / "storage"
        ).resolve()

        # 설명: `references`에 `iter_referenced_media` 호출 결과를 저장해 다음 처리에서 사용한다.
        references = iter_referenced_media(storage_root)
        # 설명: `files`에 `scan_media` 호출 결과를 저장해 다음 처리에서 사용한다.
        files = scan_media(storage_root, references)

        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"[INFO] referenced_media={len(references)}")
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"[INFO] scanned_files={len(files)}")

        # 설명: `deleted_by_age`에 `cleanup_by_age` 호출 결과를 저장해 다음 처리에서 사용한다.
        deleted_by_age = cleanup_by_age(files, args.dry_run)
        # 설명: `deleted_by_capacity`에 `cleanup_by_capacity` 호출 결과를 저장해 다음 처리에서 사용한다.
        deleted_by_capacity = cleanup_by_capacity(files, storage_root, args.dry_run)

        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"[INFO] deleted_by_age={deleted_by_age}")
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"[INFO] deleted_by_capacity={deleted_by_capacity}")

    # 설명: 호출자에게 0 값을 함수 결과로 반환한다.
    return 0


# 설명: `__name__ == '__main__'` 조건 결과에 따라 실행 경로를 분기한다.
if __name__ == "__main__":
    # 설명: 현재 처리를 중단하고 SystemExit(main())를 호출자에게 전달한다.
    raise SystemExit(main())
