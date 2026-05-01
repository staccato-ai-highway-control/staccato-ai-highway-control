from flask import request
from flask_socketio import emit, join_room

from app.extensions import socketio
from app.models.auth_models import User
from app.utils.security import decode_access_token


def _extract_token(auth):
    token = None

    if isinstance(auth, dict):
        token = auth.get("token") or auth.get("access_token")

    if not token:
        token = request.args.get("token")

    if not token:
        authorization = request.headers.get("Authorization", "")
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "", 1).strip()

    if token and token.startswith("Bearer "):
        token = token.replace("Bearer ", "", 1).strip()

    return token


def _get_socket_user(auth):
    token = _extract_token(auth)

    if not token:
        return None

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
        user = User.query.get(user_id)
    except Exception:
        return None

    if not user:
        return None

    if user.account_status != "ACTIVE":
        return None

    return user


@socketio.on("connect")
def handle_connect(auth=None):
    user = _get_socket_user(auth)

    if not user:
        return False

    join_room(f"user:{user.id}")
    join_room(f"role:{user.role}")

    emit(
        "notification:connected",
        {
            "message": "Socket connected.",
            "user_id": user.id,
            "role": user.role,
        },
    )


@socketio.on("disconnect")
def handle_disconnect():
    pass


@socketio.on("notification:ping")
def handle_notification_ping(data=None):
    emit(
        "notification:pong",
        {
            "message": "pong",
            "data": data or {},
        },
    )


def emit_notification_created(notification, user_id=None):
    payload = {
        "notification": notification,
    }

    if user_id:
        socketio.emit(
            "notification_created",
            payload,
            room=f"user:{user_id}",
        )
        return

    socketio.emit("notification_created", payload)
