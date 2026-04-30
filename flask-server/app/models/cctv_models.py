from app.extensions import db


class Cctv(db.Model):
    __tablename__ = "cctvs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    cctv_code = db.Column(db.String(50), nullable=False, unique=True)
    cctv_name = db.Column(db.String(100), nullable=False)
    stream_url = db.Column(db.String(500), nullable=True)
    location_name = db.Column(db.String(255), nullable=True)
    road_name = db.Column(db.String(100), nullable=True)
    direction = db.Column(db.String(50), nullable=True)
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    longitude = db.Column(db.Numeric(10, 7), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    installed_at = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "cctv_code": self.cctv_code,
            "cctv_name": self.cctv_name,
            "stream_url": self.stream_url,
            "location_name": self.location_name,
            "road_name": self.road_name,
            "direction": self.direction,
            "latitude": float(self.latitude) if self.latitude is not None else None,
            "longitude": float(self.longitude) if self.longitude is not None else None,
            "is_active": bool(self.is_active),
            "installed_at": self.installed_at.isoformat() if self.installed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CctvRoi(db.Model):
    __tablename__ = "cctv_rois"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    cctv_id = db.Column(db.BigInteger, db.ForeignKey("cctvs.id"), nullable=False)
    roi_type = db.Column(db.String(50), nullable=False)
    roi_name = db.Column(db.String(100), nullable=False)
    polygon_json = db.Column(db.JSON, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "cctv_id": self.cctv_id,
            "roi_type": self.roi_type,
            "roi_name": self.roi_name,
            "polygon_json": self.polygon_json,
            "is_active": bool(self.is_active),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
