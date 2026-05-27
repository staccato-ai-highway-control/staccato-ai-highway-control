from app.extensions import db


class AiEvent(db.Model):
    __tablename__ = "ai_events"

    event_id = db.Column(db.String(191), primary_key=True)
    camera_id = db.Column(db.String(100), nullable=False, index=True)
    event_type = db.Column(db.String(100), nullable=False, index=True)
    severity = db.Column(db.String(50), nullable=True, index=True)
    status = db.Column(db.String(50), nullable=False, default="NEW", index=True)

    event_timestamp = db.Column(db.DateTime, nullable=False, index=True)

    track_id = db.Column(db.String(100), nullable=True)
    roi_id = db.Column(db.String(100), nullable=True)
    lane_type = db.Column(db.String(50), nullable=True)
    bbox_json = db.Column(db.JSON, nullable=True)

    snapshot_url = db.Column(db.String(1000), nullable=True)
    video_url = db.Column(db.String(1000), nullable=True)
    stream_url = db.Column(db.String(1000), nullable=True)
    message = db.Column(db.Text, nullable=True)

    raw_event_json = db.Column(db.JSON, nullable=False)

    received_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        raw_event = self.raw_event_json if isinstance(self.raw_event_json, dict) else {}

        return {
            "event_id": self.event_id,
            "camera_id": self.camera_id,
            "event_type": self.event_type,
            "severity": self.severity,
            "status": self.status,
            "timestamp": raw_event.get("timestamp")
            or (self.event_timestamp.isoformat() if self.event_timestamp else None),
            "track_id": raw_event.get("track_id", self.track_id),
            "roi_id": self.roi_id,
            "lane_type": self.lane_type,
            "bbox": self.bbox_json,
            "snapshot_url": self.snapshot_url,
            "video_url": self.video_url,
            "stream_url": self.stream_url,
            "message": self.message,
            "raw_event_json": self.raw_event_json,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
