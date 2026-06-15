"""auth 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: flask에서 Blueprint, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify, request

# 설명: app.modules.auth.service에서 AuthError, AuthService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.auth.service import AuthError, AuthService
# 설명: app.utils.security에서 require_auth, require_roles 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import require_auth, require_roles


# 설명: `auth_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


# 설명: `auth_health` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.get("/health")
def auth_health():
    # 설명: 호출자에게 jsonify({'status': 'ok', 'service': 'auth'}) 값을 함수 결과로 반환한다.
    return jsonify(
        {
            "status": "ok",
            "service": "auth",
        }
    )


# 설명: `signup` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.post("/signup")
def signup():
    # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    data = request.get_json(silent=True) or {}

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.signup` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.signup(
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify({'message': 'Signup request created.', 'data': result}), 201) 값을 함수 결과로 반환한다.
        return jsonify(
            {
                "message": "Signup request created.",
                "data": result,
            }
        ), 201

    except AuthError as error:
        # 설명: 호출자에게 (jsonify(error.to_dict()), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify(error.to_dict()), error.status_code


# 설명: `verify_email` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.post("/verify-email")
def verify_email():
    # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    data = request.get_json(silent=True) or {}

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.verify_email` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.verify_email(
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify({'message': 'Email verified.', 'data': result}), 200) 값을 함수 결과로 반환한다.
        return jsonify(
            {
                "message": "Email verified.",
                "data": result,
            }
        ), 200

    except AuthError as error:
        # 설명: 호출자에게 (jsonify(error.to_dict()), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify(error.to_dict()), error.status_code


# 설명: `resend_email_verification` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.post("/verify-email/resend")
def resend_email_verification():
    # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    data = request.get_json(silent=True) or {}

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.resend_email_verification` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.resend_email_verification(
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify({'code': 'EMAIL_VERIFICATION_RESENT', 'message': '인증번호가 다시 발송되었습니다.', ... 값을 함수 결과로 반환한다.
        return jsonify(
            {
                "code": "EMAIL_VERIFICATION_RESENT",
                "message": "인증번호가 다시 발송되었습니다.",
                "data": result,
                "retry_after": result.get("email_verification", {}).get(
                    "retry_after",
                    AuthService._get_email_verification_cooldown_seconds(),
                ),
            }
        ), 200

    except AuthError as error:
        # 설명: 호출자에게 (jsonify(error.to_dict()), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify(error.to_dict()), error.status_code


# 설명: `login` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.post("/login")
def login():
    # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    data = request.get_json(silent=True) or {}

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.login` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.login(
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify(result), 200) 값을 함수 결과로 반환한다.
        return jsonify(result), 200

    except AuthError as error:
        # 설명: 호출자에게 (jsonify(error.to_dict()), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify(error.to_dict()), error.status_code


# 설명: `me` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.get("/me")
@require_auth
def me():
    # 설명: 호출자에게 jsonify({'user': request.current_user.to_public_dict()}) 값을 함수 결과로 반환한다.
    return jsonify(
        {
            "user": request.current_user.to_public_dict(),
        }
    )



# 설명: `update_my_profile` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
@auth_bp.patch("/me/profile")
@require_auth
def update_my_profile():
    # 설명: `data`에 `request.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    data = request.get_json(silent=True)

    # 설명: `data is None` 조건 결과에 따라 실행 경로를 분기한다.
    if data is None:
        # 설명: `data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        data = {}

    # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
    if not isinstance(data, dict):
        # 설명: 호출자에게 (jsonify({'message': 'Request body must be a JSON object.'}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"message": "Request body must be a JSON object."}), 400

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.update_my_profile` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.update_my_profile(
            user=request.current_user,
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify({'message': 'Profile updated.', 'user': result}), 200) 값을 함수 결과로 반환한다.
        return jsonify(
            {
                "message": "Profile updated.",
                "user": result,
            }
        ), 200
    except AuthError as error:
        # 설명: 호출자에게 (jsonify(error.to_dict()), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify(error.to_dict()), error.status_code


# 설명: `change_my_password` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.patch("/me/password")
@require_auth
def change_my_password():
    # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    data = request.get_json(silent=True) or {}

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.change_my_password` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.change_my_password(
            user=request.current_user,
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify({'message': 'Password changed.', 'user': result}), 200) 값을 함수 결과로 반환한다.
        return jsonify(
            {
                "message": "Password changed.",
                "user": result,
            }
        ), 200

    except AuthError as error:
        # 설명: 호출자에게 (jsonify(error.to_dict()), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify(error.to_dict()), error.status_code


# 설명: `withdraw_my_account` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.delete("/me")
@require_auth
def withdraw_my_account():
    # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    data = request.get_json(silent=True) or {}

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.withdraw_my_account` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.withdraw_my_account(
            user=request.current_user,
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify({'message': 'Account withdrawn.', 'user': result}), 200) 값을 함수 결과로 반환한다.
        return jsonify(
            {
                "message": "Account withdrawn.",
                "user": result,
            }
        ), 200

    except AuthError as error:
        # 설명: 호출자에게 (jsonify(error.to_dict()), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify(error.to_dict()), error.status_code


# 설명: `list_users` 함수는 조건에 맞는 목록을 조회하는 함수다.
@auth_bp.get("/users")
@require_roles("SUPER_ADMIN", "AUTH_ADMIN")
def list_users():
    # 설명: 호출자에게 jsonify({'data': AuthService.list_users()}) 값을 함수 결과로 반환한다.
    return jsonify(
        {
            "data": AuthService.list_users(),
        }
    )


# 설명: `list_signup_requests` 함수는 조건에 맞는 목록을 조회하는 함수다.
@auth_bp.get("/signup-requests")
@require_roles("SUPER_ADMIN", "AUTH_ADMIN")
def list_signup_requests():
    # 설명: `request_status`에 `request.args.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    request_status = request.args.get("status")

    # 설명: 호출자에게 jsonify({'data': AuthService.list_signup_requests(request_status=request_status)}) 값을 함수 결과로 반환한다.
    return jsonify(
        {
            "data": AuthService.list_signup_requests(request_status=request_status),
        }
    )


# 설명: `approve_signup_request` 함수는 대상을 승인 상태로 전환하는 함수다.
@auth_bp.post("/signup-requests/<int:signup_request_id>/approve")
@require_roles("SUPER_ADMIN", "AUTH_ADMIN")
def approve_signup_request(signup_request_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.approve_signup_request` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.approve_signup_request(
            signup_request_id=signup_request_id,
            reviewer_user=request.current_user,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify({'message': 'Signup request approved.', 'data': result}), 200) 값을 함수 결과로 반환한다.
        return jsonify(
            {
                "message": "Signup request approved.",
                "data": result,
            }
        ), 200

    except AuthError as error:
        # 설명: 호출자에게 (jsonify(error.to_dict()), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify(error.to_dict()), error.status_code


# 설명: `reject_signup_request` 함수는 대상을 반려 상태로 전환하는 함수다.
@auth_bp.post("/signup-requests/<int:signup_request_id>/reject")
@require_roles("SUPER_ADMIN", "AUTH_ADMIN")
def reject_signup_request(signup_request_id):
    # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    data = request.get_json(silent=True) or {}

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.reject_signup_request` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.reject_signup_request(
            signup_request_id=signup_request_id,
            reviewer_user=request.current_user,
            reject_reason=data.get("reject_reason"),
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify({'message': 'Signup request rejected.', 'data': result}), 200) 값을 함수 결과로 반환한다.
        return jsonify(
            {
                "message": "Signup request rejected.",
                "data": result,
            }
        ), 200

    except AuthError as error:
        # 설명: 호출자에게 (jsonify(error.to_dict()), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify(error.to_dict()), error.status_code

# 설명: `start_signup_google_identity_verification` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.post("/signup/identity/google/start")
def start_signup_google_identity_verification():
    # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    data = request.get_json(silent=True) or {}

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.start_google_identity_verification` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.start_google_identity_verification(
            data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify({'message': 'Google signup identity verification started.', 'data': re... 값을 함수 결과로 반환한다.
        return jsonify({
            "message": "Google signup identity verification started.",
            "data": result,
        }), 200

    except AuthError as error:
        # 설명: 호출자에게 (jsonify({'message': error.message}), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify({
            "message": error.message,
        }), error.status_code


# 설명: `start_google_identity_verification` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.post("/identity/google/start")
@require_auth
def start_google_identity_verification():
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
        data = request.get_json(silent=True) or {}
        # 설명: `data['email']`에 request.current_user.email 표현식의 계산 결과를 저장한다.
        data["email"] = request.current_user.email

        # 설명: `result`에 `AuthService.start_google_identity_verification` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.start_google_identity_verification(
            data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 (jsonify({'message': 'Google identity verification started.', 'data': result}),... 값을 함수 결과로 반환한다.
        return jsonify({
            "message": "Google identity verification started.",
            "data": result,
        }), 200

    except AuthError as error:
        # 설명: 호출자에게 (jsonify({'message': error.message}), error.status_code) 값을 함수 결과로 반환한다.
        return jsonify({
            "message": error.message,
        }), error.status_code


# 설명: `complete_google_identity_verification` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@auth_bp.get("/identity/google/callback")
def complete_google_identity_verification():
    # 설명: flask에서 redirect 이름을 가져와 아래 로직에서 재사용한다.
    from flask import redirect

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.complete_google_identity_verification` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.complete_google_identity_verification(
            request.args,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        # 설명: 호출자에게 redirect(result['redirect_url']) 값을 함수 결과로 반환한다.
        return redirect(result["redirect_url"])

    except AuthError as error:
        # 설명: `redirect_url`에 `AuthService._build_identity_result_redirect` 호출 결과를 저장해 다음 처리에서 사용한다.
        redirect_url = AuthService._build_identity_result_redirect(
            provider="google",
            status="failed",
            message=error.message,
        )
        # 설명: 호출자에게 redirect(redirect_url) 값을 함수 결과로 반환한다.
        return redirect(redirect_url)
