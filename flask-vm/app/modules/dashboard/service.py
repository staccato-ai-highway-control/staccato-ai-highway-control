from sqlalchemy import or_

from app.models import Notification, SignupRequest, User


SUPER_ADMIN_ROLE = "SUPER_ADMIN"
PENDING_SIGNUP_STATUSES = ("REQUESTED", "PENDING")


def get_dashboard_summary(current_user):
    users_summary = {
        "total": None,
        "pending_signup": None,
    }

    if current_user.role == SUPER_ADMIN_ROLE:
        users_summary = {
            "total": User.query.count(),
            "pending_signup": SignupRequest.query.filter(
                SignupRequest.request_status.in_(PENDING_SIGNUP_STATUSES)
            ).count(),
        }

    unread_count = Notification.query.filter(
        Notification.user_id == current_user.id,
        or_(Notification.is_read == 0, Notification.is_read.is_(False)),
    ).count()

    return {
        "users": users_summary,
        "notifications": {
            "unread_count": unread_count,
        },
    }
