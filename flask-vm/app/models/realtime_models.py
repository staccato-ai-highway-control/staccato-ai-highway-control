from decimal import Decimal

from app.extensions import db


class RealtimeEvent(db.Model):
    __tablename__ = "realtime_events"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    event_type = db.Column(db.String(50), nullable=False)
    event_name = db.Column(db.String(100), nullable=False)
    target_user_id = db.Column(db.BigInteger, nullable=True)
    target_role = db.Column(db.String(30), nullable=True)
    target_room = db.Column(db.String(100), nullable=True)
    target_resource_type = db.Column(db.String(50), nullable=True)
    target_resource_id = db.Column(db.BigInteger, nullable=True)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    payload = db.Column(db.JSON, nullable=True)
    send_status = db.Column(db.String(30), nullable=False, default="PENDING")
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    sent_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        data = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            elif isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data
