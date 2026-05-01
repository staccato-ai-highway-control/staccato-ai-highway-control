from flask import Blueprint, jsonify, request

from app.services.notification_service import NotificationError, NotificationService
from app.utils.security import require_auth, require_roles


notification_bp = Blueprint("notification", __name__, url_prefix="/notifications")


@notification_bp.get("")
@require_auth
def list_notifications():
    unread_only = request.args.get("unread_only", "false").lower() == "true"

    return jsonify(
        {
            "data": NotificationService.list_notifications(
                user=request.current_user,
                unread_only=unread_only,
            ),
        }
    )


@notification_bp.get("/unread-count")
@require_auth
def get_unread_count():
    return jsonify(
        {
            "data": NotificationService.get_unread_count(request.current_user),
        }
    )


@notification_bp.post("")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN")
def create_notification():
    data = request.get_json(silent=True) or {}

    try:
        result = NotificationService.create_notification(
            data=data,
            actor_user=request.current_user,
        )

        return jsonify(
            {
                "message": "Notification created.",
                "data": result,
            }
        ), 201

    except NotificationError as error:
        return jsonify({"message": error.message}), error.status_code


@notification_bp.patch("/<int:notification_id>/read")
@require_auth
def mark_notification_as_read(notification_id):
    try:
        result = NotificationService.mark_as_read(
            notification_id=notification_id,
            user=request.current_user,
        )

        return jsonify(
            {
                "message": "Notification marked as read.",
                "data": result,
            }
        )

    except NotificationError as error:
        return jsonify({"message": error.message}), error.status_code


@notification_bp.patch("/read-all")
@require_auth
def mark_all_notifications_as_read():
    result = NotificationService.mark_all_as_read(request.current_user)

    return jsonify(
        {
            "message": "All notifications marked as read.",
            "data": result,
        }
    )
