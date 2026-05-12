from decimal import Decimal

from app.extensions import db


class ReportLocation(db.Model):
    __tablename__ = "report_locations"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    cctv_id = db.Column(db.BigInteger, nullable=True)
    location_source = db.Column(db.String(30), nullable=False)
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    longitude = db.Column(db.Numeric(10, 7), nullable=True)
    road_address = db.Column(db.String(255), nullable=True)
    jibun_address = db.Column(db.String(255), nullable=True)
    place_name = db.Column(db.String(255), nullable=True)
    road_name = db.Column(db.String(100), nullable=True)
    tunnel_name = db.Column(db.String(100), nullable=True)
    direction = db.Column(db.String(30), nullable=True)
    lane_info = db.Column(db.String(50), nullable=True)
    address_provider = db.Column(db.String(30), nullable=True)
    address_raw = db.Column(db.JSON, nullable=True)
    confidence = db.Column(db.Numeric(4, 3), nullable=True)
    is_location_confirmed = db.Column(db.Integer, nullable=False)
    confirmed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

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


class ReportMemo(db.Model):
    __tablename__ = "report_memos"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    author_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    memo_type = db.Column(db.String(30), nullable=False)
    content = db.Column(db.Text, nullable=False)
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


class ReportStatusHistory(db.Model):
    __tablename__ = "report_status_histories"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    previous_status = db.Column(db.String(30), nullable=True)
    new_status = db.Column(db.String(30), nullable=False)
    changed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
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

