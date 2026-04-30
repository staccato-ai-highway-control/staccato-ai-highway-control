from app.extensions import db


class Incident(db.Model):
    __tablename__ = "incidents"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    incident_code = db.Column(db.String(50), nullable=False, unique=True)
    cctv_id = db.Column(db.BigInteger, db.ForeignKey("cctvs.id"), nullable=True)
    incident_type = db.Column(db.String(50), nullable=False)
    incident_status = db.Column(db.String(50), nullable=False, default="DETECTED")
    risk_level = db.Column(db.String(50), nullable=False, default="MEDIUM")
    confidence = db.Column(db.Numeric(5, 4), nullable=True)
    stopped_duration_seconds = db.Column(db.Integer, nullable=True)
    detected_at = db.Column(db.DateTime, nullable=False)
    resolved_at = db.Column(db.DateTime, nullable=True)
    location_name = db.Column(db.String(255), nullable=True)
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    longitude = db.Column(db.Numeric(10, 7), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_code": self.incident_code,
            "cctv_id": self.cctv_id,
            "incident_type": self.incident_type,
            "incident_status": self.incident_status,
            "risk_level": self.risk_level,
            "confidence": float(self.confidence) if self.confidence is not None else None,
            "stopped_duration_seconds": self.stopped_duration_seconds,
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "location_name": self.location_name,
            "latitude": float(self.latitude) if self.latitude is not None else None,
            "longitude": float(self.longitude) if self.longitude is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DetectionLog(db.Model):
    __tablename__ = "detection_logs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    cctv_id = db.Column(db.BigInteger, db.ForeignKey("cctvs.id"), nullable=True)
    model_name = db.Column(db.String(100), nullable=True)
    model_version = db.Column(db.String(50), nullable=True)
    detected_class = db.Column(db.String(100), nullable=True)
    confidence = db.Column(db.Numeric(5, 4), nullable=True)
    bbox_json = db.Column(db.JSON, nullable=True)
    roi_type = db.Column(db.String(50), nullable=False, default="UNKNOWN")
    movement_delta_px = db.Column(db.Numeric(10, 3), nullable=True)
    stopped_duration_seconds = db.Column(db.Integer, nullable=True)
    frame_timestamp_ms = db.Column(db.BigInteger, nullable=True)
    raw_result_json = db.Column(db.JSON, nullable=True)
    detected_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "cctv_id": self.cctv_id,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "detected_class": self.detected_class,
            "confidence": float(self.confidence) if self.confidence is not None else None,
            "bbox_json": self.bbox_json,
            "roi_type": self.roi_type,
            "movement_delta_px": float(self.movement_delta_px) if self.movement_delta_px is not None else None,
            "stopped_duration_seconds": self.stopped_duration_seconds,
            "frame_timestamp_ms": self.frame_timestamp_ms,
            "raw_result_json": self.raw_result_json,
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class IncidentSnapshot(db.Model):
    __tablename__ = "incident_snapshots"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    detection_log_id = db.Column(db.BigInteger, db.ForeignKey("detection_logs.id"), nullable=True)
    file_path = db.Column(db.String(500), nullable=False)
    thumbnail_path = db.Column(db.String(500), nullable=True)
    bbox_json = db.Column(db.JSON, nullable=True)
    captured_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "detection_log_id": self.detection_log_id,
            "file_path": self.file_path,
            "thumbnail_path": self.thumbnail_path,
            "bbox_json": self.bbox_json,
            "captured_at": self.captured_at.isoformat() if self.captured_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class IncidentStatusHistory(db.Model):
    __tablename__ = "incident_status_histories"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    previous_status = db.Column(db.String(50), nullable=True)
    new_status = db.Column(db.String(50), nullable=False)
    changed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    change_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "changed_by": self.changed_by,
            "change_reason": self.change_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class IncidentMemo(db.Model):
    __tablename__ = "incident_memos"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    author_user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    memo_type = db.Column(db.String(50), nullable=False, default="GENERAL")
    memo = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "author_user_id": self.author_user_id,
            "memo_type": self.memo_type,
            "memo": self.memo,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
