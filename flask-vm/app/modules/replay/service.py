"""replay 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: pathlib에서 Path 이름을 가져와 아래 로직에서 재사용한다.
from pathlib import Path
from urllib.parse import quote, urlsplit
# 설명: sqlalchemy에서 or_ 이름을 가져와 아래 로직에서 재사용한다.
from sqlalchemy import or_

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 Cctv, DetectionLog, Incident, IncidentReport, IncidentSnapshot, ReportAnalysisJob, ReportAttachment, RealtimeEvent 이름을 가져와 아래 로직에서 재사용한다.
from app.models import (
    Cctv,
    DetectionLog,
    Incident,
    IncidentReport,
    IncidentSnapshot,
    ReportAnalysisJob,
    ReportAttachment,
    RealtimeEvent,
)


from app.models.ai_event_models import AiEvent

# 설명: `REPORT_SOURCE`의 기준값 또는 기본값을 'REPORT'로 설정한다.
REPORT_SOURCE = "REPORT"
# 설명: `STREAM_SOURCE`의 기준값 또는 기본값을 'STREAM'로 설정한다.
STREAM_SOURCE = "STREAM"
# 설명: `UNKNOWN_SOURCE`의 기준값 또는 기본값을 'UNKNOWN'로 설정한다.
UNKNOWN_SOURCE = "UNKNOWN"
# 설명: `SOURCE_TYPES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
SOURCE_TYPES = {REPORT_SOURCE, STREAM_SOURCE, UNKNOWN_SOURCE}
# 설명: `VIDEO_FILE_TYPES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
VIDEO_FILE_TYPES = {"VIDEO"}
# 설명: `VIDEO_MIME_PREFIX`의 기준값 또는 기본값을 'video/'로 설정한다.
VIDEO_MIME_PREFIX = "video/"


# 설명: `list_replays` 함수는 조건에 맞는 목록을 조회하는 함수다.
def list_replays(page: int, size: int, filters: dict) -> dict:
    # 설명: `query`에 `Incident.query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
    query = Incident.query.filter(Incident.deleted_at.is_(None))

    # 설명: `incident_type`에 `_clean` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_type = _clean(filters.get("incident_type"))
    # 설명: `incident_type` 조건 결과에 따라 실행 경로를 분기한다.
    if incident_type:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(Incident.incident_type == incident_type.upper())

    # 설명: `risk_level`에 `_clean` 호출 결과를 저장해 다음 처리에서 사용한다.
    risk_level = _clean(filters.get("risk_level"))
    # 설명: `risk_level` 조건 결과에 따라 실행 경로를 분기한다.
    if risk_level:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(Incident.risk_level == risk_level.upper())

    # 설명: `status`에 `_clean` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = _clean(filters.get("status"))
    # 설명: `status` 조건 결과에 따라 실행 경로를 분기한다.
    if status:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(Incident.incident_status == status.upper())

    # 설명: `keyword`에 `_clean` 호출 결과를 저장해 다음 처리에서 사용한다.
    keyword = _clean(filters.get("keyword"))
    # 설명: `keyword` 조건 결과에 따라 실행 경로를 분기한다.
    if keyword:
        # 설명: `like_keyword`에 f'%{keyword}%' 표현식의 계산 결과를 저장한다.
        like_keyword = f"%{keyword}%"
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(or_(
            Incident.incident_code.ilike(like_keyword),
            Incident.incident_type.ilike(like_keyword),
            Incident.location_name.ilike(like_keyword),
        ))

    # 설명: `query`에 `query.order_by` 호출 결과를 저장해 다음 처리에서 사용한다.
    query = query.order_by(
        Incident.detected_at.desc(),
        Incident.created_at.desc(),
    )

    # 설명: `source_type`에 `_normalize_source_type` 호출 결과를 저장해 다음 처리에서 사용한다.
    source_type = _normalize_source_type(filters.get("source_type"))
    # 설명: `source_type` 조건 결과에 따라 실행 경로를 분기한다.
    if source_type:
        # 설명: `serialized_items`에 [serialize_replay_item(incident) for incident in query.all()] 표현식의 계산 결과를 저장한다.
        serialized_items = [
            serialize_replay_item(incident)
            for incident in query.all()
        ]
        # 설명: `filtered_items`에 [item for item in serialized_items if item['source_type'] == source_t... 표현식의 계산 결과를 저장한다.
        filtered_items = [
            item for item in serialized_items
            if item["source_type"] == source_type
        ]
        # 설명: `total_count`에 `len` 호출 결과를 저장해 다음 처리에서 사용한다.
        total_count = len(filtered_items)
        # 설명: `total_pages`에 `_total_pages` 호출 결과를 저장해 다음 처리에서 사용한다.
        total_pages = _total_pages(total_count, size)
        # 설명: `offset`에 (page - 1) * size 표현식의 계산 결과를 저장한다.
        offset = (page - 1) * size
        # 설명: `items`에 filtered_items[offset:offset + size] 표현식의 계산 결과를 저장한다.
        items = filtered_items[offset:offset + size]
    else:
        # 설명: `pagination`에 `query.paginate` 호출 결과를 저장해 다음 처리에서 사용한다.
        pagination = query.paginate(page=page, per_page=size, error_out=False)
        # 설명: `items`에 [serialize_replay_item(incident) for incident in pagination.items] 표현식의 계산 결과를 저장한다.
        items = [serialize_replay_item(incident) for incident in pagination.items]
        # 설명: `total_count`에 pagination.total 표현식의 계산 결과를 저장한다.
        total_count = pagination.total
        # 설명: `total_pages`에 pagination.pages 표현식의 계산 결과를 저장한다.
        total_pages = pagination.pages

    # 설명: 호출자에게 {'success': True, 'message': '이벤트 리플레이 목록 조회 성공', 'data': {'items': items, 'pag... 값을 함수 결과로 반환한다.
    return {
        "success": True,
        "message": "이벤트 리플레이 목록 조회 성공",
        "data": {
            "items": items,
            "page": page,
            "size": size,
            "total_count": total_count,
            "total_pages": total_pages,
        },
    }


# 설명: `get_replay_detail` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_replay_detail(incident_id: int) -> dict:
    # 설명: `incident`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident = db.session.get(Incident, incident_id)
    # 설명: `incident is None or incident.deleted_at is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if incident is None or incident.deleted_at is not None:
        # 설명: 호출자에게 {'success': False, 'error_code': 'REPLAY_NOT_FOUND', 'message': '이벤트 리플레이를 찾을 수... 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error_code": "REPLAY_NOT_FOUND",
            "message": "이벤트 리플레이를 찾을 수 없습니다.",
            "details": None,
        }

    # 설명: `item`에 `serialize_replay_item` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = serialize_replay_item(incident)
    # 설명: `cctv`에 `_get_cctv` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv = _get_cctv(incident)
    # 설명: `report`에 `_get_report` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = _get_report(incident)
    # 설명: `attachment`에 `_get_attachment` 호출 결과를 저장해 다음 처리에서 사용한다.
    attachment = _get_attachment(incident, report)

    # 설명: `item.update`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    item.update({
        "cctv": _serialize_cctv_detail(cctv),
        "report": _serialize_report_detail(report),
        "attachment": _serialize_attachment_detail(attachment),
    })

    # 설명: 호출자에게 {'success': True, 'message': '이벤트 리플레이 상세 조회 성공', 'data': item} 값을 함수 결과로 반환한다.
    return {
        "success": True,
        "message": "이벤트 리플레이 상세 조회 성공",
        "data": item,
    }


# 설명: `serialize_replay_item` 함수는 내부 객체를 응답 가능한 구조로 직렬화하는 함수다.
def serialize_replay_item(incident) -> dict:
    # 설명: `cctv`에 `_get_cctv` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv = _get_cctv(incident)
    # 설명: `report`에 `_get_report` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = _get_report(incident)
    # 설명: `attachment`에 `_get_attachment` 호출 결과를 저장해 다음 처리에서 사용한다.
    attachment = _get_attachment(incident, report)
    # 설명: `analysis_job`에 `_get_analysis_job` 호출 결과를 저장해 다음 처리에서 사용한다.
    analysis_job = _get_analysis_job(incident)
    # 설명: `snapshot`에 `_latest_snapshot` 호출 결과를 저장해 다음 처리에서 사용한다.
    snapshot = _latest_snapshot(incident.id)
    # 설명: `snapshot_url`에 `resolve_snapshot_url` 호출 결과를 저장해 다음 처리에서 사용한다.
    source_type = determine_source_type(incident)
    snapshot_url = resolve_snapshot_url(incident, source_type=source_type)
    # 설명: `replay_url`에 `resolve_replay_url` 호출 결과를 저장해 다음 처리에서 사용한다.
    replay_url = resolve_replay_url(incident, source_type=source_type)
    # 설명: `has_video`에 _is_video_attachment(attachment) or bool(replay_url) 표현식의 계산 결과를 저장한다.
    has_video = _is_video_attachment(attachment) or bool(replay_url)

    # 설명: 호출자에게 {'incident_id': incident.id, 'incident_code': incident.incident_code, 'title': ... 값을 함수 결과로 반환한다.
    return {
        "incident_id": incident.id,
        "incident_code": incident.incident_code,
        "title": _title(incident, report),
        "description": _description(incident, report),
        "incident_type": incident.incident_type,
        "incident_source_type": _incident_source_type(incident),
        "source_type": source_type,
        "status": incident.incident_status,
        "risk_level": incident.risk_level,
        "risk_score": _risk_score(report),
        "detected_at": _iso(incident.detected_at),
        "created_at": _iso(incident.created_at),
        "updated_at": _iso(incident.updated_at),
        "cctv_id": incident.cctv_id,
        "cctv_name": cctv.cctv_name if cctv else None,
        "road_name": cctv.road_name if cctv else None,
        "location_name": cctv.location_name if cctv else incident.location_name,
        "report_id": report.id if report else incident.report_id,
        "attachment_id": attachment.id if attachment else None,
        "analysis_job_id": analysis_job.id if analysis_job else None,
        "snapshot_url": snapshot_url,
        "replay_url": replay_url,
        "media_type": _media_type(attachment),
        "has_snapshot": bool(snapshot_url),
        "has_video": has_video,
    }


# 설명: `determine_source_type` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def determine_source_type(incident) -> str:
    # 설명: `incident.report_id or _get_analysis_job(incident) is not None or _get_attachment(...` 조건 결과에 따라 실행 경로를 분기한다.
    if (
        incident.report_id
        or _get_analysis_job(incident) is not None
        or _get_attachment(incident) is not None
    ):
        # 설명: 호출자에게 REPORT_SOURCE 값을 함수 결과로 반환한다.
        return REPORT_SOURCE

    # 설명: `incident_source_type`에 `_incident_source_type` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_source_type = _incident_source_type(incident)
    # 설명: `incident.cctv_id or _looks_like_stream_source(incident_source_type)` 조건 결과에 따라 실행 경로를 분기한다.
    if incident.cctv_id or _looks_like_stream_source(incident_source_type):
        # 설명: 호출자에게 STREAM_SOURCE 값을 함수 결과로 반환한다.
        return STREAM_SOURCE

    # 설명: 호출자에게 UNKNOWN_SOURCE 값을 함수 결과로 반환한다.
    return UNKNOWN_SOURCE




# 설명: `_is_external_url` 함수는 조건의 참/거짓을 판정하는 함수다.
def _is_external_url(value: str | None) -> bool:
    # 설명: 호출자에게 bool(value and (value.startswith('http://') or value.startswith('https://'))) 값을 함수 결과로 반환한다.
    return bool(value and (value.startswith("http://") or value.startswith("https://")))


def _is_private_ai_media_url(value: str | None) -> bool:
    """Browser에 노출하면 안 되는 AI VM 직접 media URL인지 판별한다."""
    if not value:
        return False

    try:
        parsed = urlsplit(value)
        return parsed.scheme in {"http", "https"} and parsed.port == 5001
    except ValueError:
        return False


def _latest_ai_event_for_replay(
    incident,
    source_type: str | None = None,
) -> AiEvent | None:
    """AI stream 기반 Incident에 연결된 AiEvent만 반환한다."""
    if (source_type or determine_source_type(incident)) == REPORT_SOURCE:
        return None

    incident_code = getattr(incident, "incident_code", None)
    if not incident_code:
        return None

    return db.session.get(AiEvent, incident_code)


def _ai_event_gateway_url(
    ai_event: AiEvent | None,
    media_type: str,
) -> str | None:
    """AI Event의 canonical Flask Gateway media URL을 만든다."""
    event_id = getattr(ai_event, "event_id", None)
    if not event_id:
        return None

    safe_event_id = quote(str(event_id), safe="._:-")
    return f"/api/ai-media/events/{safe_event_id}/{media_type}"


# 설명: `_storage_roots` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _storage_roots() -> list[Path]:
    # 설명: `roots`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    roots: list[Path] = []

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: flask에서 current_app 이름을 가져와 아래 로직에서 재사용한다.
        from flask import current_app

        # 설명: `configured_storage_root`에 `current_app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        configured_storage_root = current_app.config.get("STORAGE_ROOT")
        # 설명: `configured_storage_root` 조건 결과에 따라 실행 경로를 분기한다.
        if configured_storage_root:
            # 설명: `roots.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            roots.append(Path(configured_storage_root))

        # 설명: `roots.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
        roots.append(Path(current_app.root_path).parent / "storage")
    except RuntimeError:
        # 설명: 이 분기에서는 별도 동작 없이 제어 흐름만 유지한다.
        pass

    # 설명: `roots.extend` 호출로 처리 결과를 기존 컬렉션에 누적한다.
    roots.extend([
        Path("/home/staccato/staccato/storage"),
        Path("/home/staccato/staccato-flask/storage"),
    ])

    # 설명: `unique_roots`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    unique_roots: list[Path] = []
    # 설명: `seen`에 `set` 호출 결과를 저장해 다음 처리에서 사용한다.
    seen = set()

    # 설명: `roots`의 각 항목을 `root`로 받아 반복 처리한다.
    for root in roots:
        # 설명: `resolved`에 `root.resolve` 호출 결과를 저장해 다음 처리에서 사용한다.
        resolved = root.resolve()
        # 설명: `resolved in seen` 조건 결과에 따라 실행 경로를 분기한다.
        if resolved in seen:
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue
        # 설명: `seen.add`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        seen.add(resolved)
        # 설명: `unique_roots.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
        unique_roots.append(resolved)

    # 설명: 호출자에게 unique_roots 값을 함수 결과로 반환한다.
    return unique_roots


# 설명: `_storage_media_exists` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _storage_media_exists(public_url: str | None) -> bool:
    # 설명: `not public_url` 조건 결과에 따라 실행 경로를 분기한다.
    if not public_url:
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False

    # 설명: `_is_external_url(public_url)` 조건 결과에 따라 실행 경로를 분기한다.
    if _is_external_url(public_url):
        # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
        return True

    # 설명: `not public_url.startswith('/storage/')` 조건 결과에 따라 실행 경로를 분기한다.
    if not public_url.startswith("/storage/"):
        # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
        return True

    # 설명: `relative_path`에 `public_url.removeprefix` 호출 결과를 저장해 다음 처리에서 사용한다.
    relative_path = public_url.removeprefix("/storage/")

    # 설명: `_storage_roots()`의 각 항목을 `root`로 받아 반복 처리한다.
    for root in _storage_roots():
        # 설명: `target_path`에 `(root / relative_path).resolve` 호출 결과를 저장해 다음 처리에서 사용한다.
        target_path = (root / relative_path).resolve()

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `target_path.relative_to`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            target_path.relative_to(root)
        except ValueError:
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue

        # 설명: `target_path.exists() and target_path.is_file()` 조건 결과에 따라 실행 경로를 분기한다.
        if target_path.exists() and target_path.is_file():
            # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
            return True

    # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
    return False


# 설명: `_resolve_storage_media_url` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _resolve_storage_media_url(path_value: str | None) -> str | None:
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

    if _is_private_ai_media_url(value):
        return None

    # 설명: `_is_external_url(value)` 조건 결과에 따라 실행 경로를 분기한다.
    if _is_external_url(value):
        # 설명: 호출자에게 value 값을 함수 결과로 반환한다.
        return value

    # 이미 public storage URL인 경우
    if value.startswith("/storage/"):
        # 설명: 호출자에게 value if _storage_media_exists(value) else None 값을 함수 결과로 반환한다.
        return value if _storage_media_exists(value) else None

    # storage/generated/... 형태인 경우
    if value.startswith("storage/"):
        # 설명: `public_url`에 '/' + value 표현식의 계산 결과를 저장한다.
        public_url = "/" + value
        # 설명: 호출자에게 public_url if _storage_media_exists(public_url) else None 값을 함수 결과로 반환한다.
        return public_url if _storage_media_exists(public_url) else None

    # generated/incidents/... 형태인 경우
    if value.startswith("generated/"):
        # 설명: `public_url`에 f'/storage/{value}' 표현식의 계산 결과를 저장한다.
        public_url = f"/storage/{value}"
        # 설명: 호출자에게 public_url if _storage_media_exists(public_url) else None 값을 함수 결과로 반환한다.
        return public_url if _storage_media_exists(public_url) else None

    # 절대 경로가 STORAGE_ROOT 내부 파일인 경우
    candidate_path = Path(value)

    # 설명: `candidate_path.is_absolute()` 조건 결과에 따라 실행 경로를 분기한다.
    if candidate_path.is_absolute():
        # 설명: `_storage_roots()`의 각 항목을 `root`로 받아 반복 처리한다.
        for root in _storage_roots():
            # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
            try:
                # 설명: `relative_path`에 `candidate_path.resolve().relative_to` 호출 결과를 저장해 다음 처리에서 사용한다.
                relative_path = candidate_path.resolve().relative_to(root)
            except ValueError:
                # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                continue

            # 설명: `public_url`에 f'/storage/{relative_path.as_posix()}' 표현식의 계산 결과를 저장한다.
            public_url = f"/storage/{relative_path.as_posix()}"
            # 설명: 호출자에게 public_url if _storage_media_exists(public_url) else None 값을 함수 결과로 반환한다.
            return public_url if _storage_media_exists(public_url) else None

    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None


# 설명: `_latest_realtime_event` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _latest_realtime_event(incident_id: int) -> RealtimeEvent | None:
    # 설명: 호출자에게 RealtimeEvent.query.filter_by(incident_id=incident_id).order_by(RealtimeEvent.c... 값을 함수 결과로 반환한다.
    return (
        RealtimeEvent.query
        .filter_by(incident_id=incident_id)
        .order_by(RealtimeEvent.created_at.desc(), RealtimeEvent.id.desc())
        .first()
    )


# 설명: `resolve_snapshot_url` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def resolve_snapshot_url(
    incident,
    source_type: str | None = None,
) -> str | None:
    ai_event = _latest_ai_event_for_replay(incident, source_type)
    if ai_event is not None:
        return _ai_event_gateway_url(ai_event, "snapshot")

    # 설명: `snapshot`에 `_latest_snapshot` 호출 결과를 저장해 다음 처리에서 사용한다.
    snapshot = _latest_snapshot(incident.id)
    # 설명: `snapshot is None` 조건 결과에 따라 실행 경로를 분기한다.
    if snapshot is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 _resolve_storage_media_url(getattr(snapshot, 'file_path', None)) 값을 함수 결과로 반환한다.
    return _resolve_storage_media_url(getattr(snapshot, "file_path", None))


# 설명: `resolve_replay_url` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def resolve_replay_url(
    incident,
    source_type: str | None = None,
) -> str | None:
    ai_event = _latest_ai_event_for_replay(incident, source_type)
    if ai_event is not None and getattr(ai_event, "video_url", None):
        return _ai_event_gateway_url(ai_event, "video")

    # 설명: `realtime_event`에 `_latest_realtime_event` 호출 결과를 저장해 다음 처리에서 사용한다.
    realtime_event = _latest_realtime_event(incident.id)

    # 설명: `realtime_event is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if realtime_event is not None:
        # 설명: `payload`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
        payload = getattr(realtime_event, "payload", None)
        # 설명: `isinstance(payload, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if isinstance(payload, dict):
            # 설명: `('clip_path', 'video_url', 'replay_url')`의 각 항목을 `key`로 받아 반복 처리한다.
            for key in ("clip_path", "video_url", "replay_url"):
                # 설명: `media_url`에 `_resolve_storage_media_url` 호출 결과를 저장해 다음 처리에서 사용한다.
                media_url = _resolve_storage_media_url(payload.get(key))
                # 설명: `media_url` 조건 결과에 따라 실행 경로를 분기한다.
                if media_url:
                    # 설명: 호출자에게 media_url 값을 함수 결과로 반환한다.
                    return media_url

    # 설명: `attachment`에 `_get_attachment` 호출 결과를 저장해 다음 처리에서 사용한다.
    attachment = _get_attachment(incident)
    # 설명: `attachment and _is_video_attachment(attachment)` 조건 결과에 따라 실행 경로를 분기한다.
    if attachment and _is_video_attachment(attachment):
        # 설명: `public_url`에 `_public_url` 호출 결과를 저장해 다음 처리에서 사용한다.
        public_url = _public_url(attachment.file_url)
        # 설명: 호출자에게 public_url if _storage_media_exists(public_url) else None 값을 함수 결과로 반환한다.
        return public_url if _storage_media_exists(public_url) else None

    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None


# 설명: `_get_report` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_report(incident) -> IncidentReport | None:
    # 설명: `incident.report_id` 조건 결과에 따라 실행 경로를 분기한다.
    if incident.report_id:
        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, incident.report_id)
        # 설명: `report is not None` 조건 결과에 따라 실행 경로를 분기한다.
        if report is not None:
            # 설명: 호출자에게 report 값을 함수 결과로 반환한다.
            return report

    # 설명: `job`에 `_get_analysis_job` 호출 결과를 저장해 다음 처리에서 사용한다.
    job = _get_analysis_job(incident)
    # 설명: `job is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if job is not None:
        # 설명: 호출자에게 db.session.get(IncidentReport, job.report_id) 값을 함수 결과로 반환한다.
        return db.session.get(IncidentReport, job.report_id)

    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None


# 설명: `_get_attachment` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_attachment(incident, report: IncidentReport | None = None) -> ReportAttachment | None:
    # 설명: `attachment_id`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
    attachment_id = getattr(incident, "attachment_id", None)
    # 설명: `attachment_id` 조건 결과에 따라 실행 경로를 분기한다.
    if attachment_id:
        # 설명: `attachment`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = db.session.get(ReportAttachment, attachment_id)
        # 설명: `attachment is not None` 조건 결과에 따라 실행 경로를 분기한다.
        if attachment is not None:
            # 설명: 호출자에게 attachment 값을 함수 결과로 반환한다.
            return attachment

    # 설명: `job`에 `_get_analysis_job` 호출 결과를 저장해 다음 처리에서 사용한다.
    job = _get_analysis_job(incident)
    # 설명: `job is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if job is not None:
        # 설명: `attachment`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = db.session.get(ReportAttachment, job.attachment_id)
        # 설명: `attachment is not None` 조건 결과에 따라 실행 경로를 분기한다.
        if attachment is not None:
            # 설명: 호출자에게 attachment 값을 함수 결과로 반환한다.
            return attachment

    # 설명: `report is None` 조건 결과에 따라 실행 경로를 분기한다.
    if report is None:
        # 설명: `report`에 `_get_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = _get_report(incident)

    # 설명: `report is None` 조건 결과에 따라 실행 경로를 분기한다.
    if report is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 ReportAttachment.query.filter_by(report_id=report.id).order_by(ReportAttachment... 값을 함수 결과로 반환한다.
    return (
        ReportAttachment.query
        .filter_by(report_id=report.id)
        .order_by(ReportAttachment.id.asc())
        .first()
    )


# 설명: `_get_analysis_job` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_analysis_job(incident) -> ReportAnalysisJob | None:
    # 설명: `analysis_job_id`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
    analysis_job_id = getattr(incident, "analysis_job_id", None)
    # 설명: `analysis_job_id` 조건 결과에 따라 실행 경로를 분기한다.
    if analysis_job_id:
        # 설명: `job`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        job = db.session.get(ReportAnalysisJob, analysis_job_id)
        # 설명: `job is not None` 조건 결과에 따라 실행 경로를 분기한다.
        if job is not None:
            # 설명: 호출자에게 job 값을 함수 결과로 반환한다.
            return job

    # 설명: `job`에 `ReportAnalysisJob.query.filter(ReportAnalysisJob.created_incident_i...` 호출 결과를 저장해 다음 처리에서 사용한다.
    job = (
        ReportAnalysisJob.query
        .filter(ReportAnalysisJob.created_incident_id == incident.id)
        .order_by(ReportAnalysisJob.id.desc())
        .first()
    )
    # 설명: `job is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if job is not None:
        # 설명: 호출자에게 job 값을 함수 결과로 반환한다.
        return job

    # 설명: `detection_log`에 `DetectionLog.query.filter(DetectionLog.incident_id == incident.id, ...` 호출 결과를 저장해 다음 처리에서 사용한다.
    detection_log = (
        DetectionLog.query
        .filter(
            DetectionLog.incident_id == incident.id,
            DetectionLog.report_analysis_job_id.isnot(None),
        )
        .order_by(DetectionLog.id.desc())
        .first()
    )
    # 설명: `detection_log is None` 조건 결과에 따라 실행 경로를 분기한다.
    if detection_log is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 db.session.get(ReportAnalysisJob, detection_log.report_analysis_job_id) 값을 함수 결과로 반환한다.
    return db.session.get(ReportAnalysisJob, detection_log.report_analysis_job_id)


# 설명: `_latest_snapshot` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _latest_snapshot(incident_id: int) -> IncidentSnapshot | None:
    # 설명: 호출자에게 IncidentSnapshot.query.filter_by(incident_id=incident_id).order_by(IncidentSnap... 값을 함수 결과로 반환한다.
    return (
        IncidentSnapshot.query
        .filter_by(incident_id=incident_id)
        .order_by(IncidentSnapshot.captured_at.desc(), IncidentSnapshot.id.desc())
        .first()
    )


# 설명: `_get_cctv` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_cctv(incident) -> Cctv | None:
    # 설명: `not incident.cctv_id` 조건 결과에 따라 실행 경로를 분기한다.
    if not incident.cctv_id:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 db.session.get(Cctv, incident.cctv_id) 값을 함수 결과로 반환한다.
    return db.session.get(Cctv, incident.cctv_id)


# 설명: `_title` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _title(incident, report: IncidentReport | None) -> str | None:
    # 설명: `report is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if report is not None:
        # 설명: 호출자에게 report.title 값을 함수 결과로 반환한다.
        return report.title

    # 설명: `incident.location_name` 조건 결과에 따라 실행 경로를 분기한다.
    if incident.location_name:
        # 설명: 호출자에게 f'{incident.incident_type} - {incident.location_name}' 값을 함수 결과로 반환한다.
        return f"{incident.incident_type} - {incident.location_name}"

    # 설명: 호출자에게 incident.incident_type 값을 함수 결과로 반환한다.
    return incident.incident_type


# 설명: `_description` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _description(incident, report: IncidentReport | None) -> str | None:
    # 설명: `report is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if report is not None:
        # 설명: 호출자에게 report.description 값을 함수 결과로 반환한다.
        return report.description

    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None


# 설명: `_incident_source_type` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _incident_source_type(incident) -> str | None:
    # 설명: `source_type`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
    source_type = getattr(incident, "incident_source_type", None)
    # 설명: `source_type` 조건 결과에 따라 실행 경로를 분기한다.
    if source_type:
        # 설명: 호출자에게 source_type 값을 함수 결과로 반환한다.
        return source_type

    # 설명: `incident.report_id` 조건 결과에 따라 실행 경로를 분기한다.
    if incident.report_id:
        # 설명: 호출자에게 'REPORT' 값을 함수 결과로 반환한다.
        return "REPORT"

    # 설명: `incident.cctv_id` 조건 결과에 따라 실행 경로를 분기한다.
    if incident.cctv_id:
        # 설명: 호출자에게 'AI_STREAM' 값을 함수 결과로 반환한다.
        return "AI_STREAM"

    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None


# 설명: `_risk_score` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _risk_score(report: IncidentReport | None):
    # 설명: `report is None` 조건 결과에 따라 실행 경로를 분기한다.
    if report is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 report.risk_score 값을 함수 결과로 반환한다.
    return report.risk_score


# 설명: `_media_type` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _media_type(attachment: ReportAttachment | None) -> str | None:
    # 설명: `attachment is None` 조건 결과에 따라 실행 경로를 분기한다.
    if attachment is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `attachment.file_type` 조건 결과에 따라 실행 경로를 분기한다.
    if attachment.file_type:
        # 설명: 호출자에게 attachment.file_type 값을 함수 결과로 반환한다.
        return attachment.file_type

    # 설명: `attachment.mime_type` 조건 결과에 따라 실행 경로를 분기한다.
    if attachment.mime_type:
        # 설명: 호출자에게 attachment.mime_type 값을 함수 결과로 반환한다.
        return attachment.mime_type

    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None


# 설명: `_is_video_attachment` 함수는 조건의 참/거짓을 판정하는 함수다.
def _is_video_attachment(attachment: ReportAttachment | None) -> bool:
    # 설명: `attachment is None` 조건 결과에 따라 실행 경로를 분기한다.
    if attachment is None:
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False

    # 설명: `file_type`에 `(attachment.file_type or '').upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_type = (attachment.file_type or "").upper()
    # 설명: `mime_type`에 `(attachment.mime_type or '').lower` 호출 결과를 저장해 다음 처리에서 사용한다.
    mime_type = (attachment.mime_type or "").lower()
    # 설명: 호출자에게 file_type in VIDEO_FILE_TYPES or mime_type.startswith(VIDEO_MIME_PREFIX) 값을 함수 결과로 반환한다.
    return file_type in VIDEO_FILE_TYPES or mime_type.startswith(VIDEO_MIME_PREFIX)


# 설명: `_public_url` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _public_url(value: str | None) -> str | None:
    # 설명: `not value` 조건 결과에 따라 실행 경로를 분기한다.
    if not value:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `text`에 `str(value).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = str(value).strip()
    # 설명: `not text` 조건 결과에 따라 실행 경로를 분기한다.
    if not text:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `text.startswith(('http://', 'https://', '/api/', '/static/'))` 조건 결과에 따라 실행 경로를 분기한다.
    if text.startswith(("http://", "https://", "/api/", "/static/")):
        # 설명: 호출자에게 text 값을 함수 결과로 반환한다.
        return text

    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None


# 설명: `_serialize_cctv_detail` 함수는 내부 객체를 응답 가능한 구조로 직렬화하는 함수다.
def _serialize_cctv_detail(cctv: Cctv | None) -> dict:
    # 설명: 호출자에게 {'id': cctv.id if cctv else None, 'name': cctv.cctv_name if cctv else None, 'ro... 값을 함수 결과로 반환한다.
    return {
        "id": cctv.id if cctv else None,
        "name": cctv.cctv_name if cctv else None,
        "road_name": cctv.road_name if cctv else None,
        "location_name": cctv.location_name if cctv else None,
    }


# 설명: `_serialize_report_detail` 함수는 내부 객체를 응답 가능한 구조로 직렬화하는 함수다.
def _serialize_report_detail(report: IncidentReport | None) -> dict:
    # 설명: 호출자에게 {'id': report.id if report else None, 'title': report.title if report else None... 값을 함수 결과로 반환한다.
    return {
        "id": report.id if report else None,
        "title": report.title if report else None,
        "status": report.status if report else None,
    }


# 설명: `_serialize_attachment_detail` 함수는 내부 객체를 응답 가능한 구조로 직렬화하는 함수다.
def _serialize_attachment_detail(attachment: ReportAttachment | None) -> dict:
    # 설명: 호출자에게 {'id': attachment.id if attachment else None, 'original_filename': attachment.o... 값을 함수 결과로 반환한다.
    return {
        "id": attachment.id if attachment else None,
        "original_filename": attachment.original_filename if attachment else None,
        "mime_type": attachment.mime_type if attachment else None,
        "file_url": _public_url(attachment.file_url) if attachment else None,
    }


# 설명: `_looks_like_stream_source` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _looks_like_stream_source(value: str | None) -> bool:
    # 설명: `not value` 조건 결과에 따라 실행 경로를 분기한다.
    if not value:
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False

    # 설명: `text`에 `value.upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = value.upper()
    # 설명: 호출자에게 any((token in text for token in ('STREAM', 'AI', 'CCTV', 'CAMERA'))) 값을 함수 결과로 반환한다.
    return any(token in text for token in ("STREAM", "AI", "CCTV", "CAMERA"))


# 설명: `_normalize_source_type` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_source_type(value: str | None) -> str | None:
    # 설명: `text`에 `_clean` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = _clean(value)
    # 설명: `not text` 조건 결과에 따라 실행 경로를 분기한다.
    if not text:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `source_type`에 `text.upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    source_type = text.upper()
    # 설명: `source_type not in SOURCE_TYPES` 조건 결과에 따라 실행 경로를 분기한다.
    if source_type not in SOURCE_TYPES:
        # 설명: 현재 처리를 중단하고 ValueError('source_type must be REPORT, STREAM, or UNKNOWN.')를 호출자에게 전달한다.
        raise ValueError("source_type must be REPORT, STREAM, or UNKNOWN.")

    # 설명: 호출자에게 source_type 값을 함수 결과로 반환한다.
    return source_type


# 설명: `_total_pages` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _total_pages(total_count: int, size: int) -> int:
    # 설명: `total_count <= 0` 조건 결과에 따라 실행 경로를 분기한다.
    if total_count <= 0:
        # 설명: 호출자에게 0 값을 함수 결과로 반환한다.
        return 0

    # 설명: 호출자에게 (total_count + size - 1) // size 값을 함수 결과로 반환한다.
    return (total_count + size - 1) // size


# 설명: `_clean` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _clean(value) -> str | None:
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `text`에 `str(value).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = str(value).strip()
    # 설명: 호출자에게 text or None 값을 함수 결과로 반환한다.
    return text or None


# 설명: `_iso` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _iso(value) -> str | None:
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 value.isoformat() 값을 함수 결과로 반환한다.
    return value.isoformat()
