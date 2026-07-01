"""ACCESS_LOG 전용 최고관리자 보안 로그 API."""

from flask import Blueprint, jsonify, request

from app.modules.security_logs.service import (
    download_security_log,
    get_security_log_detail,
    list_security_logs,
)
from app.utils.security import require_roles


security_logs_bp = Blueprint(
    "security_logs",
    __name__,
    url_prefix="/api/security-logs",
)


@security_logs_bp.get("")
@require_roles("SUPER_ADMIN")
def list_security_logs_api():
    result, status_code = list_security_logs(
        request.args,
        request.current_user,
    )
    return jsonify(result), status_code


@security_logs_bp.get("/<int:resource_id>")
@require_roles("SUPER_ADMIN")
def get_security_log_detail_api(resource_id: int):
    result, status_code = get_security_log_detail(
        resource_id,
        request.current_user,
    )
    return jsonify(result), status_code


@security_logs_bp.get("/<int:resource_id>/download")
@require_roles("SUPER_ADMIN")
def download_security_log_api(resource_id: int):
    result, status_code = download_security_log(
        resource_id,
        request.current_user,
    )
    if status_code == 200:
        return result
    return jsonify(result), status_code
