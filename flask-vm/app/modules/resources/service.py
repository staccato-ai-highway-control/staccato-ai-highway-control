"""resources 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: datetime에서 datetime, timezone 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timezone
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: uuid 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import uuid
# 설명: pathlib에서 Path 이름을 가져와 아래 로직에서 재사용한다.
from pathlib import Path

# 설명: flask에서 current_app, send_file 이름을 가져와 아래 로직에서 재사용한다.
from flask import current_app, send_file
# 설명: sqlalchemy에서 or_ 이름을 가져와 아래 로직에서 재사용한다.
from sqlalchemy import or_
# 설명: werkzeug.utils에서 secure_filename 이름을 가져와 아래 로직에서 재사용한다.
from werkzeug.utils import secure_filename

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 ProjectResource 이름을 가져와 아래 로직에서 재사용한다.
from app.models import ProjectResource
# 설명: app.modules.resources.schemas에서 ALLOWED_RESOURCE_CATEGORIES, ALLOWED_RESOURCE_EXTENSIONS, ALLOWED_RESOURCE_VISIBILITIES 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.resources.schemas import (
    ALLOWED_RESOURCE_CATEGORIES,
    ALLOWED_RESOURCE_EXTENSIONS,
    ALLOWED_RESOURCE_VISIBILITIES,
)


# 설명: `DEFAULT_PAGE`의 기준값 또는 기본값을 1로 설정한다.
DEFAULT_PAGE = 1
# 설명: `DEFAULT_SIZE`의 기준값 또는 기본값을 10로 설정한다.
DEFAULT_SIZE = 10
# 설명: `MAX_SIZE`의 기준값 또는 기본값을 100로 설정한다.
MAX_SIZE = 100
# 설명: `DEFAULT_VISIBILITY`의 기준값 또는 기본값을 'ADMIN_ALL'로 설정한다.
DEFAULT_VISIBILITY = "ADMIN_ALL"
# 설명: `MAX_RESOURCE_FILE_SIZE`에 50 * 1024 * 1024 표현식의 계산 결과를 저장한다.
MAX_RESOURCE_FILE_SIZE = 50 * 1024 * 1024
ACCESS_LOG_CATEGORY = "ACCESS_LOG"


# 설명: `list_resources` 함수는 조건에 맞는 목록을 조회하는 함수다.
def list_resources(args, current_user=None) -> tuple[dict, int]:
    # 설명: `page`에 `_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
    page = _positive_int(args.get("page"), DEFAULT_PAGE, maximum=100000)
    # 설명: `size`에 `_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
    size = _positive_int(args.get("size"), DEFAULT_SIZE, maximum=MAX_SIZE)

    # 설명: `query`에 `ProjectResource.query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
    query = ProjectResource.query.filter(ProjectResource.deleted_at.is_(None))
    query = query.filter(ProjectResource.category != ACCESS_LOG_CATEGORY)

    # 설명: `category`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
    category = _normalize_choice(args.get("category"))
    # 설명: `category` 조건 결과에 따라 실행 경로를 분기한다.
    if category:
        # 설명: `category not in ALLOWED_RESOURCE_CATEGORIES` 조건 결과에 따라 실행 경로를 분기한다.
        if category not in ALLOWED_RESOURCE_CATEGORIES:
            # 설명: 호출자에게 (_invalid_choice('category', ALLOWED_RESOURCE_CATEGORIES), 400) 값을 함수 결과로 반환한다.
            return _invalid_choice("category", ALLOWED_RESOURCE_CATEGORIES), 400
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        if category == ACCESS_LOG_CATEGORY:
            return {"message": "Resource not found."}, 404
        query = query.filter(ProjectResource.category == category)

    # 설명: `keyword`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    keyword = _clean_text(args.get("keyword"))
    # 설명: `keyword` 조건 결과에 따라 실행 경로를 분기한다.
    if keyword:
        # 설명: `like_keyword`에 f'%{keyword}%' 표현식의 계산 결과를 저장한다.
        like_keyword = f"%{keyword}%"
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(or_(
            ProjectResource.title.ilike(like_keyword),
            ProjectResource.description.ilike(like_keyword),
            ProjectResource.file_name.ilike(like_keyword),
            ProjectResource.author_name.ilike(like_keyword),
        ))

    # 설명: `pagination`에 `query.order_by(ProjectResource.created_at.desc(), ProjectResource.i...` 호출 결과를 저장해 다음 처리에서 사용한다.
    pagination = query.order_by(
        ProjectResource.created_at.desc(),
        ProjectResource.id.desc(),
    ).paginate(page=page, per_page=size, error_out=False)

    # 설명: 호출자에게 ({'items': [_serialize_resource(resource, current_user) for resource in paginat... 값을 함수 결과로 반환한다.
    return {
        "items": [_serialize_resource(resource, current_user) for resource in pagination.items],
        "page": page,
        "size": size,
        "total": pagination.total,
        "pages": pagination.pages,
    }, 200


# 설명: `get_resource_detail` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_resource_detail(resource_id: int, current_user=None) -> tuple[dict, int]:
    # 설명: `resource`에 `_get_active_resource` 호출 결과를 저장해 다음 처리에서 사용한다.
    resource = _get_active_resource(resource_id)
    # 설명: `resource is None` 조건 결과에 따라 실행 경로를 분기한다.
    if resource is None or _is_access_log(resource):
        # 설명: 호출자에게 ({'message': 'Resource not found.'}, 404) 값을 함수 결과로 반환한다.
        return {"message": "Resource not found."}, 404

    # 설명: 호출자에게 (_serialize_resource(resource, current_user, detail=True), 200) 값을 함수 결과로 반환한다.
    return _serialize_resource(resource, current_user, detail=True), 200


# 설명: `create_resource` 함수는 새 데이터나 리소스를 생성하는 함수다.
def create_resource(form, file, current_user) -> tuple[dict, int]:
    # 설명: `title`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    title = _clean_text(form.get("title"))
    # 설명: `not title` 조건 결과에 따라 실행 경로를 분기한다.
    if not title:
        # 설명: 호출자에게 ({'message': 'title is required.'}, 400) 값을 함수 결과로 반환한다.
        return {"message": "title is required."}, 400

    # 설명: `category`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
    category = _normalize_choice(form.get("category"))
    # 설명: `category not in ALLOWED_RESOURCE_CATEGORIES` 조건 결과에 따라 실행 경로를 분기한다.
    if category not in ALLOWED_RESOURCE_CATEGORIES:
        # 설명: 호출자에게 (_invalid_choice('category', ALLOWED_RESOURCE_CATEGORIES), 400) 값을 함수 결과로 반환한다.
        return _invalid_choice("category", ALLOWED_RESOURCE_CATEGORIES), 400

    # 설명: `visibility`에 _normalize_choice(form.get('visibility')) or DEFAULT_VISIBILITY 표현식의 계산 결과를 저장한다.
    if category == ACCESS_LOG_CATEGORY:
        return {"message": "ACCESS_LOG resources cannot be created through /api/resources."}, 403

    visibility = _normalize_choice(form.get("visibility")) or DEFAULT_VISIBILITY
    # 설명: `visibility not in ALLOWED_RESOURCE_VISIBILITIES` 조건 결과에 따라 실행 경로를 분기한다.
    if visibility not in ALLOWED_RESOURCE_VISIBILITIES:
        # 설명: 호출자에게 (_invalid_choice('visibility', ALLOWED_RESOURCE_VISIBILITIES), 400) 값을 함수 결과로 반환한다.
        return _invalid_choice("visibility", ALLOWED_RESOURCE_VISIBILITIES), 400

    # 설명: `not file or not file.filename` 조건 결과에 따라 실행 경로를 분기한다.
    if not file or not file.filename:
        # 설명: 호출자에게 ({'message': 'file is required.'}, 400) 값을 함수 결과로 반환한다.
        return {"message": "file is required."}, 400

    # 설명: `(file_info, error)`에 `_save_resource_file` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_info, error = _save_resource_file(file)
    # 설명: `error` 조건 결과에 따라 실행 경로를 분기한다.
    if error:
        # 설명: 호출자에게 error 값을 함수 결과로 반환한다.
        return error

    # 설명: `now`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = _utc_now_naive()
    # 설명: `resource`에 `ProjectResource` 호출 결과를 저장해 다음 처리에서 사용한다.
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

    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(resource)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 (_serialize_resource(resource, current_user, detail=True), 201) 값을 함수 결과로 반환한다.
    return _serialize_resource(resource, current_user, detail=True), 201


# 설명: `update_resource` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
def update_resource(resource_id: int, form, file, current_user) -> tuple[dict, int]:
    # 설명: `resource`에 `_get_active_resource` 호출 결과를 저장해 다음 처리에서 사용한다.
    resource = _get_active_resource(resource_id)
    # 설명: `resource is None` 조건 결과에 따라 실행 경로를 분기한다.
    if resource is None or _is_access_log(resource):
        # 설명: 호출자에게 ({'message': 'Resource not found.'}, 404) 값을 함수 결과로 반환한다.
        return {"message": "Resource not found."}, 404

    # 설명: `resource.author_id != getattr(current_user, 'id', None)` 조건 결과에 따라 실행 경로를 분기한다.
    if resource.author_id != getattr(current_user, "id", None):
        # 설명: 호출자에게 ({'message': 'Only the resource author can update this resource.'}, 403) 값을 함수 결과로 반환한다.
        return {"message": "Only the resource author can update this resource."}, 403

    # 설명: `'title' in form` 조건 결과에 따라 실행 경로를 분기한다.
    if "title" in form:
        # 설명: `title`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
        title = _clean_text(form.get("title"))
        # 설명: `not title` 조건 결과에 따라 실행 경로를 분기한다.
        if not title:
            # 설명: 호출자에게 ({'message': 'title is required.'}, 400) 값을 함수 결과로 반환한다.
            return {"message": "title is required."}, 400
        # 설명: `resource.title`에 title 표현식의 계산 결과를 저장한다.
        resource.title = title

    # 설명: `'description' in form` 조건 결과에 따라 실행 경로를 분기한다.
    if "description" in form:
        # 설명: `resource.description`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
        resource.description = _clean_text(form.get("description"))

    # 설명: `'category' in form` 조건 결과에 따라 실행 경로를 분기한다.
    if "category" in form:
        # 설명: `category`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
        category = _normalize_choice(form.get("category"))
        # 설명: `category not in ALLOWED_RESOURCE_CATEGORIES` 조건 결과에 따라 실행 경로를 분기한다.
        if category not in ALLOWED_RESOURCE_CATEGORIES:
            # 설명: 호출자에게 (_invalid_choice('category', ALLOWED_RESOURCE_CATEGORIES), 400) 값을 함수 결과로 반환한다.
            return _invalid_choice("category", ALLOWED_RESOURCE_CATEGORIES), 400
        # 설명: `resource.category`에 category 표현식의 계산 결과를 저장한다.
        if category == ACCESS_LOG_CATEGORY:
            return {"message": "ACCESS_LOG resources cannot be set through /api/resources."}, 403
        resource.category = category

    # 설명: `'visibility' in form` 조건 결과에 따라 실행 경로를 분기한다.
    if "visibility" in form:
        # 설명: `visibility`에 _normalize_choice(form.get('visibility')) or DEFAULT_VISIBILITY 표현식의 계산 결과를 저장한다.
        visibility = _normalize_choice(form.get("visibility")) or DEFAULT_VISIBILITY
        # 설명: `visibility not in ALLOWED_RESOURCE_VISIBILITIES` 조건 결과에 따라 실행 경로를 분기한다.
        if visibility not in ALLOWED_RESOURCE_VISIBILITIES:
            # 설명: 호출자에게 (_invalid_choice('visibility', ALLOWED_RESOURCE_VISIBILITIES), 400) 값을 함수 결과로 반환한다.
            return _invalid_choice("visibility", ALLOWED_RESOURCE_VISIBILITIES), 400
        # 설명: `resource.visibility`에 visibility 표현식의 계산 결과를 저장한다.
        resource.visibility = visibility

    # 설명: `file and file.filename` 조건 결과에 따라 실행 경로를 분기한다.
    if file and file.filename:
        # 설명: `old_file_path`에 resource.file_path 표현식의 계산 결과를 저장한다.
        old_file_path = resource.file_path
        # 설명: `(file_info, error)`에 `_save_resource_file` 호출 결과를 저장해 다음 처리에서 사용한다.
        file_info, error = _save_resource_file(file)
        # 설명: `error` 조건 결과에 따라 실행 경로를 분기한다.
        if error:
            # 설명: 호출자에게 error 값을 함수 결과로 반환한다.
            return error

        # 설명: `resource.file_name`에 file_info['file_name'] 표현식의 계산 결과를 저장한다.
        resource.file_name = file_info["file_name"]
        # 설명: `resource.file_path`에 file_info['file_path'] 표현식의 계산 결과를 저장한다.
        resource.file_path = file_info["file_path"]
        # 설명: `resource.file_type`에 file_info['file_type'] 표현식의 계산 결과를 저장한다.
        resource.file_type = file_info["file_type"]
        # 설명: `resource.file_size`에 file_info['file_size'] 표현식의 계산 결과를 저장한다.
        resource.file_size = file_info["file_size"]
        # 설명: `_remove_file_safely`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _remove_file_safely(old_file_path)

    # 설명: `resource.updated_at`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
    resource.updated_at = _utc_now_naive()

    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(resource)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 (_serialize_resource(resource, current_user, detail=True), 200) 값을 함수 결과로 반환한다.
    return _serialize_resource(resource, current_user, detail=True), 200


# 설명: `delete_resource` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
def delete_resource(resource_id: int, current_user) -> tuple[dict, int]:
    # 설명: `resource`에 `_get_active_resource` 호출 결과를 저장해 다음 처리에서 사용한다.
    resource = _get_active_resource(resource_id)
    # 설명: `resource is None` 조건 결과에 따라 실행 경로를 분기한다.
    if resource is None or _is_access_log(resource):
        # 설명: 호출자에게 ({'message': 'Resource not found.'}, 404) 값을 함수 결과로 반환한다.
        return {"message": "Resource not found."}, 404

    # 설명: `resource.author_id != getattr(current_user, 'id', None)` 조건 결과에 따라 실행 경로를 분기한다.
    if resource.author_id != getattr(current_user, "id", None):
        # 설명: 호출자에게 ({'message': 'Only the resource author can delete this resource.'}, 403) 값을 함수 결과로 반환한다.
        return {"message": "Only the resource author can delete this resource."}, 403

    # 설명: `now`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = _utc_now_naive()
    # 설명: `resource.deleted_at`에 now 표현식의 계산 결과를 저장한다.
    resource.deleted_at = now
    # 설명: `resource.updated_at`에 now 표현식의 계산 결과를 저장한다.
    resource.updated_at = now

    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(resource)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 ({'message': 'Resource deleted.', 'id': resource.id}, 200) 값을 함수 결과로 반환한다.
    return {"message": "Resource deleted.", "id": resource.id}, 200


# 설명: `download_resource` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def download_resource(resource_id: int):
    # 설명: `resource`에 `_get_active_resource` 호출 결과를 저장해 다음 처리에서 사용한다.
    resource = _get_active_resource(resource_id)
    # 설명: `resource is None` 조건 결과에 따라 실행 경로를 분기한다.
    if resource is None or _is_access_log(resource):
        # 설명: 호출자에게 ({'message': 'Resource not found.'}, 404) 값을 함수 결과로 반환한다.
        return {"message": "Resource not found."}, 404

    # 설명: `not resource.file_path or not os.path.exists(resource.file_path)` 조건 결과에 따라 실행 경로를 분기한다.
    if not resource.file_path or not os.path.exists(resource.file_path):
        # 설명: 호출자에게 ({'message': 'Resource file not found.'}, 404) 값을 함수 결과로 반환한다.
        return {"message": "Resource file not found."}, 404

    # 설명: `response`에 `send_file` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = send_file(
        resource.file_path,
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=secure_filename(resource.file_name or "") or "resource",
        conditional=True,
        max_age=0,
    )
    # 설명: `response.headers['X-Content-Type-Options']`의 기준값 또는 기본값을 'nosniff'로 설정한다.
    response.headers["X-Content-Type-Options"] = "nosniff"
    # 설명: `response.headers['Cache-Control']`의 기준값 또는 기본값을 'private, no-store'로 설정한다.
    response.headers["Cache-Control"] = "private, no-store"

    # 설명: 호출자에게 (response, 200) 값을 함수 결과로 반환한다.
    return response, 200


# 설명: `_serialize_resource` 함수는 내부 객체를 응답 가능한 구조로 직렬화하는 함수다.
def _serialize_resource(resource, current_user, detail=False):
    # 설명: `data`에 resource.to_detail_dict() if detail else resource.to_list_dict() 표현식의 계산 결과를 저장한다.
    data = resource.to_detail_dict() if detail else resource.to_list_dict()
    # 설명: `is_author`에 `bool` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_author = bool(
        current_user and resource.author_id == getattr(current_user, "id", None)
    )
    # 설명: `data['author_id']`에 resource.author_id 표현식의 계산 결과를 저장한다.
    data["author_id"] = resource.author_id
    # 설명: `data.setdefault`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    data.setdefault(
        "download_url",
        f"/api/resources/{resource.id}/download"
        if resource.file_name and resource.file_path
        else None,
    )
    # 설명: `data['allowed_actions']`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    data["allowed_actions"] = {
        "view": current_user is not None,
        "update": is_author,
        "delete": is_author,
        "download": bool(data.get("download_url")),
    }
    # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
    return data


# 설명: `_save_resource_file` 함수는 데이터나 파일을 영속화하는 함수다.
def _save_resource_file(file):
    # 설명: `raw_filename`에 _clean_text(file.filename) or 'resource' 표현식의 계산 결과를 저장한다.
    raw_filename = _clean_text(file.filename) or "resource"
    # 설명: `extension`에 `Path(raw_filename).suffix.lower().lstrip` 호출 결과를 저장해 다음 처리에서 사용한다.
    extension = Path(raw_filename).suffix.lower().lstrip(".")
    # 설명: `safe_filename`에 secure_filename(raw_filename) or f'resource.{extension}' 표현식의 계산 결과를 저장한다.
    safe_filename = secure_filename(raw_filename) or f"resource.{extension}"
    # 설명: `original_filename`에 safe_filename 표현식의 계산 결과를 저장한다.
    original_filename = safe_filename
    # 설명: `extension not in ALLOWED_RESOURCE_EXTENSIONS` 조건 결과에 따라 실행 경로를 분기한다.
    if extension not in ALLOWED_RESOURCE_EXTENSIONS:
        # 설명: 호출자에게 (None, (_invalid_choice('file extension', ALLOWED_RESOURCE_EXTENSIONS), 400)) 값을 함수 결과로 반환한다.
        return None, (_invalid_choice("file extension", ALLOWED_RESOURCE_EXTENSIONS), 400)

    # 설명: `upload_root`에 `current_app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    upload_root = current_app.config.get("UPLOAD_BASE_PATH")
    # 설명: `not upload_root` 조건 결과에 따라 실행 경로를 분기한다.
    if not upload_root:
        # 설명: 호출자에게 (None, ({'message': 'UPLOAD_BASE_PATH is not configured.'}, 500)) 값을 함수 결과로 반환한다.
        return None, ({"message": "UPLOAD_BASE_PATH is not configured."}, 500)

    # 설명: `upload_dir`에 `os.path.join` 호출 결과를 저장해 다음 처리에서 사용한다.
    upload_dir = os.path.join(upload_root, "resources")
    # 설명: `os.makedirs`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    os.makedirs(upload_dir, exist_ok=True)

    # 설명: `stored_filename`에 f'{uuid.uuid4().hex}_{original_filename}' 표현식의 계산 결과를 저장한다.
    stored_filename = f"{uuid.uuid4().hex}_{original_filename}"
    # 설명: `file_path`에 `os.path.join` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_path = os.path.join(upload_dir, stored_filename)

    # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    file.seek(0, os.SEEK_END)
    # 설명: `file_size`에 `file.tell` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_size = file.tell()
    # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    file.seek(0)

    # 설명: `file_size > MAX_RESOURCE_FILE_SIZE` 조건 결과에 따라 실행 경로를 분기한다.
    if file_size > MAX_RESOURCE_FILE_SIZE:
        # 설명: 호출자에게 (None, ({'message': 'Resource file is too large.', 'max_size': MAX_RESOURCE_FIL... 값을 함수 결과로 반환한다.
        return None, ({
            "message": "Resource file is too large.",
            "max_size": MAX_RESOURCE_FILE_SIZE,
        }, 400)

    # 설명: `file.save`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    file.save(file_path)

    # 설명: 호출자에게 ({'file_name': original_filename, 'file_path': file_path, 'file_type': extensio... 값을 함수 결과로 반환한다.
    return {
        "file_name": original_filename,
        "file_path": file_path,
        "file_type": extension,
        "file_size": file_size,
    }, None


# 설명: `_get_active_resource` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_active_resource(resource_id: int):
    # 설명: `resource`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    resource = db.session.get(ProjectResource, resource_id)
    # 설명: `resource is None or resource.deleted_at is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if resource is None or resource.deleted_at is not None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None
    # 설명: 호출자에게 resource 값을 함수 결과로 반환한다.
    return resource


# 설명: `_remove_file_safely` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _remove_file_safely(file_path: str | None) -> None:
    # 설명: `not file_path or not os.path.exists(file_path)` 조건 결과에 따라 실행 경로를 분기한다.
    if not file_path or not os.path.exists(file_path):
        # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
        return

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `os.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        os.remove(file_path)
    except OSError:
        # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        current_app.logger.exception(
            "Failed to remove replaced resource file.",
            extra={"file_path": file_path},
        )


# 설명: `_clean_text` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _clean_text(value) -> str | None:
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `text`에 `str(value).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = str(value).strip()
    # 설명: 호출자에게 text or None 값을 함수 결과로 반환한다.
    return text or None


# 설명: `_normalize_choice` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_choice(value, default: str | None = None) -> str | None:
    # 설명: `text`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = _clean_text(value)
    # 설명: `not text` 조건 결과에 따라 실행 경로를 분기한다.
    if not text:
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default

    # 설명: 호출자에게 text.upper() 값을 함수 결과로 반환한다.
    return text.upper()


# 설명: `_invalid_choice` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _invalid_choice(field_name: str, allowed_values: set[str]) -> dict:
    # 설명: 호출자에게 {'message': f'Invalid {field_name}.', 'allowed_values': sorted(allowed_values)} 값을 함수 결과로 반환한다.
    return {
        "message": f"Invalid {field_name}.",
        "allowed_values": sorted(allowed_values),
    }


# 설명: `_positive_int` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _positive_int(value, default: int, maximum: int) -> int:
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `parsed`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        parsed = int(value)
    except (TypeError, ValueError):
        # 설명: `parsed`에 default 표현식의 계산 결과를 저장한다.
        parsed = default

    # 설명: `parsed <= 0` 조건 결과에 따라 실행 경로를 분기한다.
    if parsed <= 0:
        # 설명: `parsed`에 default 표현식의 계산 결과를 저장한다.
        parsed = default

    # 설명: 호출자에게 min(parsed, maximum) 값을 함수 결과로 반환한다.
    return min(parsed, maximum)


# 설명: `_utc_now_naive` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _utc_now_naive() -> datetime:
    # 설명: 호출자에게 datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0) 값을 함수 결과로 반환한다.
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)



def _is_access_log(resource) -> bool:
    return str(getattr(resource, "category", "") or "").upper() == ACCESS_LOG_CATEGORY
