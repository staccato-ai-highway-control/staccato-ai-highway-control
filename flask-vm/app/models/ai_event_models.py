"""ai event models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.utils.bbox에서 build_bbox_metadata 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.bbox import build_bbox_metadata


def _gateway_event_media_url(event_id, media_type):
    return f"/api/ai-media/events/{event_id}/{media_type}"


def _sanitize_raw_event_json(raw_event, event_id):
    if not isinstance(raw_event, dict):
        return {}
    return _sanitize_media_value(raw_event, event_id)


def _sanitize_media_value(value, event_id, key_name=None):
    if isinstance(value, dict):
        return {
            key: _sanitize_media_value(child, event_id, key)
            for key, child in value.items()
        }
    if isinstance(value, list):
        return [_sanitize_media_value(child, event_id, key_name) for child in value]
    if not isinstance(value, str):
        return value

    media_type = {
        "snapshot_url": "snapshot",
        "snapshot_path": "snapshot",
        "image_url": "snapshot",
        "preview_url": "snapshot",
        "video_url": "video",
        "clip_url": "video",
        "clip_path": "video",
        "stream_url": "stream",
    }.get(key_name)
    if media_type:
        return _gateway_event_media_url(event_id, media_type)
    if value.startswith(("http://127.0.0.1:5001", "http://localhost:5001", "http://192.168.0.186:5001")):
        return None
    return value


# 설명: `AiEvent` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class AiEvent(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'ai_events'로 설정한다.
    __tablename__ = "ai_events"

    # 설명: `event_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_id = db.Column(db.String(191), primary_key=True)
    # 설명: `camera_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    camera_id = db.Column(db.String(100), nullable=False, index=True)
    # 설명: `event_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_type = db.Column(db.String(100), nullable=False, index=True)
    # 설명: `severity`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    severity = db.Column(db.String(50), nullable=True, index=True)
    # 설명: `status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = db.Column(db.String(50), nullable=False, default="NEW", index=True)

    # 설명: `event_timestamp`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_timestamp = db.Column(db.DateTime, nullable=False, index=True)

    # 설명: `track_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    track_id = db.Column(db.String(100), nullable=True)
    # 설명: `roi_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    roi_id = db.Column(db.String(100), nullable=True)
    # 설명: `lane_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    lane_type = db.Column(db.String(50), nullable=True)
    # 설명: `bbox_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    bbox_json = db.Column(db.JSON, nullable=True)

    # 설명: `snapshot_url`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    snapshot_url = db.Column(db.String(1000), nullable=True)
    # 설명: `video_url`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    video_url = db.Column(db.String(1000), nullable=True)
    # 설명: `stream_url`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    stream_url = db.Column(db.String(1000), nullable=True)
    # 설명: `message`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    message = db.Column(db.Text, nullable=True)

    # 설명: `raw_event_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw_event_json = db.Column(db.JSON, nullable=False)

    # 설명: `received_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    received_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
        # 설명: `raw_event`에 self.raw_event_json if isinstance(self.raw_event_json, dict) else {} 표현식의 계산 결과를 저장한다.
        raw_event = _sanitize_raw_event_json(self.raw_event_json, self.event_id)

        # 설명: `detections`에 `raw_event.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        detections = raw_event.get("detections")
        # 설명: `not isinstance(detections, list)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(detections, list):
            # 설명: `detections`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
            detections = []

        # 설명: `normalized_detections`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        normalized_detections = []
        # 설명: `detections`의 각 항목을 `detection`로 받아 반복 처리한다.
        for detection in detections:
            # 설명: `not isinstance(detection, dict)` 조건 결과에 따라 실행 경로를 분기한다.
            if not isinstance(detection, dict):
                # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                continue
            # 설명: `item`에 `dict` 호출 결과를 저장해 다음 처리에서 사용한다.
            item = dict(detection)
            # 설명: `detection_bbox`에 `item.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            detection_bbox = item.get("bbox", item.get("bbox_json"))
            # 설명: `item['bbox_metadata']`에 `build_bbox_metadata` 호출 결과를 저장해 다음 처리에서 사용한다.
            item["bbox_metadata"] = build_bbox_metadata(
                detection_bbox,
                coordinate_space=item.get("bbox_coordinate_space"),
                frame_width=item.get("frame_width") or raw_event.get("frame_width"),
                frame_height=item.get("frame_height") or raw_event.get("frame_height"),
            )
            # 설명: `normalized_detections.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            normalized_detections.append(item)

        # 설명: 호출자에게 {'event_id': self.event_id, 'camera_id': self.camera_id, 'event_type': self.eve... 값을 함수 결과로 반환한다.
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
            "bbox_metadata": build_bbox_metadata(
                self.bbox_json,
                coordinate_space=raw_event.get("bbox_coordinate_space"),
                frame_width=raw_event.get("frame_width"),
                frame_height=raw_event.get("frame_height"),
            ),
            "detections": normalized_detections,
            "detection_count": len(normalized_detections),
            "snapshot_url": self.snapshot_url,
            "video_url": self.video_url,
            "stream_url": self.stream_url,
            "message": self.message,
            "raw_event_json": self.raw_event_json,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
