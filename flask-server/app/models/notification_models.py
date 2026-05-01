from app.extensions import db


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    notification_type = db.Column(db.String(50), nullable=False, default="SYSTEM")
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(50), nullable=False, default="MEDIUM")
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    read_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "incident_id": self.incident_id,
            "notification_type": self.notification_type,
            "title": self.title,
            "message": self.message,
            "priority": self.priority,
            "is_read": bool(self.is_read),
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class NotificationDelivery(db.Model):
    __tablename__ = "notification_deliveries"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    notification_id = db.Column(db.BigInteger, db.ForeignKey("notifications.id"), nullable=False)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    delivery_channel = db.Column(db.String(50), nullable=False, default="WEB_SOCKET")
    delivery_status = db.Column(db.String(50), nullable=False, default="PENDING")
    error_message = db.Column(db.Text, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "notification_id": self.notification_id,
            "user_id": self.user_id,
            "delivery_channel": self.delivery_channel,
            "delivery_status": self.delivery_status,
            "error_message": self.error_message,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
