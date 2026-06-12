"""socketio 도메인의 Socket.IO 수신 이벤트와 연결 수명주기를 처리한다.

소켓 인증, 룸 접근 권한, 입력 검증 실패를 클라이언트 이벤트 계약으로 변환한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: flask에서 current_app, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import current_app, request
# 설명: flask_socketio에서 disconnect, emit, join_room, leave_room 이름을 가져와 아래 로직에서 재사용한다.
from flask_socketio import disconnect, emit, join_room, leave_room

# 설명: app.extensions에서 db, socketio 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db, socketio
# 설명: app.models에서 IncidentReport, ReportAnalysisJob 이름을 가져와 아래 로직에서 재사용한다.
from app.models import IncidentReport, ReportAnalysisJob
# 설명: app.models.auth_models에서 User 이름을 가져와 아래 로직에서 재사용한다.
from app.models.auth_models import User
# 설명: app.utils.security에서 decode_access_token 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import decode_access_token


# 설명: `ADMIN_ROLES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
ADMIN_ROLES = {
    "SUPER_ADMIN",
    "ADMIN",
    "CONTROL_ADMIN",
    "CONTROL_CENTER",
}

# Socket.IO request.environ is not a durable per-client store.
# Keep a small sid -> user_id mapping and clean it on disconnect.
_SID_TO_USER_ID: dict[str, int] = {}


# 설명: `_clean_token` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _clean_token(raw_token: str | None) -> str | None:
    # 설명: `not raw_token` 조건 결과에 따라 실행 경로를 분기한다.
    if not raw_token:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `token`에 `str(raw_token).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    token = str(raw_token).strip()

    # 설명: `token.lower().startswith('bearer ')` 조건 결과에 따라 실행 경로를 분기한다.
    if token.lower().startswith("bearer "):
        # 설명: `token`에 `token[7:].strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = token[7:].strip()

    # 설명: 호출자에게 token or None 값을 함수 결과로 반환한다.
    return token or None


# 설명: `_get_handshake_token` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_handshake_token(auth) -> str | None:
    """
    Accept both frontend-friendly auth token and Authorization header.

    Supported:
    - io(API_BASE_URL, { auth: { token: accessToken } })
    - Authorization: Bearer accessToken
    """
    # 설명: `isinstance(auth, dict)` 조건 결과에 따라 실행 경로를 분기한다.
    if isinstance(auth, dict):
        # 설명: `token`에 `_clean_token` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = _clean_token(auth.get("token"))
        # 설명: `token` 조건 결과에 따라 실행 경로를 분기한다.
        if token:
            # 설명: 호출자에게 token 값을 함수 결과로 반환한다.
            return token

    # 설명: 호출자에게 _clean_token(request.headers.get('Authorization')) 값을 함수 결과로 반환한다.
    return _clean_token(request.headers.get("Authorization"))


# 설명: `_emit_socket_error` 함수는 실시간 이벤트를 클라이언트에 전송하는 함수다.
def _emit_socket_error(code: str, message: str, status: int = 400) -> None:
    # 설명: `emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    emit(
        "socket_error",
        {
            "success": False,
            "code": code,
            "message": message,
            "status": status,
        },
    )


# 설명: `_parse_report_id` 함수는 외부 입력을 내부 타입으로 해석하는 함수다.
def _parse_report_id(payload) -> int | None:
    # 설명: `not isinstance(payload, dict)` 조건 결과에 따라 실행 경로를 분기한다.
    if not isinstance(payload, dict):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `raw_report_id`에 `payload.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw_report_id = payload.get("report_id")

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `report_id`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        report_id = int(raw_report_id)
    except (TypeError, ValueError):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `report_id <= 0` 조건 결과에 따라 실행 경로를 분기한다.
    if report_id <= 0:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 report_id 값을 함수 결과로 반환한다.
    return report_id


# 설명: `_authenticate_socket_user` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _authenticate_socket_user(auth):
    # 설명: `token`에 `_get_handshake_token` 호출 결과를 저장해 다음 처리에서 사용한다.
    token = _get_handshake_token(auth)

    # 설명: `not token` 조건 결과에 따라 실행 경로를 분기한다.
    if not token:
        # 설명: 호출자에게 (None, 'MISSING_TOKEN') 값을 함수 결과로 반환한다.
        return None, "MISSING_TOKEN"

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `payload`에 `decode_access_token` 호출 결과를 저장해 다음 처리에서 사용한다.
        payload = decode_access_token(token)
        # 설명: `user_id`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        user_id = int(payload["sub"])
    except Exception:
        # 설명: `current_app.logger.info`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        current_app.logger.info("Socket authentication failed: invalid or expired token")
        # 설명: 호출자에게 (None, 'INVALID_TOKEN') 값을 함수 결과로 반환한다.
        return None, "INVALID_TOKEN"

    # 설명: `user`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = db.session.get(User, user_id)

    # 설명: `not user` 조건 결과에 따라 실행 경로를 분기한다.
    if not user:
        # 설명: 호출자에게 (None, 'USER_NOT_FOUND') 값을 함수 결과로 반환한다.
        return None, "USER_NOT_FOUND"

    # 설명: `getattr(user, 'account_status', None) != 'ACTIVE'` 조건 결과에 따라 실행 경로를 분기한다.
    if getattr(user, "account_status", None) != "ACTIVE":
        # 설명: 호출자에게 (None, 'ACCOUNT_INACTIVE') 값을 함수 결과로 반환한다.
        return None, "ACCOUNT_INACTIVE"

    # 설명: 호출자에게 (user, None) 값을 함수 결과로 반환한다.
    return user, None


# 설명: `_get_socket_user` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_socket_user():
    # 설명: `user_id`에 `_SID_TO_USER_ID.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    user_id = _SID_TO_USER_ID.get(request.sid)

    # 설명: `not user_id` 조건 결과에 따라 실행 경로를 분기한다.
    if not user_id:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 db.session.get(User, user_id) 값을 함수 결과로 반환한다.
    return db.session.get(User, user_id)


# 설명: `_user_can_access_report` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _user_can_access_report(user: User, report: IncidentReport) -> bool:
    """
    Conservative access rule.

    - Admin/control roles can access all reports.
    - Normal users can access only when a known ownership field matches.
    - If the model has no recognizable ownership field, deny by default.
    """
    # 설명: `user is None or report is None` 조건 결과에 따라 실행 경로를 분기한다.
    if user is None or report is None:
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False

    # 설명: `role`에 `str(getattr(user, 'role', '') or '').upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    role = str(getattr(user, "role", "") or "").upper()
    # 설명: `role in ADMIN_ROLES` 조건 결과에 따라 실행 경로를 분기한다.
    if role in ADMIN_ROLES:
        # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
        return True

    # 설명: `user_id`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
    user_id = getattr(user, "id", None)

    # 설명: `owner_fields`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
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

    # 설명: `owner_fields`의 각 항목을 `field`로 받아 반복 처리한다.
    for field in owner_fields:
        # 설명: `hasattr(report, field) and getattr(report, field) == user_id` 조건 결과에 따라 실행 경로를 분기한다.
        if hasattr(report, field) and getattr(report, field) == user_id:
            # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
            return True

    # 설명: `requested_job_exists`에 ReportAnalysisJob.query.filter(ReportAnalysisJob.report_id == report.... 표현식의 계산 결과를 저장한다.
    requested_job_exists = (
        ReportAnalysisJob.query
        .filter(
            ReportAnalysisJob.report_id == report.id,
            ReportAnalysisJob.requested_by == user_id,
        )
        .first()
        is not None
    )

    # 설명: `requested_job_exists` 조건 결과에 따라 실행 경로를 분기한다.
    if requested_job_exists:
        # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
        return True

    # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
    return False


# 설명: `handle_connect` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@socketio.on("connect")
def handle_connect(auth=None):
    # 설명: `(user, error_code)`에 `_authenticate_socket_user` 호출 결과를 저장해 다음 처리에서 사용한다.
    user, error_code = _authenticate_socket_user(auth)

    # 설명: `error_code` 조건 결과에 따라 실행 경로를 분기한다.
    if error_code:
        # 설명: `current_app.logger.info`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        current_app.logger.info("Socket connect rejected: %s", error_code)
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False

    # 설명: `_SID_TO_USER_ID[request.sid]`에 user.id 표현식의 계산 결과를 저장한다.
    _SID_TO_USER_ID[request.sid] = user.id

    # 설명: `emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    emit(
        "socket_connected",
        {
            "success": True,
            "user_id": user.id,
            "role": getattr(user, "role", None),
        },
    )


# 설명: `handle_disconnect` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@socketio.on("disconnect")
def handle_disconnect():
    # 설명: `_SID_TO_USER_ID.pop`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    _SID_TO_USER_ID.pop(request.sid, None)
    # 설명: `current_app.logger.info`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    current_app.logger.info("Socket disconnected. sid=%s", request.sid)


# 설명: `handle_join_report` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@socketio.on("join_report")
def handle_join_report(payload):
    # 설명: `report_id`에 `_parse_report_id` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_id = _parse_report_id(payload)

    # 설명: `report_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if report_id is None:
        # 설명: `_emit_socket_error`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _emit_socket_error(
            "INVALID_REPORT_ID",
            "유효한 report_id가 필요합니다.",
            status=400,
        )
        # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
        return

    # 설명: `user`에 `_get_socket_user` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = _get_socket_user()

    # 설명: `not user` 조건 결과에 따라 실행 경로를 분기한다.
    if not user:
        # 설명: `_emit_socket_error`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _emit_socket_error(
            "UNAUTHORIZED",
            "인증 정보가 없습니다. 다시 로그인 후 시도해주세요.",
            status=401,
        )
        # 설명: `disconnect`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        disconnect()
        # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
        return

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
    except Exception:
        # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        current_app.logger.exception("Failed to load report. report_id=%s", report_id)
        # 설명: `_emit_socket_error`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _emit_socket_error(
            "REPORT_LOOKUP_FAILED",
            "신고 정보를 확인하는 중 오류가 발생했습니다.",
            status=500,
        )
        # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
        return

    # 설명: `report is None` 조건 결과에 따라 실행 경로를 분기한다.
    if report is None:
        # 설명: `_emit_socket_error`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _emit_socket_error(
            "REPORT_NOT_FOUND",
            "신고 정보를 찾을 수 없습니다.",
            status=404,
        )
        # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
        return

    # 설명: `not _user_can_access_report(user, report)` 조건 결과에 따라 실행 경로를 분기한다.
    if not _user_can_access_report(user, report):
        # 설명: `_emit_socket_error`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _emit_socket_error(
            "FORBIDDEN",
            "해당 신고에 접근할 권한이 없습니다.",
            status=403,
        )
        # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
        return

    # 설명: `room`에 f'report:{report_id}' 표현식의 계산 결과를 저장한다.
    room = f"report:{report_id}"
    # 설명: `join_room`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    join_room(room)

    # 설명: `emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    emit(
        "report_joined",
        {
            "success": True,
            "report_id": report_id,
            "room": room,
        },
    )


# 설명: `handle_leave_report` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@socketio.on("leave_report")
def handle_leave_report(payload):
    # 설명: `report_id`에 `_parse_report_id` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_id = _parse_report_id(payload)

    # 설명: `report_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if report_id is None:
        # 설명: `_emit_socket_error`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _emit_socket_error(
            "INVALID_REPORT_ID",
            "유효한 report_id가 필요합니다.",
            status=400,
        )
        # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
        return

    # 설명: `room`에 f'report:{report_id}' 표현식의 계산 결과를 저장한다.
    room = f"report:{report_id}"
    # 설명: `leave_room`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    leave_room(room)

    # 설명: `emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    emit(
        "report_left",
        {
            "success": True,
            "report_id": report_id,
            "room": room,
        },
    )
