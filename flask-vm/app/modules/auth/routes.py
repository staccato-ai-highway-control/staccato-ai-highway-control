from flask import Blueprint, jsonify, request

from app.modules.auth.service import AuthError, AuthService
from app.utils.security import require_auth, require_roles


auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.get("/health")
def auth_health():
    return jsonify(
        {
            "status": "ok",
            "service": "auth",
        }
    )


@auth_bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}

    try:
        result = AuthService.signup(
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        return jsonify(
            {
                "message": "Signup request created.",
                "data": result,
            }
        ), 201

    except AuthError as error:
        return jsonify({"message": error.message}), error.status_code


@auth_bp.post("/verify-email")
def verify_email():
    data = request.get_json(silent=True) or {}

    try:
        result = AuthService.verify_email(
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        return jsonify(
            {
                "message": "Email verified.",
                "data": result,
            }
        ), 200

    except AuthError as error:
        return jsonify({"message": error.message}), error.status_code


@auth_bp.post("/verify-email/resend")
def resend_email_verification():
    data = request.get_json(silent=True) or {}

    try:
        result = AuthService.resend_email_verification(
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        return jsonify(
            {
                "message": "Email verification resent.",
                "data": result,
            }
        ), 200

    except AuthError as error:
        return jsonify({"message": error.message}), error.status_code


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    try:
        result = AuthService.login(
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        return jsonify(result), 200

    except AuthError as error:
        return jsonify({"message": error.message}), error.status_code


@auth_bp.get("/me")
@require_auth
def me():
    return jsonify(
        {
            "user": request.current_user.to_public_dict(),
        }
    )


@auth_bp.patch("/me/password")
@require_auth
def change_my_password():
    data = request.get_json(silent=True) or {}

    try:
        result = AuthService.change_my_password(
            user=request.current_user,
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        return jsonify(
            {
                "message": "Password changed.",
                "user": result,
            }
        ), 200

    except AuthError as error:
        return jsonify({"message": error.message}), error.status_code


@auth_bp.delete("/me")
@require_auth
def withdraw_my_account():
    data = request.get_json(silent=True) or {}

    try:
        result = AuthService.withdraw_my_account(
            user=request.current_user,
            data=data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        return jsonify(
            {
                "message": "Account withdrawn.",
                "user": result,
            }
        ), 200

    except AuthError as error:
        return jsonify({"message": error.message}), error.status_code


@auth_bp.get("/users")
@require_roles("SUPER_ADMIN", "AUTH_ADMIN")
def list_users():
    return jsonify(
        {
            "data": AuthService.list_users(),
        }
    )


@auth_bp.get("/signup-requests")
@require_roles("SUPER_ADMIN", "AUTH_ADMIN")
def list_signup_requests():
    request_status = request.args.get("status")

    return jsonify(
        {
            "data": AuthService.list_signup_requests(request_status=request_status),
        }
    )


@auth_bp.post("/signup-requests/<int:signup_request_id>/approve")
@require_roles("SUPER_ADMIN", "AUTH_ADMIN")
def approve_signup_request(signup_request_id):
    try:
        result = AuthService.approve_signup_request(
            signup_request_id=signup_request_id,
            reviewer_user=request.current_user,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        return jsonify(
            {
                "message": "Signup request approved.",
                "data": result,
            }
        ), 200

    except AuthError as error:
        return jsonify({"message": error.message}), error.status_code


@auth_bp.post("/signup-requests/<int:signup_request_id>/reject")
@require_roles("SUPER_ADMIN", "AUTH_ADMIN")
def reject_signup_request(signup_request_id):
    data = request.get_json(silent=True) or {}

    try:
        result = AuthService.reject_signup_request(
            signup_request_id=signup_request_id,
            reviewer_user=request.current_user,
            reject_reason=data.get("reject_reason"),
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        return jsonify(
            {
                "message": "Signup request rejected.",
                "data": result,
            }
        ), 200

    except AuthError as error:
        return jsonify({"message": error.message}), error.status_code

@auth_bp.post("/identity/google/start")
def start_google_identity_verification():
    try:
        result = AuthService.start_google_identity_verification(
            request.get_json(silent=True) or {},
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        return jsonify({
            "message": "Google identity verification started.",
            "data": result,
        }), 200

    except AuthError as error:
        return jsonify({
            "message": error.message,
        }), error.status_code


@auth_bp.get("/identity/google/callback")
def complete_google_identity_verification():
    from flask import redirect

    try:
        result = AuthService.complete_google_identity_verification(
            request.args,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

        return redirect(result["redirect_url"])

    except AuthError as error:
        redirect_url = AuthService._build_identity_result_redirect(
            provider="google",
            status="failed",
            message=error.message,
        )
        return redirect(redirect_url)
