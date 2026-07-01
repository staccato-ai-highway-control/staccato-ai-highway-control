"""AI VM media gateway helpers.

The browser never receives AI VM URLs or tokens. Routes in this module resolve
server-side database identifiers to allowlisted AI VM URLs and proxy the bytes
with INTERNAL_API_TOKEN.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import quote, unquote, urlparse

import requests
from flask import Response, current_app, jsonify, request, stream_with_context

from app.extensions import db
from app.models import (
    AiEvent,
    Cctv,
    IncidentReport,
    ReportAnalysisJob,
    ReportModelComparisonBatch,
    ReportModelComparisonRun,
)
from app.modules.report_upload.service import ReportUploadService

AI_MEDIA_ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN", "CONTROL_ADMIN", "CONTROL_CENTER"}
EVENT_MEDIA_TYPES = {"snapshot", "video", "stream"}
REPORT_MEDIA_TYPES = {"snapshot", "video"}
MODEL_COMPARISON_MEDIA_TYPES = {"snapshot", "video"}
MODEL_COMPARISON_MEDIA_ADMIN_ROLES = {"SUPER_ADMIN", "CONTROL_ADMIN"}
STREAM_MEDIA_TYPES = {"stream"}
CAMERA_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]{1,100}$")
CAMERA_WORKER_ID_PATTERN = re.compile(r"^camera-(\d+)$", re.IGNORECASE)
SENSITIVE_RESPONSE_KEYS = {
    "url",
    "path",
    "file",
    "file_path",
    "filename",
    "snapshot_url",
    "snapshot_path",
    "video_url",
    "video_path",
    "stream_url",
    "media_url",
    "internal_url",
}
HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}
FORWARDED_RESPONSE_HEADERS = {
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "etag",
    "last-modified",
}
AI_PATH_PREFIXES = (
    "/events/",
    "/streams/",
    "/media/",
    "/ai-media/",
    "/analysis/",
    "/report-analysis/",
    "/results/",
    "/outputs/",
    "/static/",
    "/storage/",
)


class AiMediaError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class UpstreamTarget:
    url: str
    media_type: str


def gateway_event_media_url(event_id: str, media_type: str) -> str:
    return f"/api/ai-media/events/{event_id}/{media_type}"


def gateway_report_media_url(job_id: int, media_type: str) -> str:
    return f"/api/ai-media/report-analysis/jobs/{job_id}/{media_type}"


def gateway_model_comparison_media_url(run_id: int, media_type: str) -> str:
    return (
        f"/api/ai-media/report-model-comparisons/runs/{run_id}/{media_type}"
    )


def gateway_cctv_stream_url(camera_id: str) -> str:
    return f"/api/ai-media/cctvs/{camera_id}/stream.mjpeg"


def gateway_cctv_snapshot_url(camera_id: str) -> str:
    return f"/api/ai-media/cctvs/{camera_id}/snapshot/latest.jpg"


def gateway_cctv_detections_url(camera_id: str) -> str:
    return f"/api/ai-media/cctvs/{camera_id}/detections"


def has_event_media_access(user) -> bool:
    return bool(user and getattr(user, "role", None) in AI_MEDIA_ADMIN_ROLES)


def has_cctv_stream_access(user) -> bool:
    return has_event_media_access(user)


def has_report_media_access(report: IncidentReport, user) -> bool:
    return bool(user and ReportUploadService._can_manage_report(report, user))


def has_model_comparison_media_access(user) -> bool:
    return bool(
        user
        and getattr(user, "role", None) in MODEL_COMPARISON_MEDIA_ADMIN_ROLES
    )


def event_media_target(event_id: str, media_type: str, user) -> UpstreamTarget:
    if media_type not in EVENT_MEDIA_TYPES:
        raise AiMediaError("Unsupported media_type.", 404)
    if not has_event_media_access(user):
        raise AiMediaError("Permission denied.", 403)

    event = db.session.get(AiEvent, event_id)
    if event is None:
        raise AiMediaError("AI event not found.", 404)

    # Event clip media is canonically addressed by event_id on the AI VM.
    # Do not treat browser-facing Flask Gateway paths stored in legacy payloads
    # as AI VM upstream URLs.
    canonical_url = _canonical_event_media_url(event_id, media_type)
    if canonical_url:
        return UpstreamTarget(_validate_ai_vm_url(canonical_url), media_type)

    # Stream does not have an event_id-based canonical endpoint. Preserve the
    # existing allowlisted upstream lookup for that media type only.
    raw_event = event.raw_event_json if isinstance(event.raw_event_json, dict) else {}
    value = _first_non_empty(
        raw_event.get(f"{media_type}_url"),
        raw_event.get(f"{media_type}_path"),
        getattr(event, f"{media_type}_url", None),
    )
    return UpstreamTarget(_validate_ai_vm_url(value), media_type)


def _canonical_event_media_url(event_id: str, media_type: str) -> str | None:
    """Build the allowlisted AI VM event media endpoint."""

    safe_event_id = quote(event_id, safe="._:-")
    if media_type == "snapshot":
        return f"{_ai_vm_base_url()}/events/{safe_event_id}.jpg"
    if media_type == "video":
        return f"{_ai_vm_base_url()}/events/{safe_event_id}.mp4"
    return None


def report_media_target(job_id: int, media_type: str, user) -> UpstreamTarget:
    if media_type not in REPORT_MEDIA_TYPES:
        raise AiMediaError("Unsupported media_type.", 404)

    job = db.session.get(ReportAnalysisJob, job_id)
    if job is None:
        raise AiMediaError("Report analysis job not found.", 404)

    report = db.session.get(IncidentReport, job.report_id)
    if report is None:
        raise AiMediaError("Report not found.", 404)
    if not has_report_media_access(report, user):
        raise AiMediaError("Permission denied.", 403)

    result_summary = job.result_summary if isinstance(job.result_summary, dict) else {}
    value = _extract_media_value(result_summary, media_type)
    return UpstreamTarget(_validate_ai_vm_url(value), media_type)


def cctv_stream_target(camera_id: str, user) -> UpstreamTarget:
    _cctv, ai_camera_id = _validated_cctv_target(camera_id, user)
    url = f"{_ai_vm_base_url()}/streams/{quote(ai_camera_id, safe='._:-')}.mjpeg"
    return UpstreamTarget(_validate_ai_vm_url(url), "stream")


def cctv_snapshot_target(camera_id: str, user) -> UpstreamTarget:
    _cctv, ai_camera_id = _validated_cctv_target(camera_id, user)
    url = f"{_ai_vm_base_url()}/internal/cameras/{quote(ai_camera_id, safe='._:-')}/snapshot/latest.jpg"
    return UpstreamTarget(_validate_ai_vm_url(url), "snapshot")


def cctv_detections_target(camera_id: str, user) -> UpstreamTarget:
    _cctv, ai_camera_id = _validated_cctv_target(camera_id, user)
    url = f"{_ai_vm_base_url()}/internal/cameras/{quote(ai_camera_id, safe='._:-')}/detections"
    return UpstreamTarget(_validate_ai_vm_url(url), "detections")


def proxy_ai_media(target: UpstreamTarget):
    token = str(current_app.config.get("INTERNAL_API_TOKEN") or os.getenv("INTERNAL_API_TOKEN", "")).strip()
    if not token:
        return jsonify({"success": False, "error": "AI media gateway is not configured."}), 503

    headers = {"Authorization": f"Bearer {token}"}
    range_header = request.headers.get("Range")
    if range_header and target.media_type == "video":
        headers["Range"] = range_header

    timeout = _request_timeout()
    try:
        upstream = requests.get(target.url, headers=headers, stream=True, timeout=timeout)
    except requests.Timeout:
        return jsonify({"success": False, "error": "AI media request timed out."}), 504
    except requests.RequestException:
        current_app.logger.exception("AI media upstream request failed")
        return jsonify({"success": False, "error": "AI media upstream request failed."}), 502

    response_headers = _response_headers(upstream)
    status_code = upstream.status_code
    content_type = _pop_header_case_insensitive(response_headers, "content-type")
    chunk_size = _chunk_size()

    def generate():
        try:
            for chunk in upstream.iter_content(chunk_size=chunk_size):
                if chunk:
                    yield chunk
        except GeneratorExit:
            raise
        finally:
            upstream.close()

    if not _upstream_ok(upstream):
        upstream.close()
        return _safe_upstream_error(status_code)

    return Response(
        stream_with_context(generate()),
        status=status_code,
        headers=response_headers,
        content_type=content_type or _default_mimetype(target.media_type),
        direct_passthrough=True,
    )


def proxy_ai_json(target: UpstreamTarget):
    token = str(current_app.config.get("INTERNAL_API_TOKEN") or os.getenv("INTERNAL_API_TOKEN", "")).strip()
    if not token:
        return jsonify({"success": False, "error": "AI media gateway is not configured."}), 503

    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    try:
        upstream = requests.get(target.url, headers=headers, timeout=_request_timeout())
    except requests.Timeout:
        return jsonify({"success": False, "error": "AI media request timed out."}), 504
    except requests.RequestException:
        current_app.logger.exception("AI detection upstream request failed")
        return jsonify({"success": False, "error": "AI detection upstream request failed."}), 502

    if not _upstream_ok(upstream):
        return _safe_upstream_error(upstream.status_code)

    try:
        payload = upstream.json()
    except ValueError:
        return jsonify({"success": False, "error": "AI detection upstream returned invalid JSON."}), 502

    response = jsonify(_sanitize_detection_payload(payload))
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response, upstream.status_code


def _configured_ai_bases() -> list[str]:
    raw_values = []
    raw_values.extend(_csv_values(current_app.config.get("AI_VM_INTERNAL_BASE_URLS")))
    raw_values.extend(_csv_values(os.getenv("AI_VM_INTERNAL_BASE_URLS")))
    raw_values.extend(_csv_values(current_app.config.get("AI_VM_BASE_URL")))
    raw_values.extend(_csv_values(os.getenv("AI_VM_BASE_URL")))
    raw_values.extend(_csv_values(current_app.config.get("AI_SERVER_URL")))
    raw_values.extend(_csv_values(os.getenv("AI_SERVER_URL")))
    raw_values.extend(["http://127.0.0.1:5001", "http://localhost:5001"])

    seen = set()
    bases = []
    for value in raw_values:
        parsed = urlparse(value.rstrip("/"))
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            continue
        key = (parsed.scheme, parsed.netloc.lower())
        if key not in seen:
            seen.add(key)
            bases.append(f"{parsed.scheme}://{parsed.netloc}")
    return bases


def _validate_ai_vm_url(value) -> str:
    text = str(value or "").strip()
    if not text:
        raise AiMediaError("AI media URL is not available.", 404)
    if "\x00" in text or "\\" in text:
        raise AiMediaError("Invalid AI media URL.", 400)

    parsed = urlparse(text)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise AiMediaError("Invalid AI media URL.", 400)

    allowed_bases = _configured_ai_bases()
    base = f"{parsed.scheme}://{parsed.netloc}"
    if base not in allowed_bases:
        raise AiMediaError("AI media host is not allowed.", 403)

    decoded_path = _decode_path(parsed.path or "")
    if not decoded_path.startswith("/"):
        raise AiMediaError("Invalid AI media path.", 400)
    if "\x00" in decoded_path or "\\" in decoded_path:
        raise AiMediaError("Invalid AI media path.", 400)
    path_parts = [part for part in decoded_path.split("/") if part]
    if any(part == ".." for part in path_parts):
        raise AiMediaError("Invalid AI media path.", 400)
    if not decoded_path.startswith(AI_PATH_PREFIXES) and not decoded_path.startswith("/internal/cameras/"):
        raise AiMediaError("AI media path is not allowed.", 403)

    return text


def _decode_path(path: str) -> str:
    decoded = path
    for _ in range(5):
        next_decoded = unquote(decoded)
        if next_decoded == decoded:
            break
        decoded = next_decoded
    lowered = decoded.lower()
    if "%2e" in lowered or "%5c" in lowered:
        raise AiMediaError("Invalid AI media path.", 400)
    return decoded


def _extract_media_value(data: dict, media_type: str):
    keys = (
        ("snapshot_url", "snapshot_path", "image_url", "preview_url")
        if media_type == "snapshot"
        else ("video_url", "clip_url", "clip_path", "output_video_url", "result_video_url")
    )
    for value in _walk_values(data, keys):
        if value:
            return value
    raise AiMediaError("AI media URL is not available.", 404)


def _walk_values(value, keys: Iterable[str]):
    if isinstance(value, dict):
        for key in keys:
            if value.get(key):
                yield value.get(key)
        for child in value.values():
            yield from _walk_values(child, keys)
    elif isinstance(value, list):
        for child in value:
            yield from _walk_values(child, keys)


def _validated_cctv(camera_id: str, user):
    cctv, _ai_camera_id = _validated_cctv_target(camera_id, user)
    return cctv


def _validated_cctv_target(camera_id: str, user):
    if not has_cctv_stream_access(user):
        raise AiMediaError("Permission denied.", 403)

    clean_camera_id = _validated_camera_id(camera_id)
    cctv = _get_cctv_by_camera_identifier(clean_camera_id)
    if cctv is None:
        raise AiMediaError("CCTV not found.", 404)
    return cctv, _ai_worker_camera_id(clean_camera_id, cctv)


def _validated_camera_id(camera_id: str) -> str:
    text = str(camera_id or "").strip()
    decoded = _decode_path(text)
    if text != decoded or not CAMERA_ID_PATTERN.fullmatch(decoded):
        raise AiMediaError("Invalid camera_id.", 400)
    if decoded.startswith("/") or ".." in decoded or "\\" in decoded or "\x00" in decoded:
        raise AiMediaError("Invalid camera_id.", 400)
    return decoded


def _get_cctv_by_camera_identifier(identifier: str):
    clean_identifier = str(identifier or "").strip()
    worker_match = CAMERA_WORKER_ID_PATTERN.fullmatch(clean_identifier)
    if worker_match:
        return db.session.get(Cctv, int(worker_match.group(1)))
    return _get_cctv_by_id_or_code(clean_identifier)


def _ai_worker_camera_id(identifier: str, cctv: Cctv) -> str:
    clean_identifier = str(identifier or "").strip()
    if CAMERA_WORKER_ID_PATTERN.fullmatch(clean_identifier):
        return clean_identifier
    if getattr(cctv, "id", None):
        return f"camera-{cctv.id}"
    return clean_identifier


def _get_cctv_by_id_or_code(identifier: str):
    clean_identifier = str(identifier or "").strip()
    if not clean_identifier:
        return None
    if clean_identifier.isdigit():
        item = db.session.get(Cctv, int(clean_identifier))
        if item is not None:
            return item
    return Cctv.query.filter(Cctv.cctv_code == clean_identifier).first()


def _ai_vm_base_url() -> str:
    bases = _configured_ai_bases()
    if not bases:
        raise AiMediaError("AI media gateway is not configured.", 503)
    return bases[0].rstrip("/")


def _sanitize_detection_payload(value, key_name=None):
    if isinstance(value, dict):
        return {
            key: _sanitize_detection_payload(child, key)
            for key, child in value.items()
            if key not in SENSITIVE_RESPONSE_KEYS
        }
    if isinstance(value, list):
        return [_sanitize_detection_payload(child, key_name) for child in value]
    if isinstance(value, str):
        lowered = value.lower()
        if (
            "http://127.0.0.1:5001" in lowered
            or "http://localhost:5001" in lowered
            or "://192.168." in lowered
            or value.startswith(("/home/", "/var/", "/tmp/", "../", "./"))
            or "\\" in value
        ):
            return None
    return value


def _upstream_ok(upstream) -> bool:
    return bool(getattr(upstream, "ok", 200 <= getattr(upstream, "status_code", 502) < 400))


def _safe_upstream_error(status_code: int):
    safe_status = status_code if 400 <= status_code < 600 else 502
    response = jsonify({"success": False, "error": "AI upstream request failed."})
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response, safe_status


def _first_non_empty(*values):
    for value in values:
        if value:
            return value
    return None


def _csv_values(raw_value) -> list[str]:
    if not raw_value:
        return []
    if isinstance(raw_value, (list, tuple, set)):
        return [str(value).strip().rstrip("/") for value in raw_value if str(value).strip()]
    return [value.strip().rstrip("/") for value in str(raw_value).split(",") if value.strip()]


def _request_timeout():
    connect_timeout = _int_config("AI_MEDIA_CONNECT_TIMEOUT_SECONDS", 5)
    read_timeout = _int_config("AI_MEDIA_READ_TIMEOUT_SECONDS", 60)
    return (max(1, connect_timeout), max(1, read_timeout))


def _chunk_size() -> int:
    return max(1024, _int_config("AI_MEDIA_CHUNK_SIZE_BYTES", 65536))


def _int_config(key: str, default: int) -> int:
    try:
        return int(current_app.config.get(key) or os.getenv(key, str(default)))
    except (TypeError, ValueError):
        return default


def _pop_header_case_insensitive(headers: dict[str, str], name: str):
    for key in list(headers):
        if key.lower() == name.lower():
            return headers.pop(key)
    return None


def _response_headers(upstream) -> dict[str, str]:
    headers = {}
    for key, value in upstream.headers.items():
        lowered = key.lower()
        if lowered in HOP_BY_HOP_HEADERS:
            continue
        if lowered in FORWARDED_RESPONSE_HEADERS:
            headers[key] = value
    headers["X-Content-Type-Options"] = "nosniff"
    headers["Cache-Control"] = headers.get("Cache-Control", "private, no-store")
    return headers


def _default_mimetype(media_type: str) -> str:
    if media_type == "stream":
        return "multipart/x-mixed-replace"
    if media_type == "snapshot":
        return "image/jpeg"
    if media_type == "video":
        return "video/mp4"
    if media_type == "detections":
        return "application/json"
    return "application/octet-stream"


def _comparison_run_media_value(
    run: ReportModelComparisonRun,
    media_type: str,
):
    summary = run.result_summary if isinstance(run.result_summary, dict) else {}
    annotated_media = summary.get("annotated_media")
    annotated_media = annotated_media if isinstance(annotated_media, dict) else {}

    keys = (
        (
            "annotated_image_url",
            "image_url",
            "snapshot_url",
            "snapshot_path",
            "preview_url",
        )
        if media_type == "snapshot"
        else (
            "annotated_video_url",
            "video_url",
            "clip_url",
            "clip_path",
            "output_video_url",
            "result_video_url",
        )
    )

    for key in keys:
        value = summary.get(key)
        if value:
            return value

        value = annotated_media.get(key)
        if value:
            return value

    raise AiMediaError("AI media URL is not available.", 404)


def comparison_run_media_target(
    run_id: int,
    media_type: str,
    user,
) -> UpstreamTarget:
    if media_type not in MODEL_COMPARISON_MEDIA_TYPES:
        raise AiMediaError("Unsupported media_type.", 404)

    if not has_model_comparison_media_access(user):
        raise AiMediaError("Permission denied.", 403)

    run = db.session.get(ReportModelComparisonRun, run_id)
    if run is None:
        raise AiMediaError("Model comparison run not found.", 404)

    batch = db.session.get(ReportModelComparisonBatch, run.batch_id)
    if batch is None:
        raise AiMediaError("Model comparison batch not found.", 404)

    report = db.session.get(IncidentReport, batch.report_id)
    if report is None:
        raise AiMediaError("Report not found.", 404)

    value = _comparison_run_media_value(run, media_type)
    return UpstreamTarget(_validate_ai_vm_url(value), media_type)
