from __future__ import annotations

from flask import current_app, request
from flask_socketio import disconnect, emit, join_room, leave_room

from app.extensions import db, socketio
from app.models import IncidentReport, ReportAnalysisJob
from app.models.auth_models import User
from app.utils.security import decode_access_token


ADMIN_ROLES = {
    "SUPER_ADMIN",
    "ADMIN",
    "CONTROL_ADMIN",
    "CONTROL_CENTER",
}

# Socket.IO request.environ is not a durable per-client store.
# Keep a small sid -> user_id mapping and clean it on disconnect.
_SID_TO_USER_ID: dict[str, int] = {}


def _clean_token(raw_token: str | None) -> str | None:
    if not raw_token:
        return None

    token = str(raw_token).strip()

    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    return token or None


def _get_handshake_token(auth) -> str | None:
    """
    Accept both frontend-friendly auth token and Authorization header.

    Supported:
    - io(API_BASE_URL, { auth: { token: accessToken } })
    - Authorization: Bearer accessToken
    """
    if isinstance(auth, dict):
        token = _clean_token(auth.get("token"))
        if token:
            return token

    return _clean_token(request.headers.get("Authorization"))


def _emit_socket_error(code: str, message: str, status: int = 400) -> None:
    emit(
        "socket_error",
        {
            "success": False,
            "code": code,
            "message": message,
            "status": status,
        },
    )


def _parse_report_id(payload) -> int | None:
    if not isinstance(payload, dict):
        return None

    raw_report_id = payload.get("report_id")

    try:
        report_id = int(raw_report_id)
    except (TypeError, ValueError):
        return None

    if report_id <= 0:
        return None

    return report_id


def _authenticate_socket_user(auth):
    token = _get_handshake_token(auth)

    if not token:
        return None, "MISSING_TOKEN"

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except Exception:
        current_app.logger.info("Socket authentication failed: invalid or expired token")
        return None, "INVALID_TOKEN"

    user = db.session.get(User, user_id)

    if not user:
        return None, "USER_NOT_FOUND"

    if getattr(user, "account_status", None) != "ACTIVE":
        return None, "ACCOUNT_INACTIVE"

    return user, None


def _get_socket_user():
    user_id = _SID_TO_USER_ID.get(request.sid)

    if not user_id:
        return None

    return db.session.get(User, user_id)


def _user_can_access_report(user: User, report: IncidentReport) -> bool:
    """
    Conservative access rule.

    - Admin/control roles can access all reports.
    - Normal users can access only when a known ownership field matches.
    - If the model has no recognizable ownership field, deny by default.
    """
    if user is None or report is None:
        return False

    role = str(getattr(user, "role", "") or "").upper()
    if role in ADMIN_ROLES:
        return True

    user_id = getattr(user, "id", None)

    owner_fields = (
        "reporter_id",
        "reporter_user_id",
        "reported_by",
        "reported_by_user_id",
        "user_id",
        "created_by",
        "created_by_id",
        "uploaded_by",
        "requested_by",
    )

    for field in owner_fields:
        if hasattr(report, field) and getattr(report, field) == user_id:
            return True

    requested_job_exists = (
        ReportAnalysisJob.query
        .filter(
            ReportAnalysisJob.report_id == report.id,
            ReportAnalysisJob.requested_by == user_id,
        )
        .first()
        is not None
    )

    if requested_job_exists:
        return True

    return False


@socketio.on("connect")
def handle_connect(auth=None):
    user, error_code = _authenticate_socket_user(auth)

    if error_code:
        current_app.logger.info("Socket connect rejected: %s", error_code)
        return False

    _SID_TO_USER_ID[request.sid] = user.id

    emit(
        "socket_connected",
        {
            "success": True,
            "user_id": user.id,
            "role": getattr(user, "role", None),
        },
    )


@socketio.on("disconnect")
def handle_disconnect():
    _SID_TO_USER_ID.pop(request.sid, None)
    current_app.logger.info("Socket disconnected. sid=%s", request.sid)


@socketio.on("join_report")
def handle_join_report(payload):
    report_id = _parse_report_id(payload)

    if report_id is None:
        _emit_socket_error(
            "INVALID_REPORT_ID",
            "유효한 report_id가 필요합니다.",
            status=400,
        )
        return

    user = _get_socket_user()

    if not user:
        _emit_socket_error(
            "UNAUTHORIZED",
            "인증 정보가 없습니다. 다시 로그인 후 시도해주세요.",
            status=401,
        )
        disconnect()
        return

    try:
        report = db.session.get(IncidentReport, report_id)
    except Exception:
        current_app.logger.exception("Failed to load report. report_id=%s", report_id)
        _emit_socket_error(
            "REPORT_LOOKUP_FAILED",
            "신고 정보를 확인하는 중 오류가 발생했습니다.",
            status=500,
        )
        return

    if report is None:
        _emit_socket_error(
            "REPORT_NOT_FOUND",
            "신고 정보를 찾을 수 없습니다.",
            status=404,
        )
        return

    if not _user_can_access_report(user, report):
        _emit_socket_error(
            "FORBIDDEN",
            "해당 신고에 접근할 권한이 없습니다.",
            status=403,
        )
        return

    room = f"report:{report_id}"
    join_room(room)

    emit(
        "report_joined",
        {
            "success": True,
            "report_id": report_id,
            "room": room,
        },
    )


@socketio.on("leave_report")
def handle_leave_report(payload):
    report_id = _parse_report_id(payload)

    if report_id is None:
        _emit_socket_error(
            "INVALID_REPORT_ID",
            "유효한 report_id가 필요합니다.",
            status=400,
        )
        return

    room = f"report:{report_id}"
    leave_room(room)

    emit(
        "report_left",
        {
            "success": True,
            "report_id": report_id,
            "room": room,
        },
    )
