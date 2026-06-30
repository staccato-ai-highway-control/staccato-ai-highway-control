"""cctv 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: datetime에서 date, datetime 이름을 가져와 아래 로직에서 재사용한다.
from datetime import date, datetime
# 설명: decimal에서 Decimal, InvalidOperation 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal, InvalidOperation
# 설명: json 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import json
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: urllib.error 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import urllib.error
# 설명: urllib.parse 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import urllib.parse
# 설명: urllib.request 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import urllib.request

# 설명: requests 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import requests as http_requests

# 설명: flask에서 Blueprint, current_app, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, current_app, jsonify, request

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 Cctv, CctvRoi, CctvSlot, CctvStatusLog 이름을 가져와 아래 로직에서 재사용한다.
from app.models import Cctv, CctvRoi, CctvSlot, CctvStatusLog
from app.models.auth_models import SecurityLog
from app.utils.security import require_auth, require_roles


# 설명: `cctv_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
cctv_bp = Blueprint("cctv", __name__, url_prefix="/api")


# 설명: `CCTV_WRITE_FIELDS`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
CCTV_WRITE_FIELDS = {
    "cctv_code",
    "cctv_name",
    "stream_url",
    "location_name",
    "road_name",
    "direction",
    "latitude",
    "longitude",
    "is_active",
    "installed_at",
}

CCTV_ADMIN_ROLES = ("SUPER_ADMIN", "ADMIN", "CONTROL_ADMIN", "CONTROL_CENTER")
CCTV_DELETE_ROLES = ("SUPER_ADMIN", "ADMIN")
VALID_ROI_TYPES = {"DRIVING_LANE", "SHOULDER", "IGNORE_ZONE"}
ROI_MIN_POINTS = 3
ROI_MAX_COORDINATE = Decimal("10000")
MANUAL_EVENT_ALLOWED_FIELDS = {"event_type", "source", "memo", "reason", "severity"}
MANUAL_EVENT_TYPES = {
    "MANUAL",
    "MANUAL_EVENT",
    "LANE_STOP",
    "SHOULDER_STOP",
    "ACCIDENT",
    "CONGESTION",
    "FALLEN_OBJECT",
    "UNKNOWN",
}
MANUAL_EVENT_SOURCES = {"WEB", "ADMIN", "CONTROL_CENTER", "MANUAL"}


# 설명: `_parse_is_active` 함수는 외부 입력을 내부 타입으로 해석하는 함수다.
def _parse_is_active(raw_value):
    # 설명: `raw_value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if raw_value is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `text`에 `str(raw_value).strip().lower` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = str(raw_value).strip().lower()
    # 설명: `text in {'1', 'true', 'yes'}` 조건 결과에 따라 실행 경로를 분기한다.
    if text in {"1", "true", "yes"}:
        # 설명: 호출자에게 1 값을 함수 결과로 반환한다.
        return 1
    # 설명: `text in {'0', 'false', 'no'}` 조건 결과에 따라 실행 경로를 분기한다.
    if text in {"0", "false", "no"}:
        # 설명: 호출자에게 0 값을 함수 결과로 반환한다.
        return 0
    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None


# 설명: `_utc_now_naive` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _utc_now_naive() -> datetime:
    # 설명: 호출자에게 datetime.utcnow().replace(microsecond=0) 값을 함수 결과로 반환한다.
    return datetime.utcnow().replace(microsecond=0)


# 설명: `_clean_string` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _clean_string(value):
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `text`에 `str(value).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = str(value).strip()
    # 설명: 호출자에게 text or None 값을 함수 결과로 반환한다.
    return text or None


# 설명: `_parse_decimal` 함수는 외부 입력을 내부 타입으로 해석하는 함수다.
def _parse_decimal(value, field_name: str):
    # 설명: `value in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
    if value in (None, ""):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: 호출자에게 Decimal(str(value)) 값을 함수 결과로 반환한다.
        return Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        # 설명: 현재 처리를 중단하고 ValueError(f'{field_name} must be a number.')를 호출자에게 전달한다.
        raise ValueError(f"{field_name} must be a number.") from exc


# 설명: `_parse_date` 함수는 외부 입력을 내부 타입으로 해석하는 함수다.
def _parse_date(value, field_name: str):
    # 설명: `value in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
    if value in (None, ""):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `isinstance(value, date)` 조건 결과에 따라 실행 경로를 분기한다.
    if isinstance(value, date):
        # 설명: 호출자에게 value 값을 함수 결과로 반환한다.
        return value

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: 호출자에게 date.fromisoformat(str(value).strip()) 값을 함수 결과로 반환한다.
        return date.fromisoformat(str(value).strip())
    except ValueError as exc:
        # 설명: 현재 처리를 중단하고 ValueError(f'{field_name} must be YYYY-MM-DD.')를 호출자에게 전달한다.
        raise ValueError(f"{field_name} must be YYYY-MM-DD.") from exc


def _current_user_id():
    user = getattr(request, "current_user", None)
    return getattr(user, "id", None)


def _add_security_log(action_type: str, target_type: str, target_id: int, message: dict) -> None:
    db.session.add(SecurityLog(
        actor_user_id=_current_user_id(),
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get("User-Agent"),
        log_message=json.dumps(message, ensure_ascii=False, sort_keys=True),
        created_at=_utc_now_naive(),
    ))


def _parse_roi_coordinate(value, field_name: str) -> float:
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be a number.")

    try:
        coordinate = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"{field_name} must be a number.") from exc

    if coordinate < 0 or coordinate > ROI_MAX_COORDINATE:
        raise ValueError(f"{field_name} must be between 0 and {ROI_MAX_COORDINATE}.")

    return float(coordinate)


def _validate_roi_polygon(polygon_json):
    if not isinstance(polygon_json, list) or not polygon_json:
        raise ValueError("polygon_json must be a non-empty list of coordinate pairs.")

    if len(polygon_json) < ROI_MIN_POINTS:
        raise ValueError(f"polygon_json must contain at least {ROI_MIN_POINTS} points.")

    validated = []
    for index, point in enumerate(polygon_json):
        if isinstance(point, dict):
            x = point.get("x")
            y = point.get("y")
            validated.append({
                "x": _parse_roi_coordinate(x, f"polygon_json[{index}].x"),
                "y": _parse_roi_coordinate(y, f"polygon_json[{index}].y"),
            })
        elif isinstance(point, list) and len(point) >= 2:
            validated.append([
                _parse_roi_coordinate(point[0], f"polygon_json[{index}][0]"),
                _parse_roi_coordinate(point[1], f"polygon_json[{index}][1]"),
            ])
        else:
            raise ValueError("Each polygon point must be an object with x/y or a coordinate pair.")

    return validated


def _build_manual_event_payload(cctv: Cctv, body: dict) -> dict:
    event_type = str(body.get("event_type") or "MANUAL_EVENT").strip().upper()
    source = str(body.get("source") or "WEB").strip().upper()

    if event_type not in MANUAL_EVENT_TYPES:
        raise ValueError(f"Invalid event_type. Must be one of {sorted(MANUAL_EVENT_TYPES)}.")
    if source not in MANUAL_EVENT_SOURCES:
        raise ValueError(f"Invalid source. Must be one of {sorted(MANUAL_EVENT_SOURCES)}.")

    payload = {
        "camera_id": cctv.cctv_code,
        "source_url": cctv.stream_url or "",
        "name": cctv.cctv_name,
        "event_type": event_type,
        "source": source,
    }

    for field in MANUAL_EVENT_ALLOWED_FIELDS - {"event_type", "source"}:
        if field in body and body[field] is not None:
            payload[field] = body[field]

    return payload


# 설명: `_bool_to_int` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _bool_to_int(value, field_name: str = "is_active"):
    # 설명: `parsed`에 `_parse_is_active` 호출 결과를 저장해 다음 처리에서 사용한다.
    parsed = _parse_is_active(value)
    # 설명: `parsed is None and value is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if parsed is None and value is not None:
        # 설명: 현재 처리를 중단하고 ValueError(f'{field_name} must be 1/0 or true/false.')를 호출자에게 전달한다.
        raise ValueError(f"{field_name} must be 1/0 or true/false.")
    # 설명: 호출자에게 parsed 값을 함수 결과로 반환한다.
    return parsed


# 설명: `_serialize_cctv` 함수는 내부 객체를 응답 가능한 구조로 직렬화하는 함수다.
def _serialize_cctv(item: Cctv) -> dict:
    # 설명: `data`에 `item.to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
    data = item.to_dict()
    # 설명: `data.update`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    data.update({
        "camera_id": item.cctv_code,
        "camera_name": item.cctv_name,
        "name": item.cctv_name,
        "status": "ACTIVE" if item.is_active else "INACTIVE",
        "active": bool(item.is_active),
    })
    # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
    return data


# 설명: `_serialize_roi` 함수는 내부 객체를 응답 가능한 구조로 직렬화하는 함수다.
def _serialize_roi(item: CctvRoi) -> dict:
    # 설명: `data`에 `item.to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
    data = item.to_dict()
    # 설명: `data.update`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    data.update({
        "roi_id": item.id,
        "points": item.polygon_json,
        "polygon": item.polygon_json,
        "active": bool(item.is_active),
    })
    # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
    return data


# 설명: `_latest_status_log` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _latest_status_log(cctv_id: int):
    # 설명: 호출자에게 CctvStatusLog.query.filter(CctvStatusLog.cctv_id == cctv_id).order_by(CctvStatu... 값을 함수 결과로 반환한다.
    return (
        CctvStatusLog.query
        .filter(CctvStatusLog.cctv_id == cctv_id)
        .order_by(CctvStatusLog.checked_at.desc(), CctvStatusLog.id.desc())
        .first()
    )


# 설명: `_serialize_stream_status` 함수는 내부 객체를 응답 가능한 구조로 직렬화하는 함수다.
def _serialize_stream_status(item: Cctv) -> dict:
    # 설명: `latest`에 `_latest_status_log` 호출 결과를 저장해 다음 처리에서 사용한다.
    latest = _latest_status_log(item.id)
    # 설명: `status`에 latest.status if latest else 'ACTIVE' if item.is_active else 'INACTIVE' 표현식의 계산 결과를 저장한다.
    status = latest.status if latest else ("ACTIVE" if item.is_active else "INACTIVE")

    # 설명: 호출자에게 {'cctv_id': item.id, 'cctv_code': item.cctv_code, 'camera_id': item.cctv_code, ... 값을 함수 결과로 반환한다.
    return {
        "cctv_id": item.id,
        "cctv_code": item.cctv_code,
        "camera_id": item.cctv_code,
        "stream_url": item.stream_url,
        "status": status,
        "active": bool(item.is_active),
        "message": latest.message if latest else None,
        "checked_at": latest.checked_at.isoformat() if latest and latest.checked_at else None,
        "status_log_id": latest.id if latest else None,
    }


# 설명: `_serialize_slot` 함수는 내부 객체를 응답 가능한 구조로 직렬화하는 함수다.
def _serialize_slot(slot: CctvSlot) -> dict:
    # 설명: `data`에 `slot.to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
    data = slot.to_dict()
    # 설명: `cctv`에 db.session.get(Cctv, slot.cctv_id) if slot.cctv_id else None 표현식의 계산 결과를 저장한다.
    cctv = db.session.get(Cctv, slot.cctv_id) if slot.cctv_id else None

    # 설명: `data.update`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    data.update({
        "camera_id": slot.cctv_code,
        "cctv": _serialize_cctv(cctv) if cctv else None,
    })
    # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
    return data


# 설명: `_list_cctvs` 함수는 조건에 맞는 목록을 조회하는 함수다.
def _list_cctvs():
    # 설명: `query`에 Cctv.query 표현식의 계산 결과를 저장한다.
    query = Cctv.query

    # 설명: `is_active`에 `_parse_is_active` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_active = _parse_is_active(request.args.get("is_active"))
    # 설명: `is_active is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if is_active is not None:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(Cctv.is_active == is_active)

    # 설명: `road_name`에 `(request.args.get('road_name') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    road_name = (request.args.get("road_name") or "").strip()
    # 설명: `road_name` 조건 결과에 따라 실행 경로를 분기한다.
    if road_name:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(Cctv.road_name == road_name)

    # 설명: `items`에 `query.order_by(Cctv.id.asc()).all` 호출 결과를 저장해 다음 처리에서 사용한다.
    items = (
        query
        .order_by(Cctv.id.asc())
        .all()
    )

    # 설명: 호출자에게 [_serialize_cctv(item) for item in items] 값을 함수 결과로 반환한다.
    return [_serialize_cctv(item) for item in items]


# 설명: `_parse_limit` 함수는 외부 입력을 내부 타입으로 해석하는 함수다.
def _parse_limit(default: int = 8, max_limit: int = 100) -> int:
    # 설명: `raw_value`에 `request.args.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw_value = request.args.get("limit", default)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `limit`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        limit = int(raw_value)
    except (TypeError, ValueError):
        # 설명: `limit`에 default 표현식의 계산 결과를 저장한다.
        limit = default

    # 설명: `limit <= 0` 조건 결과에 따라 실행 경로를 분기한다.
    if limit <= 0:
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default

    # 설명: 호출자에게 min(limit, max_limit) 값을 함수 결과로 반환한다.
    return min(limit, max_limit)


# 설명: `_ai_vm_base_url` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _ai_vm_base_url() -> str:
    # Prefer AI VM address. Keep legacy ITS_SERVER_URL only as explicit fallback.
    return (
        current_app.config.get("AI_VM_BASE_URL")
        or os.environ.get("AI_VM_BASE_URL")
        or os.environ.get("ITS_SERVER_URL")
        or "http://192.168.0.186:5001"
        or current_app.config.get("ITS_SERVER_URL")
    ).rstrip("/")


# 설명: `_fetch_its_cctvs_from_ai_vm` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _fetch_its_cctvs_from_ai_vm() -> list[dict]:
    # 설명: `base_url`에 `_ai_vm_base_url` 호출 결과를 저장해 다음 처리에서 사용한다.
    base_url = _ai_vm_base_url()
    # 설명: `limit`에 `_parse_limit` 호출 결과를 저장해 다음 처리에서 사용한다.
    limit = _parse_limit(default=8, max_limit=100)

    # 설명: `passthrough_keys`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    passthrough_keys = ["minX", "maxX", "minY", "maxY", "cctvType", "roadType"]
    # 설명: `query_params`에 {key: request.args.get(key) for key in passthrough_keys if request.ar... 표현식의 계산 결과를 저장한다.
    query_params = {
        key: request.args.get(key)
        for key in passthrough_keys
        if request.args.get(key) not in (None, "")
    }

    # 설명: `query`에 `urllib.parse.urlencode` 호출 결과를 저장해 다음 처리에서 사용한다.
    query = urllib.parse.urlencode(query_params)
    # 설명: `url`에 f'{base_url}/traffic/api/cctv' 표현식의 계산 결과를 저장한다.
    url = f"{base_url}/traffic/api/cctv"
    # 설명: `query` 조건 결과에 따라 실행 경로를 분기한다.
    if query:
        # 설명: `url`에 f'{url}?{query}' 표현식의 계산 결과를 저장한다.
        url = f"{url}?{query}"

    headers = {"User-Agent": "STACCATO-FLASK-VM/1.0"}
    internal_token = str(
        current_app.config.get("INTERNAL_API_TOKEN")
        or os.environ.get("INTERNAL_API_TOKEN")
        or ""
    ).strip()
    if internal_token:
        headers["Authorization"] = f"Bearer {internal_token}"

    # 설명: `req`에 `urllib.request.Request` 호출 결과를 저장해 다음 처리에서 사용한다.
    req = urllib.request.Request(
        url,
        headers=headers,
    )

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `urllib.request.urlopen(req, timeout=15)` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
        with urllib.request.urlopen(req, timeout=15) as response:
            # 설명: `raw_text`에 `response.read().decode` 호출 결과를 저장해 다음 처리에서 사용한다.
            raw_text = response.read().decode("utf-8", errors="replace")
        # 설명: `payload`에 `json.loads` 호출 결과를 저장해 다음 처리에서 사용한다.
        payload = json.loads(raw_text)
    except urllib.error.HTTPError as exc:
        # 설명: 현재 처리를 중단하고 RuntimeError(f'AI-vm ITS API HTTP error: {exc.code}')를 호출자에게 전달한다.
        raise RuntimeError(f"AI-vm ITS API HTTP error: {exc.code}") from exc
    except urllib.error.URLError as exc:
        # 설명: 현재 처리를 중단하고 RuntimeError(f'AI-vm ITS API connection failed: {exc.reason}')를 호출자에게 전달한다.
        raise RuntimeError(f"AI-vm ITS API connection failed: {exc.reason}") from exc
    except json.JSONDecodeError as exc:
        # 설명: 현재 처리를 중단하고 RuntimeError('AI-vm ITS API returned non-JSON response.')를 호출자에게 전달한다.
        raise RuntimeError("AI-vm ITS API returned non-JSON response.") from exc

    # 설명: `items`에 payload.get('items') or [] 표현식의 계산 결과를 저장한다.
    items = payload.get("items") or []
    # 설명: `not isinstance(items, list)` 조건 결과에 따라 실행 경로를 분기한다.
    if not isinstance(items, list):
        # 설명: `items`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        items = []

    # 설명: 호출자에게 items[:limit] 값을 함수 결과로 반환한다.
    return items[:limit]


# 설명: `_is_its_source_request` 함수는 조건의 참/거짓을 판정하는 함수다.
def _is_its_source_request() -> bool:
    # 설명: 호출자에게 str(request.args.get('source') or '').strip().lower() in {'its', 'ai-vm', 'aivm'} 값을 함수 결과로 반환한다.
    return str(request.args.get("source") or "").strip().lower() in {"its", "ai-vm", "aivm"}


@require_auth
def _require_ai_source_auth():
    return None


def _ai_source_auth_error():
    return _require_ai_source_auth()


# 설명: `_get_cctv_by_code` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_cctv_by_code(code: str):
    # 설명: `clean_code`에 `str(code or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    clean_code = str(code or "").strip()
    # 설명: `not clean_code` 조건 결과에 따라 실행 경로를 분기한다.
    if not clean_code:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 Cctv.query.filter(Cctv.cctv_code == clean_code).first() 값을 함수 결과로 반환한다.
    return Cctv.query.filter(Cctv.cctv_code == clean_code).first()


# 설명: `_get_cctv_by_id_or_code` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_cctv_by_id_or_code(identifier: str):
    # 설명: `clean_identifier`에 `str(identifier or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    clean_identifier = str(identifier or "").strip()
    # 설명: `not clean_identifier` 조건 결과에 따라 실행 경로를 분기한다.
    if not clean_identifier:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `clean_identifier.isdigit()` 조건 결과에 따라 실행 경로를 분기한다.
    if clean_identifier.isdigit():
        # 설명: `item`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        item = db.session.get(Cctv, int(clean_identifier))
        # 설명: `item is not None` 조건 결과에 따라 실행 경로를 분기한다.
        if item is not None:
            # 설명: 호출자에게 item 값을 함수 결과로 반환한다.
            return item

    # 설명: 호출자에게 _get_cctv_by_code(clean_identifier) 값을 함수 결과로 반환한다.
    return _get_cctv_by_code(clean_identifier)


# 설명: `_apply_cctv_payload` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _apply_cctv_payload(item: Cctv, payload: dict, *, partial: bool) -> None:
    # 설명: `not isinstance(payload, dict)` 조건 결과에 따라 실행 경로를 분기한다.
    if not isinstance(payload, dict):
        # 설명: 현재 처리를 중단하고 ValueError('JSON object body is required.')를 호출자에게 전달한다.
        raise ValueError("JSON object body is required.")

    # 설명: `not partial` 조건 결과에 따라 실행 경로를 분기한다.
    if not partial:
        # 설명: `missing`에 [field for field in ['cctv_code', 'cctv_name'] if not _clean_string(p... 표현식의 계산 결과를 저장한다.
        missing = [
            field
            for field in ["cctv_code", "cctv_name"]
            if not _clean_string(payload.get(field))
        ]
        # 설명: `missing` 조건 결과에 따라 실행 경로를 분기한다.
        if missing:
            # 설명: 현재 처리를 중단하고 ValueError(f'Missing required fields: {', '.join(missing)}')를 호출자에게 전달한다.
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

    # 설명: `'cctv_code' in payload` 조건 결과에 따라 실행 경로를 분기한다.
    if "cctv_code" in payload:
        # 설명: `code`에 `_clean_string` 호출 결과를 저장해 다음 처리에서 사용한다.
        code = _clean_string(payload.get("cctv_code"))
        # 설명: `not code` 조건 결과에 따라 실행 경로를 분기한다.
        if not code:
            # 설명: 현재 처리를 중단하고 ValueError('cctv_code is required.')를 호출자에게 전달한다.
            raise ValueError("cctv_code is required.")
        # 설명: `item.cctv_code`에 code 표현식의 계산 결과를 저장한다.
        item.cctv_code = code

    # 설명: `'cctv_name' in payload` 조건 결과에 따라 실행 경로를 분기한다.
    if "cctv_name" in payload:
        # 설명: `name`에 `_clean_string` 호출 결과를 저장해 다음 처리에서 사용한다.
        name = _clean_string(payload.get("cctv_name"))
        # 설명: `not name` 조건 결과에 따라 실행 경로를 분기한다.
        if not name:
            # 설명: 현재 처리를 중단하고 ValueError('cctv_name is required.')를 호출자에게 전달한다.
            raise ValueError("cctv_name is required.")
        # 설명: `item.cctv_name`에 name 표현식의 계산 결과를 저장한다.
        item.cctv_name = name

    # 설명: `string_fields`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    string_fields = [
        "stream_url",
        "location_name",
        "road_name",
        "direction",
    ]
    # 설명: `string_fields`의 각 항목을 `field`로 받아 반복 처리한다.
    for field in string_fields:
        # 설명: `field in payload` 조건 결과에 따라 실행 경로를 분기한다.
        if field in payload:
            # 설명: `setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            setattr(item, field, _clean_string(payload.get(field)))

    # 설명: `'latitude' in payload` 조건 결과에 따라 실행 경로를 분기한다.
    if "latitude" in payload:
        # 설명: `item.latitude`에 `_parse_decimal` 호출 결과를 저장해 다음 처리에서 사용한다.
        item.latitude = _parse_decimal(payload.get("latitude"), "latitude")

    # 설명: `'longitude' in payload` 조건 결과에 따라 실행 경로를 분기한다.
    if "longitude" in payload:
        # 설명: `item.longitude`에 `_parse_decimal` 호출 결과를 저장해 다음 처리에서 사용한다.
        item.longitude = _parse_decimal(payload.get("longitude"), "longitude")

    # 설명: `'is_active' in payload` 조건 결과에 따라 실행 경로를 분기한다.
    if "is_active" in payload:
        # 설명: `item.is_active`에 `_bool_to_int` 호출 결과를 저장해 다음 처리에서 사용한다.
        item.is_active = _bool_to_int(payload.get("is_active"))

    # 설명: `'installed_at' in payload` 조건 결과에 따라 실행 경로를 분기한다.
    if "installed_at" in payload:
        # 설명: `item.installed_at`에 `_parse_date` 호출 결과를 저장해 다음 처리에서 사용한다.
        item.installed_at = _parse_date(payload.get("installed_at"), "installed_at")


# 설명: `_update_slot_from_payload` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
def _update_slot_from_payload(slot: CctvSlot, payload: dict) -> None:
    # 설명: `cctv_identifier`에 payload.get('cctv_id') or payload.get('cctv_code') or payload.get('ca... 표현식의 계산 결과를 저장한다.
    cctv_identifier = (
        payload.get("cctv_id")
        or payload.get("cctv_code")
        or payload.get("camera_id")
    )

    # 설명: `cctv_identifier in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
    if cctv_identifier in (None, ""):
        # 설명: `slot.cctv_id`의 기준값 또는 기본값을 None로 설정한다.
        slot.cctv_id = None
        # 설명: `slot.cctv_code`의 기준값 또는 기본값을 None로 설정한다.
        slot.cctv_code = None
    else:
        # 설명: `cctv`에 `_get_cctv_by_id_or_code` 호출 결과를 저장해 다음 처리에서 사용한다.
        cctv = _get_cctv_by_id_or_code(str(cctv_identifier))
        # 설명: `cctv is None` 조건 결과에 따라 실행 경로를 분기한다.
        if cctv is None:
            # 설명: 현재 처리를 중단하고 ValueError(f'CCTV not found for slot {slot.slot_number}.')를 호출자에게 전달한다.
            raise ValueError(f"CCTV not found for slot {slot.slot_number}.")

        # 설명: `slot.cctv_id`에 cctv.id 표현식의 계산 결과를 저장한다.
        slot.cctv_id = cctv.id
        # 설명: `slot.cctv_code`에 cctv.cctv_code 표현식의 계산 결과를 저장한다.
        slot.cctv_code = cctv.cctv_code

    # 설명: `slot.display_name`에 `_clean_string` 호출 결과를 저장해 다음 처리에서 사용한다.
    slot.display_name = _clean_string(payload.get("display_name"))
    # 설명: `slot.layout_json`에 `payload.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    slot.layout_json = payload.get("layout")
    # 설명: `slot.updated_at`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
    slot.updated_at = _utc_now_naive()


# 설명: `list_cctvs` 함수는 조건에 맞는 목록을 조회하는 함수다.
@cctv_bp.get("/cctvs")
def list_cctvs():
    # 설명: `_is_its_source_request()` 조건 결과에 따라 실행 경로를 분기한다.
    if _is_its_source_request():
        auth_error = _ai_source_auth_error()
        if auth_error:
            return auth_error
        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `items`에 `_fetch_its_cctvs_from_ai_vm` 호출 결과를 저장해 다음 처리에서 사용한다.
            items = _fetch_its_cctvs_from_ai_vm()
        except RuntimeError as exc:
            # 설명: 호출자에게 (jsonify({'success': False, 'source': 'ITS', 'message': str(exc), 'items': [], ... 값을 함수 결과로 반환한다.
            return jsonify({
                "success": False,
                "source": "ITS",
                "message": str(exc),
                "items": [],
                "count": 0,
            }), 502

        # 설명: 호출자에게 jsonify({'success': True, 'source': 'ITS', 'count': len(items), 'items': items}) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": True,
            "source": "ITS",
            "count": len(items),
            "items": items,
        })

    # 설명: `items`에 `_list_cctvs` 호출 결과를 저장해 다음 처리에서 사용한다.
    items = _list_cctvs()
    # 설명: 호출자에게 jsonify({'success': True, 'count': len(items), 'items': items}) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "count": len(items),
        "items": items,
    })

# 설명: `create_cctv` 함수는 새 데이터나 리소스를 생성하는 함수다.
@cctv_bp.post("/cctvs")
@require_roles(*CCTV_ADMIN_ROLES)
def create_cctv():
    # 설명: `payload`에 `request.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = request.get_json(silent=True)
    # 설명: `payload is None` 조건 결과에 따라 실행 경로를 분기한다.
    if payload is None:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'JSON body is required.'}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "JSON body is required."}), 400

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `item`에 `Cctv` 호출 결과를 저장해 다음 처리에서 사용한다.
        item = Cctv(
            is_active=1,
            created_at=_utc_now_naive(),
            updated_at=None,
        )
        # 설명: `_apply_cctv_payload`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _apply_cctv_payload(item, payload, partial=False)

        # 설명: `_get_cctv_by_code(item.cctv_code)` 조건 결과에 따라 실행 경로를 분기한다.
        if _get_cctv_by_code(item.cctv_code):
            # 설명: 호출자에게 (jsonify({'success': False, 'error': 'cctv_code already exists.'}), 409) 값을 함수 결과로 반환한다.
            return jsonify({
                "success": False,
                "error": "cctv_code already exists.",
            }), 409

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(item)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
    except ValueError as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(exc)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
        raise

    # 설명: 호출자에게 (jsonify({'success': True, 'item': _serialize_cctv(item)}), 201) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "item": _serialize_cctv(item),
    }), 201


# 설명: `get_cctv_stream_statuses` 함수는 단일 값이나 리소스를 조회하는 함수다.
@cctv_bp.get("/cctvs/stream-status")
def get_cctv_stream_statuses():
    # 설명: `items`에 `Cctv.query.order_by(Cctv.id.asc()).all` 호출 결과를 저장해 다음 처리에서 사용한다.
    items = (
        Cctv.query
        .order_by(Cctv.id.asc())
        .all()
    )

    # 설명: `statuses`에 [_serialize_stream_status(item) for item in items] 표현식의 계산 결과를 저장한다.
    statuses = [_serialize_stream_status(item) for item in items]
    # 설명: 호출자에게 (jsonify({'success': True, 'count': len(statuses), 'items': statuses}), 200) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "count": len(statuses),
        "items": statuses,
    }), 200


# 설명: `get_cctv_detail` 함수는 단일 값이나 리소스를 조회하는 함수다.
@cctv_bp.get("/cctvs/<int:cctv_id>")
def get_cctv_detail(cctv_id: int):
    # 설명: `item`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = db.session.get(Cctv, cctv_id)
    # 설명: `item is None` 조건 결과에 따라 실행 경로를 분기한다.
    if item is None:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'CCTV not found.'}), 404) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    # 설명: 호출자에게 (jsonify({'success': True, 'item': _serialize_cctv(item)}), 200) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "item": _serialize_cctv(item),
    }), 200


# 설명: `update_cctv` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
@cctv_bp.put("/cctvs/<int:cctv_id>")
@cctv_bp.patch("/cctvs/<int:cctv_id>")
@require_roles(*CCTV_ADMIN_ROLES)
def update_cctv(cctv_id: int):
    # 설명: `item`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = db.session.get(Cctv, cctv_id)
    # 설명: `item is None` 조건 결과에 따라 실행 경로를 분기한다.
    if item is None:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'CCTV not found.'}), 404) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    # 설명: `payload`에 `request.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = request.get_json(silent=True)
    # 설명: `payload is None` 조건 결과에 따라 실행 경로를 분기한다.
    if payload is None:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'JSON body is required.'}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "JSON body is required."}), 400

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `original_code`에 item.cctv_code 표현식의 계산 결과를 저장한다.
        original_code = item.cctv_code
        # 설명: `_apply_cctv_payload`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _apply_cctv_payload(item, payload, partial=True)

        # 설명: `item.cctv_code != original_code and _get_cctv_by_code(item.cctv_code)` 조건 결과에 따라 실행 경로를 분기한다.
        if item.cctv_code != original_code and _get_cctv_by_code(item.cctv_code):
            # 설명: 호출자에게 (jsonify({'success': False, 'error': 'cctv_code already exists.'}), 409) 값을 함수 결과로 반환한다.
            return jsonify({
                "success": False,
                "error": "cctv_code already exists.",
            }), 409

        # 설명: `item.updated_at`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
        item.updated_at = _utc_now_naive()
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
    except ValueError as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(exc)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
        raise

    # 설명: 호출자에게 (jsonify({'success': True, 'item': _serialize_cctv(item)}), 200) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "item": _serialize_cctv(item),
    }), 200


# 설명: `delete_cctv` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
@cctv_bp.delete("/cctvs/<int:cctv_id>")
@require_roles(*CCTV_DELETE_ROLES)
def delete_cctv(cctv_id: int):
    # 설명: `item`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = db.session.get(Cctv, cctv_id)
    # 설명: `item is None` 조건 결과에 따라 실행 경로를 분기한다.
    if item is None:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'CCTV not found.'}), 404) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    # 설명: `CctvSlot.query.filter(CctvSlot.cctv_id == item.id).update`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    CctvSlot.query.filter(CctvSlot.cctv_id == item.id).update({
        "cctv_id": None,
        "cctv_code": None,
        "updated_at": _utc_now_naive(),
    })
    # 설명: `db.session.delete`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    db.session.delete(item)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 (jsonify({'success': True, 'deleted_id': cctv_id}), 200) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "deleted_id": cctv_id,
    }), 200


# 설명: `get_cctv_rois` 함수는 단일 값이나 리소스를 조회하는 함수다.
@cctv_bp.get("/cctvs/<cctv_identifier>/rois")
def get_cctv_rois(cctv_identifier: str):
    # 숫자 PK와 CCTV 코드(CCTV-001)를 모두 지원합니다.
    item = _get_cctv_by_id_or_code(cctv_identifier)
    if item is None:
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    cctv_id = item.id
    query = CctvRoi.query.filter(CctvRoi.cctv_id == cctv_id)
    is_active = _parse_is_active(request.args.get("is_active"))
    if is_active is not None:
        query = query.filter(CctvRoi.is_active == is_active)

    rois = query.order_by(CctvRoi.id.asc()).all()

    return jsonify({
        "success": True,
        "cctv_id": cctv_id,
        "count": len(rois),
        "items": [_serialize_roi(roi) for roi in rois],
    }), 200
@cctv_bp.put("/cctvs/<cctv_identifier>/rois")
@require_roles(*CCTV_ADMIN_ROLES)
def put_cctv_rois(cctv_identifier: str):
    # 숫자 PK와 CCTV 코드(CCTV-001)를 모두 지원합니다.
    item = _get_cctv_by_id_or_code(cctv_identifier)
    if item is None:
        return jsonify({"success": False, "error": "CCTV not found."}), 404

    cctv_id = item.id

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"success": False, "error": "JSON body is required."}), 400

    items_payload = payload.get("items")
    if not isinstance(items_payload, list):
        return jsonify({"success": False, "error": "items must be a list."}), 400

    try:
        now = _utc_now_naive()
        saved_rois = []

        for roi_data in items_payload:
            if not isinstance(roi_data, dict):
                raise ValueError("Each ROI item must be an object.")

            roi_type = str(roi_data.get("roi_type") or "").strip().upper()
            if roi_type not in VALID_ROI_TYPES:
                raise ValueError(f"Invalid roi_type: {roi_type!r}. Must be one of {sorted(VALID_ROI_TYPES)}.")

            polygon_json = roi_data.get("polygon_json")
            polygon_json = _validate_roi_polygon(polygon_json)

            is_active_raw = roi_data.get("is_active", True)
            is_active = 0 if is_active_raw in (False, 0, "false", "0", "no") else 1

            roi_name = str(roi_data.get("roi_name") or roi_type).strip()

            existing = CctvRoi.query.filter(
                CctvRoi.cctv_id == cctv_id,
                CctvRoi.roi_type == roi_type,
            ).first()

            if existing:
                existing.roi_name = roi_name
                existing.polygon_json = polygon_json
                existing.is_active = is_active
                existing.updated_at = now
                saved_rois.append(existing)
            else:
                new_roi = CctvRoi(
                    cctv_id=cctv_id,
                    roi_type=roi_type,
                    roi_name=roi_name,
                    polygon_json=polygon_json,
                    is_active=is_active,
                    created_at=now,
                    updated_at=None,
                )
                db.session.add(new_roi)
                saved_rois.append(new_roi)

        updated_types = {str(r.get("roi_type") or "").strip().upper() for r in items_payload if isinstance(r, dict)}
        CctvRoi.query.filter(
            CctvRoi.cctv_id == cctv_id,
            ~CctvRoi.roi_type.in_(updated_types),
        ).update({"is_active": 0, "updated_at": now}, synchronize_session="fetch")

        _add_security_log("CCTV_ROI_UPDATED", "CCTV", cctv_id, {
            "cctv_id": cctv_id,
            "roi_types": sorted(updated_types),
            "roi_count": len(saved_rois),
        })
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "success": True,
        "cctv_id": cctv_id,
        "count": len(saved_rois),
        "items": [_serialize_roi(roi) for roi in saved_rois],
    }), 200


# 설명: `get_cctv_stream_status` 함수는 단일 값이나 리소스를 조회하는 함수다.
@cctv_bp.get("/cctvs/<int:cctv_id>/stream-status")
def get_cctv_stream_status(cctv_id: int):
    # 설명: `item`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = db.session.get(Cctv, cctv_id)
    # 설명: `item is None` 조건 결과에 따라 실행 경로를 분기한다.
    if item is None:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'CCTV not found.'}), 404) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    # 설명: 호출자에게 (jsonify({'success': True, 'item': _serialize_stream_status(item)}), 200) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "item": _serialize_stream_status(item),
    }), 200


# 설명: `get_cctv_by_code` 함수는 단일 값이나 리소스를 조회하는 함수다.
@cctv_bp.get("/cctvs/code/<cctv_code>")
def get_cctv_by_code(cctv_code: str):
    # 설명: `item`에 `_get_cctv_by_code` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = _get_cctv_by_code(cctv_code)
    # 설명: `item is None and (not str(cctv_code or '').strip())` 조건 결과에 따라 실행 경로를 분기한다.
    if item is None and not str(cctv_code or "").strip():
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'cctv_code is required.'}), 400) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "cctv_code is required.",
        }), 400

    # 설명: `item is None` 조건 결과에 따라 실행 경로를 분기한다.
    if item is None:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'CCTV not found.'}), 404) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    # 설명: 호출자에게 (jsonify({'success': True, 'item': _serialize_cctv(item)}), 200) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "item": _serialize_cctv(item),
    }), 200


# 설명: `get_cctv_slots` 함수는 단일 값이나 리소스를 조회하는 함수다.
@cctv_bp.get("/cctv-slots")
def get_cctv_slots():
    # 설명: `slots`에 `CctvSlot.query.order_by(CctvSlot.slot_number.asc()).all` 호출 결과를 저장해 다음 처리에서 사용한다.
    slots = (
        CctvSlot.query
        .order_by(CctvSlot.slot_number.asc())
        .all()
    )

    # 설명: 호출자에게 (jsonify({'success': True, 'count': len(slots), 'items': [_serialize_slot(slot)... 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "count": len(slots),
        "items": [_serialize_slot(slot) for slot in slots],
    }), 200


# 설명: `put_cctv_slots` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@cctv_bp.put("/cctv-slots")
@require_roles(*CCTV_ADMIN_ROLES)
def put_cctv_slots():
    # 설명: `payload`에 `request.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = request.get_json(silent=True)
    # 설명: `payload is None` 조건 결과에 따라 실행 경로를 분기한다.
    if payload is None:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'JSON body is required.'}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "JSON body is required."}), 400

    # 설명: `slots_payload`에 payload.get('slots') if isinstance(payload, dict) else None 표현식의 계산 결과를 저장한다.
    slots_payload = payload.get("slots") if isinstance(payload, dict) else None
    # 설명: `not isinstance(slots_payload, list)` 조건 결과에 따라 실행 경로를 분기한다.
    if not isinstance(slots_payload, list):
        # 설명: 호출자에게 (jsonify({'success': False, 'error': 'slots must be a list.'}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "slots must be a list."}), 400

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `saved_slots`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        saved_slots = []
        # 설명: `now`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = _utc_now_naive()

        # 설명: `slots_payload`의 각 항목을 `slot_payload`로 받아 반복 처리한다.
        for slot_payload in slots_payload:
            # 설명: `not isinstance(slot_payload, dict)` 조건 결과에 따라 실행 경로를 분기한다.
            if not isinstance(slot_payload, dict):
                # 설명: 현재 처리를 중단하고 ValueError('Each slot must be an object.')를 호출자에게 전달한다.
                raise ValueError("Each slot must be an object.")

            # 설명: `raw_slot_number`에 slot_payload.get('slot_number') or slot_payload.get('slot') or slot_p... 표현식의 계산 결과를 저장한다.
            raw_slot_number = (
                slot_payload.get("slot_number")
                or slot_payload.get("slot")
                or slot_payload.get("slot_index")
            )
            # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
            try:
                # 설명: `slot_number`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
                slot_number = int(raw_slot_number)
            except (TypeError, ValueError) as exc:
                # 설명: 현재 처리를 중단하고 ValueError('slot_number is required and must be an integer.')를 호출자에게 전달한다.
                raise ValueError("slot_number is required and must be an integer.") from exc

            # 설명: `slot_number <= 0` 조건 결과에 따라 실행 경로를 분기한다.
            if slot_number <= 0:
                # 설명: 현재 처리를 중단하고 ValueError('slot_number must be greater than 0.')를 호출자에게 전달한다.
                raise ValueError("slot_number must be greater than 0.")

            # 설명: `slot`에 `CctvSlot.query.filter(CctvSlot.slot_number == slot_number).first` 호출 결과를 저장해 다음 처리에서 사용한다.
            slot = CctvSlot.query.filter(CctvSlot.slot_number == slot_number).first()
            # 설명: `slot is None` 조건 결과에 따라 실행 경로를 분기한다.
            if slot is None:
                # 설명: `slot`에 `CctvSlot` 호출 결과를 저장해 다음 처리에서 사용한다.
                slot = CctvSlot(
                    slot_number=slot_number,
                    created_at=now,
                    updated_at=None,
                )
                # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
                db.session.add(slot)

            # 설명: `_update_slot_from_payload`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            _update_slot_from_payload(slot, slot_payload)
            # 설명: `saved_slots.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            saved_slots.append(slot)

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
    except ValueError as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(exc)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
        raise

    # 설명: 호출자에게 (jsonify({'success': True, 'count': len(saved_slots), 'items': [_serialize_slot... 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "count": len(saved_slots),
        "items": [_serialize_slot(slot) for slot in saved_slots],
    }), 200


# 설명: `list_cameras` 함수는 조건에 맞는 목록을 조회하는 함수다.
@cctv_bp.get("/cameras")
def list_cameras():
    # 설명: `_is_its_source_request()` 조건 결과에 따라 실행 경로를 분기한다.
    if _is_its_source_request():
        auth_error = _ai_source_auth_error()
        if auth_error:
            return auth_error
        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `items`에 `_fetch_its_cctvs_from_ai_vm` 호출 결과를 저장해 다음 처리에서 사용한다.
            items = _fetch_its_cctvs_from_ai_vm()
        except RuntimeError as exc:
            # 설명: 호출자에게 (jsonify({'success': False, 'ok': False, 'source': 'ITS', 'message': str(exc), ... 값을 함수 결과로 반환한다.
            return jsonify({
                "success": False,
                "ok": False,
                "source": "ITS",
                "message": str(exc),
                "cameras": [],
                "count": 0,
            }), 502

        # 설명: 호출자에게 jsonify({'success': True, 'ok': True, 'source': 'ITS', 'count': len(items), 'ca... 값을 함수 결과로 반환한다.
        return jsonify({
            "success": True,
            "ok": True,
            "source": "ITS",
            "count": len(items),
            "cameras": items,
        })

    # 설명: `items`에 `_list_cctvs` 호출 결과를 저장해 다음 처리에서 사용한다.
    items = _list_cctvs()
    # 설명: 호출자에게 jsonify({'success': True, 'ok': True, 'count': len(items), 'cameras': items}) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "ok": True,
        "count": len(items),
        "cameras": items,
    })

# 설명: `get_camera` 함수는 단일 값이나 리소스를 조회하는 함수다.
@cctv_bp.get("/cameras/<camera_id>")
def get_camera(camera_id: str):
    # 설명: `item`에 `_get_cctv_by_id_or_code` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = _get_cctv_by_id_or_code(camera_id)
    # 설명: `item is None` 조건 결과에 따라 실행 경로를 분기한다.
    if item is None:
        # 설명: 호출자에게 (jsonify({'ok': False, 'success': False, 'error': 'camera not found'}), 404) 값을 함수 결과로 반환한다.
        return jsonify({
            "ok": False,
            "success": False,
            "error": "camera not found",
        }), 404

    # 설명: 호출자에게 (jsonify({'ok': True, 'success': True, 'camera': _serialize_cctv(item)}), 200) 값을 함수 결과로 반환한다.
    return jsonify({
        "ok": True,
        "success": True,
        "camera": _serialize_cctv(item),
    }), 200


@cctv_bp.post("/cctvs/<camera_id>/manual-events")
@require_roles(*CCTV_ADMIN_ROLES)
def create_manual_event(camera_id: str):
    cctv = _get_cctv_by_id_or_code(camera_id)
    if cctv is None:
        return jsonify({"success": False, "error": "CCTV not found."}), 404

    ai_server_url = (
        current_app.config.get("AI_SERVER_URL")
        or os.environ.get("AI_SERVER_URL")
        or "http://192.168.0.186:5001"
    ).rstrip("/")

    internal_token = str(
        current_app.config.get("INTERNAL_API_TOKEN")
        or os.environ.get("INTERNAL_API_TOKEN")
        or ""
    ).strip()

    extra_body = request.get_json(silent=True) or {}
    if not isinstance(extra_body, dict):
        return jsonify({"success": False, "error": "JSON object body is required."}), 400

    try:
        ai_payload = _build_manual_event_payload(cctv, extra_body)
        _add_security_log("CCTV_MANUAL_EVENT_REQUESTED", "CCTV", cctv.id, {
            "user_id": _current_user_id(),
            "cctv_id": cctv.id,
            "camera_id": cctv.cctv_code,
            "event_type": ai_payload["event_type"],
            "source": ai_payload["source"],
        })
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return jsonify({"success": False, "error": str(exc)}), 400

    headers = {"Content-Type": "application/json"}
    if internal_token:
        headers["Authorization"] = f"Bearer {internal_token}"

    try:
        ai_response = http_requests.post(
            f"{ai_server_url}/internal/cameras/{cctv.cctv_code}/manual-event",
            json=ai_payload,
            headers=headers,
            timeout=15,
        )
        ai_data = ai_response.json()
    except http_requests.ConnectionError:
        return jsonify({"success": False, "error": "AI 서버에 연결할 수 없습니다."}), 502
    except http_requests.Timeout:
        return jsonify({"success": False, "error": "AI 서버 응답 시간이 초과되었습니다."}), 504
    except Exception as exc:
        current_app.logger.exception("manual-event AI VM call failed: camera_id=%s", cctv.cctv_code)
        return jsonify({"success": False, "error": str(exc)}), 500

    if not ai_response.ok:
        return jsonify({
            "success": False,
            "error": ai_data.get("error") or ai_data.get("message") or f"AI 서버 오류: {ai_response.status_code}",
            "ai_status_code": ai_response.status_code,
        }), ai_response.status_code

    return jsonify({
        "success": True,
        "camera_id": cctv.cctv_code,
        "data": ai_data,
    }), 201
