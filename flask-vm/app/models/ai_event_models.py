from app.extensions import db


class AiEvent(db.Model):
    __tablename__ = "incident_event"

    event_id = db.Column(db.String(191), primary_key=True)
    camera_id = db.Column(db.String(100), nullable=False, index=True)
    event_type = db.Column(db.String(100), nullable=False, index=True)
    severity = db.Column(db.String(50), nullable=True, index=True)

    event_timestamp = db.Column("timestamp", db.DateTime, nullable=False, index=True)

    roi_id = db.Column(db.String(100), nullable=True)
    lane_type = db.Column(db.String(50), nullable=True)

    snapshot_url = db.Column(db.String(1000), nullable=True)
    video_url = db.Column(db.String(1000), nullable=True)
    stream_url = db.Column(db.String(1000), nullable=True)
    message = db.Column(db.Text, nullable=True)

    raw_event_json = db.Column(db.JSON, nullable=False)

    def to_dict(self):
        raw_event = self.raw_event_json if isinstance(self.raw_event_json, dict) else {}

        return {
            "event_id": self.event_id,
            "camera_id": self.camera_id,
            "event_type": self.event_type,
            "severity": self.severity,
            "timestamp": raw_event.get("timestamp")
            or (self.event_timestamp.isoformat() if self.event_timestamp else None),
            "roi_id": self.roi_id,
            "lane_type": self.lane_type,
            "bbox": raw_event.get("bbox"),
            "snapshot_url": self.snapshot_url,
            "video_url": self.video_url,
            "stream_url": self.stream_url,
            "message": self.message,
            "raw_event_json": self.raw_event_json,
        }
