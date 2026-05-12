from decimal import Decimal

from app.extensions import db


class BoardReaction(db.Model):
    __tablename__ = "board_reactions"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    post_id = db.Column(db.BigInteger, db.ForeignKey("board_posts.id"), nullable=False)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    reaction_type = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)

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

