from flask import Blueprint, jsonify, request

from app.services.auth_service import AuthError, AuthService
from app.utils.security import require_auth


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
