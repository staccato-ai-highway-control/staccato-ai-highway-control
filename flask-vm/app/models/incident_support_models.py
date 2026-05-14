from decimal import Decimal

from app.extensions import db


class IncidentStatusHistory(db.Model):
    __tablename__ = "incident_status_histories"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    previous_status = db.Column(db.String(50), nullable=True)
    new_status = db.Column(db.String(50), nullable=False)
    changed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    change_reason = db.Column(db.Text, nullable=True)
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


class IncidentMemo(db.Model):
    __tablename__ = "incident_memos"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    author_user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    memo_type = db.Column(db.String(50), nullable=False)
    memo = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)
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

