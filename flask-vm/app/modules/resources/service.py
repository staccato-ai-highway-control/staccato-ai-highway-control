from __future__ import annotations

from datetime import datetime, timezone
import os
import uuid
from pathlib import Path

from flask import current_app, send_file
from sqlalchemy import or_
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models import ProjectResource
from app.modules.resources.schemas import (
    ALLOWED_RESOURCE_CATEGORIES,
    ALLOWED_RESOURCE_EXTENSIONS,
    ALLOWED_RESOURCE_VISIBILITIES,
)


DEFAULT_PAGE = 1
DEFAULT_SIZE = 10
MAX_SIZE = 100
DEFAULT_VISIBILITY = "ADMIN_ALL"


def list_resources(args) -> tuple[dict, int]:
    page = _positive_int(args.get("page"), DEFAULT_PAGE, maximum=100000)
    size = _positive_int(args.get("size"), DEFAULT_SIZE, maximum=MAX_SIZE)

    query = ProjectResource.query.filter(ProjectResource.deleted_at.is_(None))

    category = _normalize_choice(args.get("category"))
    if category:
        if category not in ALLOWED_RESOURCE_CATEGORIES:
            return _invalid_choice("category", ALLOWED_RESOURCE_CATEGORIES), 400
        query = query.filter(ProjectResource.category == category)

    keyword = _clean_text(args.get("keyword"))
    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(or_(
            ProjectResource.title.ilike(like_keyword),
            ProjectResource.description.ilike(like_keyword),
            ProjectResource.file_name.ilike(like_keyword),
            ProjectResource.author_name.ilike(like_keyword),
        ))

    pagination = query.order_by(
        ProjectResource.created_at.desc(),
        ProjectResource.id.desc(),
    ).paginate(page=page, per_page=size, error_out=False)

    return {
        "items": [resource.to_list_dict() for resource in pagination.items],
        "page": page,
        "size": size,
        "total": pagination.total,
        "pages": pagination.pages,
    }, 200


def get_resource_detail(resource_id: int) -> tuple[dict, int]:
    resource = _get_active_resource(resource_id)
    if resource is None:
        return {"message": "Resource not found."}, 404

    return resource.to_detail_dict(), 200


def create_resource(form, file, current_user) -> tuple[dict, int]:
    title = _clean_text(form.get("title"))
    if not title:
        return {"message": "title is required."}, 400

    category = _normalize_choice(form.get("category"))
    if category not in ALLOWED_RESOURCE_CATEGORIES:
        return _invalid_choice("category", ALLOWED_RESOURCE_CATEGORIES), 400

    visibility = _normalize_choice(form.get("visibility")) or DEFAULT_VISIBILITY
    if visibility not in ALLOWED_RESOURCE_VISIBILITIES:
        return _invalid_choice("visibility", ALLOWED_RESOURCE_VISIBILITIES), 400

    if not file or not file.filename:
        return {"message": "file is required."}, 400

    file_info, error = _save_resource_file(file)
    if error:
        return error

    now = _utc_now_naive()
    resource = ProjectResource(
        title=title,
        description=_clean_text(form.get("description")),
        category=category,
        author_id=getattr(current_user, "id", None),
        author_name=(
            _clean_text(form.get("author_name"))
            or getattr(current_user, "name", None)
        ),
        file_name=file_info["file_name"],
        file_path=file_info["file_path"],
        file_type=file_info["file_type"],
        file_size=file_info["file_size"],
        visibility=visibility,
        created_at=now,
        updated_at=now,
    )

    db.session.add(resource)
    db.session.commit()

    return resource.to_detail_dict(), 201


def update_resource(resource_id: int, form, file, current_user) -> tuple[dict, int]:
    resource = _get_active_resource(resource_id)
    if resource is None:
        return {"message": "Resource not found."}, 404

    if resource.author_id != getattr(current_user, "id", None):
        return {"message": "Only the resource author can update this resource."}, 403

    if "title" in form:
        title = _clean_text(form.get("title"))
        if not title:
            return {"message": "title is required."}, 400
        resource.title = title

    if "description" in form:
        resource.description = _clean_text(form.get("description"))

    if "category" in form:
        category = _normalize_choice(form.get("category"))
        if category not in ALLOWED_RESOURCE_CATEGORIES:
            return _invalid_choice("category", ALLOWED_RESOURCE_CATEGORIES), 400
        resource.category = category

    if "visibility" in form:
        visibility = _normalize_choice(form.get("visibility")) or DEFAULT_VISIBILITY
        if visibility not in ALLOWED_RESOURCE_VISIBILITIES:
            return _invalid_choice("visibility", ALLOWED_RESOURCE_VISIBILITIES), 400
        resource.visibility = visibility

    if file and file.filename:
        old_file_path = resource.file_path
        file_info, error = _save_resource_file(file)
        if error:
            return error

        resource.file_name = file_info["file_name"]
        resource.file_path = file_info["file_path"]
        resource.file_type = file_info["file_type"]
        resource.file_size = file_info["file_size"]
        _remove_file_safely(old_file_path)

    resource.updated_at = _utc_now_naive()

    db.session.add(resource)
    db.session.commit()

    return resource.to_detail_dict(), 200


def delete_resource(resource_id: int, current_user) -> tuple[dict, int]:
    resource = _get_active_resource(resource_id)
    if resource is None:
        return {"message": "Resource not found."}, 404

    if resource.author_id != getattr(current_user, "id", None):
        return {"message": "Only the resource author can delete this resource."}, 403

    now = _utc_now_naive()
    resource.deleted_at = now
    resource.updated_at = now

    db.session.add(resource)
    db.session.commit()

    return {"message": "Resource deleted.", "id": resource.id}, 200


def download_resource(resource_id: int):
    resource = _get_active_resource(resource_id)
    if resource is None:
        return {"message": "Resource not found."}, 404

    if not resource.file_path or not os.path.exists(resource.file_path):
        return {"message": "Resource file not found."}, 404

    response = send_file(
        resource.file_path,
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=secure_filename(resource.file_name or "") or "resource",
        conditional=True,
        max_age=0,
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "private, no-store"

    return response, 200


def _save_resource_file(file):
    raw_filename = _clean_text(file.filename) or "resource"
    extension = Path(raw_filename).suffix.lower().lstrip(".")
    safe_filename = secure_filename(raw_filename) or f"resource.{extension}"
    original_filename = safe_filename
    if extension not in ALLOWED_RESOURCE_EXTENSIONS:
        return None, (_invalid_choice("file extension", ALLOWED_RESOURCE_EXTENSIONS), 400)

    upload_root = current_app.config.get("UPLOAD_BASE_PATH")
    if not upload_root:
        return None, ({"message": "UPLOAD_BASE_PATH is not configured."}, 500)

    upload_dir = os.path.join(upload_root, "resources")
    os.makedirs(upload_dir, exist_ok=True)

    stored_filename = f"{uuid.uuid4().hex}_{original_filename}"
    file_path = os.path.join(upload_dir, stored_filename)

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    file.save(file_path)

    return {
        "file_name": original_filename,
        "file_path": file_path,
        "file_type": extension,
        "file_size": file_size,
    }, None


def _get_active_resource(resource_id: int):
    resource = db.session.get(ProjectResource, resource_id)
    if resource is None or resource.deleted_at is not None:
        return None
    return resource


def _remove_file_safely(file_path: str | None) -> None:
    if not file_path or not os.path.exists(file_path):
        return

    try:
        os.remove(file_path)
    except OSError:
        current_app.logger.exception(
            "Failed to remove replaced resource file.",
            extra={"file_path": file_path},
        )


def _clean_text(value) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def _normalize_choice(value, default: str | None = None) -> str | None:
    text = _clean_text(value)
    if not text:
        return default

    return text.upper()


def _invalid_choice(field_name: str, allowed_values: set[str]) -> dict:
    return {
        "message": f"Invalid {field_name}.",
        "allowed_values": sorted(allowed_values),
    }


def _positive_int(value, default: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default

    if parsed <= 0:
        parsed = default

    return min(parsed, maximum)


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
