from datetime import datetime

from sqlalchemy import or_

from app.extensions import db
from app.models.auth_models import User
from app.models.incident_models import Incident
from app.models.notification_models import Notification, NotificationDelivery


ALLOWED_NOTIFICATION_TYPES = {
    "AI_DETECTION",
    "INCIDENT_STATUS",
    "SYSTEM",
    "REPORT",
    "MLOPS",
}

ALLOWED_PRIORITIES = {
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
}

ALLOWED_DELIVERY_CHANNELS = {
    "WEB_SOCKET",
    "WEB",
    "EMAIL",
    "SMS",
    "PUSH",
}


class NotificationError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotificationService:
    @staticmethod
    def list_notifications(user, unread_only=False):
        query = Notification.query.filter(
            or_(
                Notification.user_id == user.id,
                Notification.user_id.is_(None),
            )
        ).order_by(Notification.created_at.desc(), Notification.id.desc())

        if unread_only:
            query = query.filter_by(is_read=False)

        return [notification.to_dict() for notification in query.all()]

    @staticmethod
    def get_unread_count(user):
        count = Notification.query.filter(
            or_(
                Notification.user_id == user.id,
                Notification.user_id.is_(None),
            ),
            Notification.is_read == False,  # noqa: E712
        ).count()

        return {
            "unread_count": count,
        }

    @staticmethod
    def create_notification(data, actor_user=None):
        user_id = data.get("user_id")
        incident_id = data.get("incident_id")
        notification_type = data.get("notification_type", "SYSTEM")
        title = (data.get("title") or "").strip()
        message = (data.get("message") or "").strip()
        priority = data.get("priority", "MEDIUM")
        delivery_channel = data.get("delivery_channel", "WEB_SOCKET")

        if notification_type not in ALLOWED_NOTIFICATION_TYPES:
            raise NotificationError("Invalid notification_type.", 400)

        if priority not in ALLOWED_PRIORITIES:
            raise NotificationError("Invalid priority.", 400)

        if delivery_channel not in ALLOWED_DELIVERY_CHANNELS:
            raise NotificationError("Invalid delivery_channel.", 400)

        if not title:
            raise NotificationError("title is required.", 400)

        if not message:
            raise NotificationError("message is required.", 400)

        if user_id:
            user = User.query.get(user_id)

            if not user:
                raise NotificationError("Target user not found.", 404)

        if incident_id:
            incident = Incident.query.get(incident_id)

            if not incident:
                raise NotificationError("Incident not found.", 404)

        now = datetime.utcnow()

        notification = Notification(
            user_id=user_id,
            incident_id=incident_id,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            is_read=False,
            created_at=now,
        )

        db.session.add(notification)
        db.session.flush()

        delivery = NotificationDelivery(
            notification_id=notification.id,
            user_id=user_id,
            delivery_channel=delivery_channel,
            delivery_status="PENDING",
            created_at=now,
        )

        db.session.add(delivery)
        db.session.commit()

        notification_payload = notification.to_dict()

        try:
            from app.sockets.notification_socket import emit_notification_created

            emit_notification_created(
                notification=notification_payload,
                user_id=user_id,
            )
        except Exception:
            pass

        return {
            "notification": notification_payload,
            "delivery": delivery.to_dict(),
        }

    @staticmethod
    def mark_as_read(notification_id, user):
        notification = Notification.query.filter(
            Notification.id == notification_id,
            or_(
                Notification.user_id == user.id,
                Notification.user_id.is_(None),
            ),
        ).first()

        if not notification:
            raise NotificationError("Notification not found.", 404)

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()

        delivery = NotificationDelivery.query.filter_by(
            notification_id=notification.id,
            user_id=user.id,
        ).first()

        if delivery:
            delivery.delivery_status = "READ"

        db.session.commit()

        return notification.to_dict()

    @staticmethod
    def mark_all_as_read(user):
        now = datetime.utcnow()

        notifications = Notification.query.filter(
            or_(
                Notification.user_id == user.id,
                Notification.user_id.is_(None),
            ),
            Notification.is_read == False,  # noqa: E712
        ).all()

        for notification in notifications:
            notification.is_read = True
            notification.read_at = now

        deliveries = NotificationDelivery.query.filter_by(
            user_id=user.id,
        ).all()

        for delivery in deliveries:
            if delivery.delivery_status in {"PENDING", "SENT"}:
                delivery.delivery_status = "READ"

        db.session.commit()

        return {
            "updated_count": len(notifications),
        }
