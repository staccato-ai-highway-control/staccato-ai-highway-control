import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import (
    ITS_CCTV_ALLOW_STALE_CACHE,
    ITS_CCTV_CACHE_PATH,
    ITS_CCTV_CACHE_TTL_SECONDS,
    ITS_CCTV_STALE_MAX_AGE_SECONDS,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _format_timestamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_timestamp(value: str) -> datetime | None:
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def _age_seconds(updated_at: str, now: datetime | None = None) -> int | None:
    parsed = _parse_timestamp(updated_at)
    if parsed is None:
        return None

    age = ((now or _utc_now()) - parsed).total_seconds()
    return max(0, int(age))


def save_its_cctv_cache(
    items: list[dict[str, Any]],
    cache_path: Path | str = ITS_CCTV_CACHE_PATH,
) -> dict[str, Any]:
    path = Path(cache_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    cache_updated_at = _format_timestamp(_utc_now())
    payload = {
        "cacheUpdatedAt": cache_updated_at,
        "count": len(items),
        "items": items,
    }

    temp_path = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    with temp_path.open("w", encoding="utf-8") as cache_file:
        json.dump(payload, cache_file, ensure_ascii=False, separators=(",", ":"))
    os.replace(temp_path, path)

    return {
        "cacheUpdatedAt": cache_updated_at,
        "ageSeconds": 0,
        "isExpired": False,
        "isStaleAllowed": True,
        "items": items,
    }


def is_cache_expired(age_seconds: int | None, ttl_seconds: int = ITS_CCTV_CACHE_TTL_SECONDS) -> bool:
    if age_seconds is None:
        return True
    return age_seconds > ttl_seconds


def is_stale_cache_allowed(
    age_seconds: int | None,
    *,
    allow_stale: bool = ITS_CCTV_ALLOW_STALE_CACHE,
    stale_max_age_seconds: int = ITS_CCTV_STALE_MAX_AGE_SECONDS,
) -> bool:
    if age_seconds is None or not allow_stale:
        return False
    return age_seconds <= stale_max_age_seconds


def load_its_cctv_cache(
    cache_path: Path | str = ITS_CCTV_CACHE_PATH,
    *,
    allow_stale: bool = ITS_CCTV_ALLOW_STALE_CACHE,
    ttl_seconds: int = ITS_CCTV_CACHE_TTL_SECONDS,
    stale_max_age_seconds: int = ITS_CCTV_STALE_MAX_AGE_SECONDS,
) -> dict[str, Any] | None:
    path = Path(cache_path)
    if not path.exists():
        return None

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    items = payload.get("items")
    cache_updated_at = payload.get("cacheUpdatedAt")
    if not isinstance(items, list) or not isinstance(cache_updated_at, str):
        return None

    age_seconds = _age_seconds(cache_updated_at)
    is_expired = is_cache_expired(age_seconds, ttl_seconds)
    is_stale_allowed = is_stale_cache_allowed(
        age_seconds,
        allow_stale=allow_stale,
        stale_max_age_seconds=stale_max_age_seconds,
    )
    if is_expired and not is_stale_allowed:
        return None

    return {
        "cacheUpdatedAt": cache_updated_at,
        "ageSeconds": age_seconds,
        "isExpired": is_expired,
        "isStaleAllowed": is_stale_allowed,
        "items": items,
    }
