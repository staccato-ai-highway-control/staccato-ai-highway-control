from decimal import Decimal

from app.extensions import db


class ChatRoom(db.Model):
    __tablename__ = "chat_rooms"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    room_type = db.Column(db.String(50), nullable=False)
    room_status = db.Column(db.String(50), nullable=False)
    created_by = db.Column(db.BigInteger, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    closed_at = db.Column(db.DateTime, nullable=True)

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


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    room_id = db.Column(db.BigInteger, db.ForeignKey("chat_rooms.id"), nullable=False)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    sender_user_id = db.Column(db.BigInteger, nullable=True)
    message_type = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=False)
    attachment_id = db.Column(db.BigInteger, db.ForeignKey("board_attachments.id"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)

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


class ChatMessageRead(db.Model):
    __tablename__ = "chat_message_reads"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    message_id = db.Column(db.BigInteger, db.ForeignKey("chat_messages.id"), nullable=False)
    user_id = db.Column(db.BigInteger, nullable=False)
    read_at = db.Column(db.DateTime, nullable=False)

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
