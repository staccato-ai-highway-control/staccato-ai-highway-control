from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import current_app, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, password)


def create_access_token(user) -> str:
    expires_hours = int(current_app.config.get("JWT_EXPIRES_HOURS", 12))
    now = datetime.utcnow()

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(hours=expires_hours),
    }

    return jwt.encode(
        payload,
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        current_app.config["JWT_SECRET_KEY"],
        algorithms=["HS256"],
    )


def get_bearer_token():
    authorization = request.headers.get("Authorization", "")

    if not authorization.startswith("Bearer "):
        return None

    return authorization.replace("Bearer ", "", 1).strip()


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        from app.models.auth_models import User

        token = get_bearer_token()

        if not token:
            return jsonify({"message": "Authorization token is required."}), 401

        try:
            payload = decode_access_token(token)
            user_id = int(payload["sub"])
            user = User.query.get(user_id)
        except Exception:
            return jsonify({"message": "Invalid or expired token."}), 401

        if not user:
            return jsonify({"message": "User not found."}), 404

        if user.account_status != "ACTIVE":
            return jsonify({"message": "Account is not active."}), 403

        request.current_user = user

        return fn(*args, **kwargs)

    return wrapper


def require_roles(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        @require_auth
        def wrapper(*args, **kwargs):
            user = request.current_user

            if user.role not in allowed_roles:
                return jsonify({"message": "Permission denied."}), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator
