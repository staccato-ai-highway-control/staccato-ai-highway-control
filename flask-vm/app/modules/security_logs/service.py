"""ACCESS_LOG 자료를 최고관리자 전용으로 제공하는 보안 로그 서비스."""

from __future__ import annotations

import os

from flask import current_app, send_file
from sqlalchemy import or_
from werkzeug.utils import secure_filename

from app.models import ProjectResource


ACCESS_LOG_CATEGORY = "ACCESS_LOG"
SUPER_ADMIN_ROLE = "SUPER_ADMIN"
DEFAULT_PAGE = 1
DEFAULT_SIZE = 10
MAX_SIZE = 100


def is_super_admin(current_user) -> bool:
    return bool(
        current_user
        and str(getattr(current_user, "role", "") or "").upper()
        == SUPER_ADMIN_ROLE
    )


def list_security_logs(args, current_user) -> tuple[dict, int]:
    """ACCESS_LOG 목록을 SUPER_ADMIN에게만 반환한다."""
    if not is_super_admin(current_user):
        return _permission_denied()

    page = _positive_int(args.get("page"), DEFAULT_PAGE, maximum=100000)
    size = _positive_int(args.get("size"), DEFAULT_SIZE, maximum=MAX_SIZE)

    query = ProjectResource.query.filter(
        ProjectResource.deleted_at.is_(None),
        ProjectResource.category == ACCESS_LOG_CATEGORY,
    )

    keyword = _clean_text(args.get("keyword"))
    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(
            or_(
                ProjectResource.title.ilike(like_keyword),
                ProjectResource.description.ilike(like_keyword),
                ProjectResource.file_name.ilike(like_keyword),
                ProjectResource.author_name.ilike(like_keyword),
            )
        )

    pagination = query.order_by(
        ProjectResource.created_at.desc(),
        ProjectResource.id.desc(),
    ).paginate(page=page, per_page=size, error_out=False)

    return {
        "items": [
            _serialize_security_log(resource, detail=False)
            for resource in pagination.items
        ],
        "page": page,
        "size": size,
        "total": pagination.total,
        "pages": pagination.pages,
    }, 200


def get_security_log_detail(
    resource_id: int,
    current_user,
) -> tuple[dict, int]:
    """ACCESS_LOG 상세 정보를 SUPER_ADMIN에게만 반환한다."""
    if not is_super_admin(current_user):
        return _permission_denied()

    resource = _get_active_access_log(resource_id)
    if resource is None:
        return {"message": "Security log not found."}, 404

    return _serialize_security_log(resource, detail=True), 200


def download_security_log(resource_id: int, current_user):
    """ACCESS_LOG 원본 파일을 SUPER_ADMIN에게만 제공한다."""
    if not is_super_admin(current_user):
        return _permission_denied()

    resource = _get_active_access_log(resource_id)
    if resource is None:
        return {"message": "Security log not found."}, 404

    if not resource.file_path or not os.path.exists(resource.file_path):
        return {"message": "Security log file not found."}, 404

    response = send_file(
        resource.file_path,
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=secure_filename(resource.file_name or "") or "security-log",
        conditional=True,
        max_age=0,
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "private, no-store"
    return response, 200


def _get_active_access_log(resource_id: int):
    resource = ProjectResource.query.filter(
        ProjectResource.id == resource_id,
        ProjectResource.deleted_at.is_(None),
        ProjectResource.category == ACCESS_LOG_CATEGORY,
    ).first()
    return resource


def _serialize_security_log(resource, detail: bool) -> dict:
    data = resource.to_detail_dict() if detail else resource.to_list_dict()
    has_download = bool(resource.file_name and resource.file_path)

    data["download_url"] = (
        f"/api/security-logs/{resource.id}/download"
        if has_download
        else None
    )
    data["allowed_actions"] = {
        "view": True,
        "update": False,
        "delete": False,
        "download": has_download,
    }
    return data


def _permission_denied() -> tuple[dict, int]:
    return {"message": "Permission denied."}, 403


def _clean_text(value) -> str | None:
    cleaned = str(value or "").strip()
    return cleaned or None


def _positive_int(value, default: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    if parsed < 1:
        return default
    return min(parsed, maximum)
