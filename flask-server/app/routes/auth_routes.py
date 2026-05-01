from flask import Blueprint, jsonify, request

from app.services.auth_service import AuthError, AuthService
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
