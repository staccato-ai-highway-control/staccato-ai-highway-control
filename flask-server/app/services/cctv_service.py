from datetime import date, datetime

from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.cctv_models import Cctv, CctvRoi


ALLOWED_ROI_TYPES = {
    "DRIVING_LANE",
    "SHOULDER",
    "EMERGENCY_BAY",
    "IGNORE_AREA",
}


class CctvError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class CctvService:
    @staticmethod
    def _parse_date(value):
        if not value:
            return None

        if isinstance(value, date):
            return value

        try:
            return date.fromisoformat(value)
        except ValueError:
            raise CctvError("installed_at must be YYYY-MM-DD format.", 400)

    @staticmethod
    def list_cctvs(active_only=False):
        query = Cctv.query.order_by(Cctv.id.desc())

        if active_only:
            query = query.filter_by(is_active=True)

        return [cctv.to_dict() for cctv in query.all()]

    @staticmethod
    def get_cctv(cctv_id):
        cctv = Cctv.query.get(cctv_id)

        if not cctv:
            raise CctvError("CCTV not found.", 404)

        return cctv

    @staticmethod
    def create_cctv(data):
        cctv_code = (data.get("cctv_code") or "").strip()
        cctv_name = (data.get("cctv_name") or "").strip()

        if not cctv_code:
            raise CctvError("cctv_code is required.", 400)

        if not cctv_name:
            raise CctvError("cctv_name is required.", 400)

        now = datetime.utcnow()

        cctv = Cctv(
            cctv_code=cctv_code,
            cctv_name=cctv_name,
            stream_url=data.get("stream_url"),
            location_name=data.get("location_name"),
            road_name=data.get("road_name"),
            direction=data.get("direction"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            is_active=bool(data.get("is_active", True)),
            installed_at=CctvService._parse_date(data.get("installed_at")),
            created_at=now,
        )

        db.session.add(cctv)

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise CctvError("CCTV code already exists.", 409)

        return cctv.to_dict()

    @staticmethod
    def update_cctv(cctv_id, data):
        cctv = CctvService.get_cctv(cctv_id)

        editable_fields = [
            "cctv_name",
            "stream_url",
            "location_name",
            "road_name",
            "direction",
            "latitude",
            "longitude",
            "is_active",
        ]

        for field in editable_fields:
            if field in data:
                setattr(cctv, field, data.get(field))

        if "installed_at" in data:
            cctv.installed_at = CctvService._parse_date(data.get("installed_at"))

        cctv.updated_at = datetime.utcnow()

        db.session.commit()

        return cctv.to_dict()

    @staticmethod
    def deactivate_cctv(cctv_id):
        cctv = CctvService.get_cctv(cctv_id)

        cctv.is_active = False
        cctv.updated_at = datetime.utcnow()

        db.session.commit()

        return cctv.to_dict()

    @staticmethod
    def list_rois(cctv_id, active_only=False):
        CctvService.get_cctv(cctv_id)

        query = CctvRoi.query.filter_by(cctv_id=cctv_id).order_by(CctvRoi.id.desc())

        if active_only:
            query = query.filter_by(is_active=True)

        return [roi.to_dict() for roi in query.all()]

    @staticmethod
    def get_roi(cctv_id, roi_id):
        roi = CctvRoi.query.filter_by(id=roi_id, cctv_id=cctv_id).first()

        if not roi:
            raise CctvError("ROI not found.", 404)

        return roi

    @staticmethod
    def create_roi(cctv_id, data):
        CctvService.get_cctv(cctv_id)

        roi_type = data.get("roi_type")
        roi_name = (data.get("roi_name") or "").strip()
        polygon_json = data.get("polygon_json")

        if roi_type not in ALLOWED_ROI_TYPES:
            raise CctvError("Invalid roi_type.", 400)

        if not roi_name:
            raise CctvError("roi_name is required.", 400)

        if not polygon_json or not isinstance(polygon_json, list):
            raise CctvError("polygon_json must be a non-empty array.", 400)

        now = datetime.utcnow()

        roi = CctvRoi(
            cctv_id=cctv_id,
            roi_type=roi_type,
            roi_name=roi_name,
            polygon_json=polygon_json,
            is_active=bool(data.get("is_active", True)),
            created_at=now,
        )

        db.session.add(roi)
        db.session.commit()

        return roi.to_dict()

    @staticmethod
    def update_roi(cctv_id, roi_id, data):
        roi = CctvService.get_roi(cctv_id, roi_id)

        if "roi_type" in data:
            if data.get("roi_type") not in ALLOWED_ROI_TYPES:
                raise CctvError("Invalid roi_type.", 400)
            roi.roi_type = data.get("roi_type")

        if "roi_name" in data:
            roi_name = (data.get("roi_name") or "").strip()

            if not roi_name:
                raise CctvError("roi_name is required.", 400)

            roi.roi_name = roi_name

        if "polygon_json" in data:
            polygon_json = data.get("polygon_json")

            if not polygon_json or not isinstance(polygon_json, list):
                raise CctvError("polygon_json must be a non-empty array.", 400)

            roi.polygon_json = polygon_json

        if "is_active" in data:
            roi.is_active = bool(data.get("is_active"))

        roi.updated_at = datetime.utcnow()

        db.session.commit()

        return roi.to_dict()

    @staticmethod
    def deactivate_roi(cctv_id, roi_id):
        roi = CctvService.get_roi(cctv_id, roi_id)

        roi.is_active = False
        roi.updated_at = datetime.utcnow()

        db.session.commit()

        return roi.to_dict()
