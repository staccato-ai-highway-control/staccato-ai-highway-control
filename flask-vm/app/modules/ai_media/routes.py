"""Authenticated AI VM media gateway routes."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.modules.ai_media.service import (
    AiMediaError,
    comparison_run_media_target,
    cctv_detections_target,
    cctv_snapshot_target,
    cctv_stream_target,
    event_media_target,
    proxy_ai_json,
    proxy_ai_media,
    report_media_target,
)
from app.utils.security import require_auth


ai_media_bp = Blueprint("ai_media", __name__, url_prefix="/api/ai-media")


@ai_media_bp.get("/events/<event_id>/<media_type>")
@require_auth
def proxy_event_media(event_id: str, media_type: str):
    try:
        target = event_media_target(event_id, media_type, request.current_user)
    except AiMediaError as exc:
        return jsonify({"success": False, "error": exc.message}), exc.status_code

    return proxy_ai_media(target)


@ai_media_bp.get("/report-analysis/jobs/<int:job_id>/<media_type>")
@require_auth
def proxy_report_analysis_media(job_id: int, media_type: str):
    try:
        target = report_media_target(job_id, media_type, request.current_user)
    except AiMediaError as exc:
        return jsonify({"success": False, "error": exc.message}), exc.status_code

    return proxy_ai_media(target)


@ai_media_bp.get("/report-model-comparisons/runs/<int:run_id>/<media_type>")
@require_auth
def proxy_model_comparison_run_media(run_id: int, media_type: str):
    try:
        target = comparison_run_media_target(
            run_id,
            media_type,
            request.current_user,
        )
    except AiMediaError as exc:
        return jsonify({"success": False, "error": exc.message}), exc.status_code

    return proxy_ai_media(target)


@ai_media_bp.get("/cctvs/<camera_id>/stream.mjpeg")
@require_auth
def proxy_cctv_stream(camera_id: str):
    try:
        target = cctv_stream_target(camera_id, request.current_user)
    except AiMediaError as exc:
        return jsonify({"success": False, "error": exc.message}), exc.status_code

    return proxy_ai_media(target)


@ai_media_bp.get("/cctvs/<camera_id>/snapshot/latest.jpg")
@require_auth
def proxy_cctv_snapshot(camera_id: str):
    try:
        target = cctv_snapshot_target(camera_id, request.current_user)
    except AiMediaError as exc:
        return jsonify({"success": False, "error": exc.message}), exc.status_code

    return proxy_ai_media(target)


@ai_media_bp.get("/cctvs/<camera_id>/detections")
@require_auth
def proxy_cctv_detections(camera_id: str):
    try:
        target = cctv_detections_target(camera_id, request.current_user)
    except AiMediaError as exc:
        return jsonify({"success": False, "error": exc.message}), exc.status_code

    return proxy_ai_json(target)
