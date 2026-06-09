from __future__ import annotations

from pathlib import Path
from sqlalchemy import or_

from app.extensions import db
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


REPORT_SOURCE = "REPORT"
STREAM_SOURCE = "STREAM"
UNKNOWN_SOURCE = "UNKNOWN"
SOURCE_TYPES = {REPORT_SOURCE, STREAM_SOURCE, UNKNOWN_SOURCE}
VIDEO_FILE_TYPES = {"VIDEO"}
VIDEO_MIME_PREFIX = "video/"


def list_replays(page: int, size: int, filters: dict) -> dict:
    query = Incident.query.filter(Incident.deleted_at.is_(None))

    incident_type = _clean(filters.get("incident_type"))
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type.upper())

    risk_level = _clean(filters.get("risk_level"))
    if risk_level:
        query = query.filter(Incident.risk_level == risk_level.upper())

    status = _clean(filters.get("status"))
    if status:
        query = query.filter(Incident.incident_status == status.upper())

    keyword = _clean(filters.get("keyword"))
    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(or_(
            Incident.incident_code.ilike(like_keyword),
            Incident.incident_type.ilike(like_keyword),
            Incident.location_name.ilike(like_keyword),
        ))

    query = query.order_by(
        Incident.detected_at.desc(),
        Incident.created_at.desc(),
    )

    source_type = _normalize_source_type(filters.get("source_type"))
    if source_type:
        serialized_items = [
            serialize_replay_item(incident)
            for incident in query.all()
        ]
        filtered_items = [
            item for item in serialized_items
            if item["source_type"] == source_type
        ]
        total_count = len(filtered_items)
        total_pages = _total_pages(total_count, size)
        offset = (page - 1) * size
        items = filtered_items[offset:offset + size]
    else:
        pagination = query.paginate(page=page, per_page=size, error_out=False)
        items = [serialize_replay_item(incident) for incident in pagination.items]
        total_count = pagination.total
        total_pages = pagination.pages

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


def get_replay_detail(incident_id: int) -> dict:
    incident = db.session.get(Incident, incident_id)
    if incident is None or incident.deleted_at is not None:
        return {
            "success": False,
            "error_code": "REPLAY_NOT_FOUND",
            "message": "이벤트 리플레이를 찾을 수 없습니다.",
            "details": None,
        }

    item = serialize_replay_item(incident)
    cctv = _get_cctv(incident)
    report = _get_report(incident)
    attachment = _get_attachment(incident, report)

    item.update({
        "cctv": _serialize_cctv_detail(cctv),
        "report": _serialize_report_detail(report),
        "attachment": _serialize_attachment_detail(attachment),
    })

    return {
        "success": True,
        "message": "이벤트 리플레이 상세 조회 성공",
        "data": item,
    }


def serialize_replay_item(incident) -> dict:
    cctv = _get_cctv(incident)
    report = _get_report(incident)
    attachment = _get_attachment(incident, report)
    analysis_job = _get_analysis_job(incident)
    snapshot = _latest_snapshot(incident.id)
    snapshot_url = resolve_snapshot_url(incident)
    replay_url = resolve_replay_url(incident)
    has_video = _is_video_attachment(attachment) or bool(replay_url)

    return {
        "incident_id": incident.id,
        "incident_code": incident.incident_code,
        "title": _title(incident, report),
        "description": _description(incident, report),
        "incident_type": incident.incident_type,
        "incident_source_type": _incident_source_type(incident),
        "source_type": determine_source_type(incident),
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


def determine_source_type(incident) -> str:
    if (
        incident.report_id
        or _get_analysis_job(incident) is not None
        or _get_attachment(incident) is not None
    ):
        return REPORT_SOURCE

    incident_source_type = _incident_source_type(incident)
    if incident.cctv_id or _looks_like_stream_source(incident_source_type):
        return STREAM_SOURCE

    return UNKNOWN_SOURCE




def _is_external_url(value: str | None) -> bool:
    return bool(value and (value.startswith("http://") or value.startswith("https://")))


def _storage_roots() -> list[Path]:
    roots: list[Path] = []

    try:
        from flask import current_app

        configured_storage_root = current_app.config.get("STORAGE_ROOT")
        if configured_storage_root:
            roots.append(Path(configured_storage_root))

        roots.append(Path(current_app.root_path).parent / "storage")
    except RuntimeError:
        pass

    roots.extend([
        Path("/home/staccato/staccato/storage"),
        Path("/home/staccato/staccato-flask/storage"),
    ])

    unique_roots: list[Path] = []
    seen = set()

    for root in roots:
        resolved = root.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        unique_roots.append(resolved)

    return unique_roots


def _storage_media_exists(public_url: str | None) -> bool:
    if not public_url:
        return False

    if _is_external_url(public_url):
        return True

    if not public_url.startswith("/storage/"):
        return True

    relative_path = public_url.removeprefix("/storage/")

    for root in _storage_roots():
        target_path = (root / relative_path).resolve()

        try:
            target_path.relative_to(root)
        except ValueError:
            continue

        if target_path.exists() and target_path.is_file():
            return True

    return False


def _resolve_storage_media_url(path_value: str | None) -> str | None:
    if not path_value:
        return None

    value = path_value.strip()
    if not value:
        return None

    if _is_external_url(value):
        return value

    # 이미 public storage URL인 경우
    if value.startswith("/storage/"):
        return value if _storage_media_exists(value) else None

    # storage/generated/... 형태인 경우
    if value.startswith("storage/"):
        public_url = "/" + value
        return public_url if _storage_media_exists(public_url) else None

    # generated/incidents/... 형태인 경우
    if value.startswith("generated/"):
        public_url = f"/storage/{value}"
        return public_url if _storage_media_exists(public_url) else None

    # 절대 경로가 STORAGE_ROOT 내부 파일인 경우
    candidate_path = Path(value)

    if candidate_path.is_absolute():
        for root in _storage_roots():
            try:
                relative_path = candidate_path.resolve().relative_to(root)
            except ValueError:
                continue

            public_url = f"/storage/{relative_path.as_posix()}"
            return public_url if _storage_media_exists(public_url) else None

    return None


def _latest_realtime_event(incident_id: int) -> RealtimeEvent | None:
    return (
        RealtimeEvent.query
        .filter_by(incident_id=incident_id)
        .order_by(RealtimeEvent.created_at.desc(), RealtimeEvent.id.desc())
        .first()
    )


def resolve_snapshot_url(incident) -> str | None:
    snapshot = _latest_snapshot(incident.id)
    if snapshot is None:
        return None

    return _resolve_storage_media_url(getattr(snapshot, "file_path", None))


def resolve_replay_url(incident) -> str | None:
    realtime_event = _latest_realtime_event(incident.id)

    if realtime_event is not None:
        payload = getattr(realtime_event, "payload", None)
        if isinstance(payload, dict):
            for key in ("clip_path", "video_url", "replay_url"):
                media_url = _resolve_storage_media_url(payload.get(key))
                if media_url:
                    return media_url

    attachment = _get_attachment(incident)
    if attachment and _is_video_attachment(attachment):
        public_url = _public_url(attachment.file_url)
        return public_url if _storage_media_exists(public_url) else None

    return None


def _get_report(incident) -> IncidentReport | None:
    if incident.report_id:
        report = db.session.get(IncidentReport, incident.report_id)
        if report is not None:
            return report

    job = _get_analysis_job(incident)
    if job is not None:
        return db.session.get(IncidentReport, job.report_id)

    return None


def _get_attachment(incident, report: IncidentReport | None = None) -> ReportAttachment | None:
    attachment_id = getattr(incident, "attachment_id", None)
    if attachment_id:
        attachment = db.session.get(ReportAttachment, attachment_id)
        if attachment is not None:
            return attachment

    job = _get_analysis_job(incident)
    if job is not None:
        attachment = db.session.get(ReportAttachment, job.attachment_id)
        if attachment is not None:
            return attachment

    if report is None:
        report = _get_report(incident)

    if report is None:
        return None

    return (
        ReportAttachment.query
        .filter_by(report_id=report.id)
        .order_by(ReportAttachment.id.asc())
        .first()
    )


def _get_analysis_job(incident) -> ReportAnalysisJob | None:
    analysis_job_id = getattr(incident, "analysis_job_id", None)
    if analysis_job_id:
        job = db.session.get(ReportAnalysisJob, analysis_job_id)
        if job is not None:
            return job

    job = (
        ReportAnalysisJob.query
        .filter(ReportAnalysisJob.created_incident_id == incident.id)
        .order_by(ReportAnalysisJob.id.desc())
        .first()
    )
    if job is not None:
        return job

    detection_log = (
        DetectionLog.query
        .filter(
            DetectionLog.incident_id == incident.id,
            DetectionLog.report_analysis_job_id.isnot(None),
        )
        .order_by(DetectionLog.id.desc())
        .first()
    )
    if detection_log is None:
        return None

    return db.session.get(ReportAnalysisJob, detection_log.report_analysis_job_id)


def _latest_snapshot(incident_id: int) -> IncidentSnapshot | None:
    return (
        IncidentSnapshot.query
        .filter_by(incident_id=incident_id)
        .order_by(IncidentSnapshot.captured_at.desc(), IncidentSnapshot.id.desc())
        .first()
    )


def _get_cctv(incident) -> Cctv | None:
    if not incident.cctv_id:
        return None

    return db.session.get(Cctv, incident.cctv_id)


def _title(incident, report: IncidentReport | None) -> str | None:
    if report is not None:
        return report.title

    if incident.location_name:
        return f"{incident.incident_type} - {incident.location_name}"

    return incident.incident_type


def _description(incident, report: IncidentReport | None) -> str | None:
    if report is not None:
        return report.description

    return None


def _incident_source_type(incident) -> str | None:
    source_type = getattr(incident, "incident_source_type", None)
    if source_type:
        return source_type

    if incident.report_id:
        return "REPORT"

    if incident.cctv_id:
        return "AI_STREAM"

    return None


def _risk_score(report: IncidentReport | None):
    if report is None:
        return None

    return report.risk_score


def _media_type(attachment: ReportAttachment | None) -> str | None:
    if attachment is None:
        return None

    if attachment.file_type:
        return attachment.file_type

    if attachment.mime_type:
        return attachment.mime_type

    return None


def _is_video_attachment(attachment: ReportAttachment | None) -> bool:
    if attachment is None:
        return False

    file_type = (attachment.file_type or "").upper()
    mime_type = (attachment.mime_type or "").lower()
    return file_type in VIDEO_FILE_TYPES or mime_type.startswith(VIDEO_MIME_PREFIX)


def _public_url(value: str | None) -> str | None:
    if not value:
        return None

    text = str(value).strip()
    if not text:
        return None

    if text.startswith(("http://", "https://", "/api/", "/static/")):
        return text

    return None


def _serialize_cctv_detail(cctv: Cctv | None) -> dict:
    return {
        "id": cctv.id if cctv else None,
        "name": cctv.cctv_name if cctv else None,
        "road_name": cctv.road_name if cctv else None,
        "location_name": cctv.location_name if cctv else None,
    }


def _serialize_report_detail(report: IncidentReport | None) -> dict:
    return {
        "id": report.id if report else None,
        "title": report.title if report else None,
        "status": report.status if report else None,
    }


def _serialize_attachment_detail(attachment: ReportAttachment | None) -> dict:
    return {
        "id": attachment.id if attachment else None,
        "original_filename": attachment.original_filename if attachment else None,
        "mime_type": attachment.mime_type if attachment else None,
        "file_url": _public_url(attachment.file_url) if attachment else None,
    }


def _looks_like_stream_source(value: str | None) -> bool:
    if not value:
        return False

    text = value.upper()
    return any(token in text for token in ("STREAM", "AI", "CCTV", "CAMERA"))


def _normalize_source_type(value: str | None) -> str | None:
    text = _clean(value)
    if not text:
        return None

    source_type = text.upper()
    if source_type not in SOURCE_TYPES:
        raise ValueError("source_type must be REPORT, STREAM, or UNKNOWN.")

    return source_type


def _total_pages(total_count: int, size: int) -> int:
    if total_count <= 0:
        return 0

    return (total_count + size - 1) // size


def _clean(value) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def _iso(value) -> str | None:
    if value is None:
        return None

    return value.isoformat()
