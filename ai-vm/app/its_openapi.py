# 역할: ITS OpenAPI에서 CCTV 목록을 조회하고 실패 시 캐시 fallback을 제공합니다.
import re
from typing import Any

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
from .its_cctv_cache import load_its_cctv_cache, save_its_cctv_cache


_CCTV_NAME_REMOVE_PATTERN = re.compile(r"[\[\]\s_]+")


# ITS API 오류 유형과 상태 코드를 함께 담는 예외입니다.
class ITSOpenAPIError(requests.RequestException):
    # 객체 생성에 필요한 설정값과 내부 상태를 초기화합니다.
    def __init__(
        self,
        message: str,
        *,
        error_type: str = "ITS_API_ERROR",
        status_code: int | None = None,
        result_code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.error_type = error_type
        self.status_code = status_code
        self.result_code = result_code


# normalize_cctv_item 기능을 수행하는 함수입니다.
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


# normalize_cctv_name 기능을 수행하는 함수입니다.
def normalize_cctv_name(name: str | None) -> str:
    return _CCTV_NAME_REMOVE_PATTERN.sub("", name or "").strip().lower()


# _extract_result_code 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _extract_result_code(data: Any) -> str | None:
    if not isinstance(data, dict):
        return None

    for key in ("resultCode", "resultcode"):
        value = data.get(key)
        if value is not None:
            return str(value)

    response = data.get("response")
    if isinstance(response, dict):
        for key in ("resultCode", "resultcode"):
            value = response.get(key)
            if value is not None:
                return str(value)

        header = response.get("header")
        if isinstance(header, dict):
            for key in ("resultCode", "resultcode"):
                value = header.get(key)
                if value is not None:
                    return str(value)

    return None


# _extract_result_message 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _extract_result_message(data: Any) -> str:
    if isinstance(data, dict):
        for key in ("resultMsg", "resultMessage", "message", "msg"):
            value = data.get(key)
            if value:
                return str(value)

        response = data.get("response")
        if isinstance(response, dict):
            for key in ("resultMsg", "resultMessage", "message", "msg"):
                value = response.get(key)
                if value:
                    return str(value)

            header = response.get("header")
            if isinstance(header, dict):
                for key in ("resultMsg", "resultMessage", "message", "msg"):
                    value = header.get(key)
                    if value:
                        return str(value)

    return "ITS API request failed."


# _error_info 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _error_info(
    *,
    error_type: str,
    message: str,
    status_code: int | None = None,
    result_code: str | None = None,
) -> dict[str, Any]:
    return {
        "type": error_type,
        "statusCode": status_code,
        "resultCode": result_code,
        "message": message,
    }


# _error_info_from_status 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _error_info_from_status(status_code: int, result_code: str | None, message: str) -> dict[str, Any]:
    if result_code == "4001":
        error_type = "ITS_QUOTA_EXCEEDED"
    elif status_code == 401:
        error_type = "ITS_UNAUTHORIZED"
    elif status_code >= 500:
        error_type = "ITS_SERVER_ERROR"
    else:
        error_type = "ITS_API_ERROR"

    return _error_info(
        error_type=error_type,
        status_code=status_code,
        result_code=result_code,
        message=message,
    )


# _should_fallback 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _should_fallback(error_info: dict[str, Any]) -> bool:
    status_code = error_info.get("statusCode")
    return (
        status_code == 401
        or error_info.get("resultCode") == "4001"
        or error_info.get("type") in {"ITS_TIMEOUT", "ITS_CONNECTION_ERROR"}
        or (isinstance(status_code, int) and status_code >= 500)
    )


# _cache_response 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _cache_response(error_info: dict[str, Any]) -> dict[str, Any] | None:
    if not _should_fallback(error_info):
        return None

    cached = load_its_cctv_cache()
    if cached is None:
        return None

    return {
        "items": cached["items"],
        "fromCache": True,
        "cacheUpdatedAt": cached["cacheUpdatedAt"],
        "ageSeconds": cached["ageSeconds"],
        "originalError": error_info,
    }


# _raise_safe_request_error 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _raise_safe_request_error(error_info: dict[str, Any]) -> None:
    raise ITSOpenAPIError(
        error_info.get("message") or "ITS API request failed.",
        error_type=error_info.get("type") or "ITS_API_ERROR",
        status_code=error_info.get("statusCode"),
        result_code=error_info.get("resultCode"),
    )


# get_its_cctv_list_response 기능을 수행하는 함수입니다.
def get_its_cctv_list_response(
    min_x: str = ITS_CCTV_DEFAULT_MIN_X,
    max_x: str = ITS_CCTV_DEFAULT_MAX_X,
    min_y: str = ITS_CCTV_DEFAULT_MIN_Y,
    max_y: str = ITS_CCTV_DEFAULT_MAX_Y,
    cctv_type: str = ITS_CCTV_DEFAULT_TYPE,
    road_type: str = ITS_CCTV_DEFAULT_ROAD_TYPE,
) -> dict[str, Any]:
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

    try:
        response = requests.get(ITS_CCTV_API_URL, params=params, timeout=10)
    except requests.Timeout as error:
        error_info = _error_info(error_type="ITS_TIMEOUT", message="ITS API request timed out.")
        cached = _cache_response(error_info)
        if cached is not None:
            return cached
        raise requests.Timeout(error_info["message"]) from error
    except requests.ConnectionError as error:
        error_info = _error_info(error_type="ITS_CONNECTION_ERROR", message="ITS API connection failed.")
        cached = _cache_response(error_info)
        if cached is not None:
            return cached
        raise requests.ConnectionError(error_info["message"]) from error
    except requests.RequestException as error:
        raise requests.RequestException("ITS API request failed.") from error

    try:
        data = response.json()
    except ValueError:
        data = {}

    result_code = _extract_result_code(data)
    result_message = _extract_result_message(data)

    if result_code == "4001" or response.status_code >= 400:
        error_info = _error_info_from_status(response.status_code, result_code, result_message)
        cached = _cache_response(error_info)
        if cached is not None:
            return cached
        _raise_safe_request_error(error_info)

    raw_items = data.get("response", {}).get("data", [])
    if isinstance(raw_items, dict):
        raw_items = [raw_items]

    normalized_items = [normalize_cctv_item(item) for item in raw_items or []]
    cache = save_its_cctv_cache(normalized_items)

    return {
        "items": normalized_items,
        "fromCache": False,
        "cacheUpdatedAt": cache["cacheUpdatedAt"],
        "ageSeconds": 0,
        "originalError": None,
    }


# get_its_cctv_list 기능을 수행하는 함수입니다.
def get_its_cctv_list(
    min_x: str = ITS_CCTV_DEFAULT_MIN_X,
    max_x: str = ITS_CCTV_DEFAULT_MAX_X,
    min_y: str = ITS_CCTV_DEFAULT_MIN_Y,
    max_y: str = ITS_CCTV_DEFAULT_MAX_Y,
    cctv_type: str = ITS_CCTV_DEFAULT_TYPE,
    road_type: str = ITS_CCTV_DEFAULT_ROAD_TYPE,
) -> list[dict]:
    response = get_its_cctv_list_response(
        min_x=min_x,
        max_x=max_x,
        min_y=min_y,
        max_y=max_y,
        cctv_type=cctv_type,
        road_type=road_type,
    )
    return response["items"]


# find_its_cctv_by_name 기능을 수행하는 함수입니다.
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
