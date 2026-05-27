import re

import requests

from .config import (
    ITS_API_KEY,
    ITS_CCTV_API_URL,
    ITS_CCTV_DEFAULT_MAX_X,
    ITS_CCTV_DEFAULT_MAX_Y,
    ITS_CCTV_DEFAULT_MIN_X,
    ITS_CCTV_DEFAULT_MIN_Y,
    ITS_CCTV_DEFAULT_ROAD_TYPE,
    ITS_CCTV_DEFAULT_TYPE,
)


_CCTV_NAME_REMOVE_PATTERN = re.compile(r"[\[\]\s_]+")


def normalize_cctv_item(item: dict) -> dict:
    return {
        "name": item.get("cctvname", ""),
        "url": item.get("cctvurl") or item.get("url") or "",
        "format": item.get("cctvformat", ""),
        "type": item.get("cctvtype", ""),
        "resolution": item.get("cctvresolution", ""),
        "road_section_id": item.get("roadsectionid", ""),
        "coordx": item.get("coordx", ""),
        "coordy": item.get("coordy", ""),
        "file_create_time": item.get("filecreatetime", ""),
    }


def normalize_cctv_name(name: str | None) -> str:
    return _CCTV_NAME_REMOVE_PATTERN.sub("", name or "").strip().lower()


def get_its_cctv_list(
    min_x: str = ITS_CCTV_DEFAULT_MIN_X,
    max_x: str = ITS_CCTV_DEFAULT_MAX_X,
    min_y: str = ITS_CCTV_DEFAULT_MIN_Y,
    max_y: str = ITS_CCTV_DEFAULT_MAX_Y,
    cctv_type: str = ITS_CCTV_DEFAULT_TYPE,
    road_type: str = ITS_CCTV_DEFAULT_ROAD_TYPE,
) -> list[dict]:
    if not ITS_API_KEY:
        raise ValueError("ITS_API_KEY is not configured.")

    clean_road_type = road_type.strip().lower()
    if clean_road_type not in {"ex", "its", "all"}:
        raise ValueError("roadType must be one of: ex, its, all.")

    params = {
        "apiKey": ITS_API_KEY,
        "type": clean_road_type,
        "cctvType": cctv_type,
        "minX": min_x,
        "maxX": max_x,
        "minY": min_y,
        "maxY": max_y,
        "getType": "json",
    }

    response = requests.get(ITS_CCTV_API_URL, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()
    raw_items = data.get("response", {}).get("data", [])
    if isinstance(raw_items, dict):
        raw_items = [raw_items]

    return [normalize_cctv_item(item) for item in raw_items or []]


def find_its_cctv_by_name(
    name: str,
    *,
    min_x: str = ITS_CCTV_DEFAULT_MIN_X,
    max_x: str = ITS_CCTV_DEFAULT_MAX_X,
    min_y: str = ITS_CCTV_DEFAULT_MIN_Y,
    max_y: str = ITS_CCTV_DEFAULT_MAX_Y,
    cctv_type: str = ITS_CCTV_DEFAULT_TYPE,
    road_type: str = ITS_CCTV_DEFAULT_ROAD_TYPE,
) -> dict | None:
    target_name = normalize_cctv_name(name)
    if not target_name:
        return None

    cctvs = get_its_cctv_list(
        min_x=min_x,
        max_x=max_x,
        min_y=min_y,
        max_y=max_y,
        cctv_type=cctv_type,
        road_type=road_type,
    )

    for cctv in cctvs:
        if normalize_cctv_name(cctv.get("name")) == target_name:
            return cctv

    for cctv in cctvs:
        cctv_name = normalize_cctv_name(cctv.get("name"))
        if target_name in cctv_name or cctv_name in target_name:
            return cctv

    return None
