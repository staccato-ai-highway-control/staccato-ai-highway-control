"""resources 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: flask에서 Blueprint, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify, request

# 설명: app.modules.resources.service에서 create_resource, delete_resource, download_resource, get_resource_detail, list_resources, update_resource 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.resources.service import (
    create_resource,
    delete_resource,
    download_resource,
    get_resource_detail,
    list_resources,
    update_resource,
)
# 설명: app.utils.security에서 require_roles 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import require_roles


# 설명: `resources_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
resources_bp = Blueprint("resources", __name__, url_prefix="/api/resources")
# 설명: `RESOURCE_ADMIN_ROLES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
RESOURCE_ADMIN_ROLES = ("SUPER_ADMIN", "CONTROL_ADMIN", "MAINTAINER")


# 설명: `list_resources_api` 함수는 조건에 맞는 목록을 조회하는 함수다.
@resources_bp.get("")
@require_roles(*RESOURCE_ADMIN_ROLES)
def list_resources_api():
    # 설명: `(result, status_code)`에 `list_resources` 호출 결과를 저장해 다음 처리에서 사용한다.
    result, status_code = list_resources(request.args, request.current_user)
    # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
    return jsonify(result), status_code


# 설명: `get_resource_detail_api` 함수는 단일 값이나 리소스를 조회하는 함수다.
@resources_bp.get("/<int:resource_id>")
@require_roles(*RESOURCE_ADMIN_ROLES)
def get_resource_detail_api(resource_id: int):
    # 설명: `(result, status_code)`에 `get_resource_detail` 호출 결과를 저장해 다음 처리에서 사용한다.
    result, status_code = get_resource_detail(resource_id, request.current_user)
    # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
    return jsonify(result), status_code


# 설명: `create_resource_api` 함수는 새 데이터나 리소스를 생성하는 함수다.
@resources_bp.post("")
@require_roles(*RESOURCE_ADMIN_ROLES)
def create_resource_api():
    # 설명: `(result, status_code)`에 `create_resource` 호출 결과를 저장해 다음 처리에서 사용한다.
    result, status_code = create_resource(
        request.form,
        request.files.get("file"),
        request.current_user,
    )
    # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
    return jsonify(result), status_code


# 설명: `update_resource_api` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
@resources_bp.patch("/<int:resource_id>")
@require_roles(*RESOURCE_ADMIN_ROLES)
def update_resource_api(resource_id: int):
    # 설명: `(result, status_code)`에 `update_resource` 호출 결과를 저장해 다음 처리에서 사용한다.
    result, status_code = update_resource(
        resource_id,
        request.form,
        request.files.get("file"),
        request.current_user,
    )
    # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
    return jsonify(result), status_code


# 설명: `delete_resource_api` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
@resources_bp.delete("/<int:resource_id>")
@require_roles(*RESOURCE_ADMIN_ROLES)
def delete_resource_api(resource_id: int):
    # 설명: `(result, status_code)`에 `delete_resource` 호출 결과를 저장해 다음 처리에서 사용한다.
    result, status_code = delete_resource(resource_id, request.current_user)
    # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
    return jsonify(result), status_code


# 설명: `download_resource_api` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@resources_bp.get("/<int:resource_id>/download")
@require_roles(*RESOURCE_ADMIN_ROLES)
def download_resource_api(resource_id: int):
    # 설명: `(result, status_code)`에 `download_resource` 호출 결과를 저장해 다음 처리에서 사용한다.
    result, status_code = download_resource(resource_id)
    # 설명: `status_code == 200` 조건 결과에 따라 실행 경로를 분기한다.
    if status_code == 200:
        # 설명: 호출자에게 result 값을 함수 결과로 반환한다.
        return result
    # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
    return jsonify(result), status_code
