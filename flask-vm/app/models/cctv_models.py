from decimal import Decimal

from app.extensions import db


class Cctv(db.Model):
    __tablename__ = "cctvs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    cctv_code = db.Column(db.String(50), nullable=False)
    cctv_name = db.Column(db.String(100), nullable=False)
    stream_url = db.Column(db.String(500), nullable=True)
    location_name = db.Column(db.String(255), nullable=True)
    road_name = db.Column(db.String(100), nullable=True)
    direction = db.Column(db.String(50), nullable=True)
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    longitude = db.Column(db.Numeric(10, 7), nullable=True)
    is_active = db.Column(db.Integer, nullable=False)
    installed_at = db.Column(db.Date, nullable=True)
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


class CctvRoi(db.Model):
    __tablename__ = "cctv_rois"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    cctv_id = db.Column(db.BigInteger, db.ForeignKey("cctvs.id"), nullable=False)
    roi_type = db.Column(db.String(50), nullable=False)
    roi_name = db.Column(db.String(100), nullable=False)
    polygon_json = db.Column(db.JSON, nullable=False)
    is_active = db.Column(db.Integer, nullable=False)
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


class CctvStatusLog(db.Model):
    __tablename__ = "cctv_status_logs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    cctv_id = db.Column(db.BigInteger, db.ForeignKey("cctvs.id"), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=True)
    checked_at = db.Column(db.DateTime, nullable=False)
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

