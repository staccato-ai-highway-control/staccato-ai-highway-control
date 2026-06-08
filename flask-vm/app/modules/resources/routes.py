from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.modules.resources.service import (
    create_resource,
    delete_resource,
    download_resource,
    get_resource_detail,
    list_resources,
    update_resource,
)
from app.utils.security import require_roles


resources_bp = Blueprint("resources", __name__, url_prefix="/api/resources")
RESOURCE_ADMIN_ROLES = ("SUPER_ADMIN", "CONTROL_ADMIN", "MAINTAINER")


@resources_bp.get("")
@require_roles(*RESOURCE_ADMIN_ROLES)
def list_resources_api():
    result, status_code = list_resources(request.args, request.current_user)
    return jsonify(result), status_code


@resources_bp.get("/<int:resource_id>")
@require_roles(*RESOURCE_ADMIN_ROLES)
def get_resource_detail_api(resource_id: int):
    result, status_code = get_resource_detail(resource_id, request.current_user)
    return jsonify(result), status_code


@resources_bp.post("")
@require_roles(*RESOURCE_ADMIN_ROLES)
def create_resource_api():
    result, status_code = create_resource(
        request.form,
        request.files.get("file"),
        request.current_user,
    )
    return jsonify(result), status_code


@resources_bp.patch("/<int:resource_id>")
@require_roles(*RESOURCE_ADMIN_ROLES)
def update_resource_api(resource_id: int):
    result, status_code = update_resource(
        resource_id,
        request.form,
        request.files.get("file"),
        request.current_user,
    )
    return jsonify(result), status_code


@resources_bp.delete("/<int:resource_id>")
@require_roles(*RESOURCE_ADMIN_ROLES)
def delete_resource_api(resource_id: int):
    result, status_code = delete_resource(resource_id, request.current_user)
    return jsonify(result), status_code


@resources_bp.get("/<int:resource_id>/download")
@require_roles(*RESOURCE_ADMIN_ROLES)
def download_resource_api(resource_id: int):
    result, status_code = download_resource(resource_id)
    if status_code == 200:
        return result
    return jsonify(result), status_code
