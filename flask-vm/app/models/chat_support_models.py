from decimal import Decimal

from app.extensions import db


class ChatRoomMember(db.Model):
    __tablename__ = "chat_room_members"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    room_id = db.Column(db.BigInteger, db.ForeignKey("chat_rooms.id"), nullable=False)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    member_role = db.Column(db.String(50), nullable=False)
    joined_at = db.Column(db.DateTime, nullable=False)
    left_at = db.Column(db.DateTime, nullable=True)

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

