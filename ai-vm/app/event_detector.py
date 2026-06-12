from __future__ import annotations
# 역할: 차량 이동량과 ROI를 기반으로 정차/갓길 정차 이벤트를 판정합니다.

from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta
import math
import uuid
from typing import Any

import cv2
import numpy as np

from .config import (
    EVENT_COOLDOWN_SECONDS,
    EVENT_DANGER_LOW_RATIO,
    EVENT_DANGER_SECONDS,
    EVENT_HISTORY_LENGTH,
    EVENT_MIN_CONFIDENCE,
    EVENT_STOPPED_MOVE_PX,
    EVENT_STOPPED_MIN_BBOX_AREA,
    EVENT_STOPPED_MIN_BBOX_HEIGHT,
    EVENT_STOPPED_MIN_BBOX_WIDTH,
    EVENT_STOPPED_MIN_CONFIDENCE,
    EVENT_TRACK_MATCH_DISTANCE,
    EVENT_TRACK_STALE_FRAMES,
    EVENT_VEHICLE_CLASSES,
    AI_VM_PUBLIC_BASE_URL,
    ROI_BASE_HEIGHT,
    ROI_BASE_WIDTH,
)
from .detector import Detection
from .roi_config import get_camera_rois


# 이전 프레임에서 추적 중인 차량의 위치 상태입니다.
@dataclass
class _TrackState:
    track_id: int
    center: tuple[float, float]
    bbox: list[float]
    class_name: str
    last_frame_id: int


# 현재 프레임 탐지와 매칭된 track_id, ROI 정보를 묶습니다.
@dataclass(frozen=True)
class _TrackedDetection:
    detection: Detection
    track_id: int
    center: tuple[float, float]
    roi_ids: list[str]


# 차량별 이동 이력과 ROI를 이용해 정차 이벤트를 생성합니다.
class EventDetector:
    # 객체 생성에 필요한 설정값과 내부 상태를 초기화합니다.
    def __init__(
        self,
        camera_id: str,
        camera_name: str | None = None,
        vehicle_classes: set[str] | None = None,
    ) -> None:
        self.camera_id = camera_id
        self.camera_name = camera_name or camera_id
        self.vehicle_classes = vehicle_classes or EVENT_VEHICLE_CLASSES

        self._next_track_id = 1
        self._tracks: dict[int, _TrackState] = {}
        self._track_history: dict[int, deque[tuple[float, float]]] = defaultdict(
            lambda: deque(maxlen=EVENT_HISTORY_LENGTH)
        )
        self._slow_started_at: dict[int, datetime] = {}
        self._last_event_at: dict[tuple[Any, ...], datetime] = {}

        self.generated_events = 0
        self.last_event_at: datetime | None = None

    # update 기능을 수행하는 함수입니다.
    def update(
        self,
        *,
        frame_id: int,
        timestamp: datetime,
        detections: list[Detection],
        frame_shape: tuple[int, ...],
    ) -> list[dict[str, Any]]:
        tracked = self._assign_tracks(detections, frame_id, frame_shape)
        if not tracked:
            self._purge_stale_tracks(frame_id)
            return []

        moves: dict[int, float] = {}
        all_moves: list[float] = []

        for item in tracked:
            history = self._track_history[item.track_id]
            history.append(item.center)
            move = self._average_move(history)
            moves[item.track_id] = move
            all_moves.append(move)

        flow_speed = float(np.median(all_moves)) if all_moves else 0.0
        events: list[dict[str, Any]] = []

        for item in tracked:
            move = moves.get(item.track_id, 0.0)

            if not self._is_stopped_candidate_size_ok(item.detection.bbox):
                self._slow_started_at.pop(item.track_id, None)
                continue

            if float(item.detection.confidence or 0.0) < EVENT_STOPPED_MIN_CONFIDENCE:
                self._slow_started_at.pop(item.track_id, None)
                continue

            is_relative_slow = flow_speed > 0 and move < flow_speed * EVENT_DANGER_LOW_RATIO
            is_absolute_stop = len(self._track_history[item.track_id]) >= 2 and move <= EVENT_STOPPED_MOVE_PX
            is_slow = is_relative_slow or is_absolute_stop

            if is_slow:
                self._slow_started_at.setdefault(item.track_id, timestamp)
            else:
                self._slow_started_at.pop(item.track_id, None)

            slow_started_at = self._slow_started_at.get(item.track_id)
            danger_time = (
                (timestamp - slow_started_at).total_seconds()
                if slow_started_at is not None
                else 0.0
            )

            if danger_time < EVENT_DANGER_SECONDS:
                continue

            # Event must be inside a configured ROI.
            # Outside ROI cannot be safely classified as shoulder stop or lane stop.
            if not item.roi_ids:
                continue

            event_type = self._event_type_for_rois(item.roi_ids)
            roi_id = item.roi_ids[0]
            if not self._can_emit(item.track_id, event_type, roi_id, timestamp):
                continue

            event = self._build_event(
                item=item,
                event_type=event_type,
                roi_id=roi_id,
                timestamp=timestamp,
                move=move,
                flow_speed=flow_speed,
                danger_time=danger_time,
            )
            events.append(event)
            self.generated_events += 1
            self.last_event_at = timestamp

        self._purge_stale_tracks(frame_id)
        return events

    # 모니터링/API 응답에 쓰는 현재 상태 payload를 만듭니다.
    def to_status_payload(self) -> dict[str, Any]:
        return {
            "active_tracks": len(self._tracks),
            "generated_events": self.generated_events,
            "last_event_at": self.last_event_at.isoformat() if self.last_event_at else None,
        }

    # _assign_tracks 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _assign_tracks(
        self,
        detections: list[Detection],
        frame_id: int,
        frame_shape: tuple[int, ...],
    ) -> list[_TrackedDetection]:
        tracked: list[_TrackedDetection] = []
        used_track_ids: set[int] = set()

        for detection in detections:
            if detection.class_name not in self.vehicle_classes:
                continue
            if float(detection.confidence or 0.0) < EVENT_MIN_CONFIDENCE:
                continue

            center = self._bottom_center(detection.bbox)
            track_id = detection.track_id
            if track_id is None:
                track_id = self._nearest_track_id(center, used_track_ids)
            if track_id is None:
                track_id = self._next_track_id
                self._next_track_id += 1

            used_track_ids.add(track_id)
            self._tracks[track_id] = _TrackState(
                track_id=track_id,
                center=center,
                bbox=detection.bbox,
                class_name=detection.class_name,
                last_frame_id=frame_id,
            )
            tracked.append(
                _TrackedDetection(
                    detection=detection,
                    track_id=track_id,
                    center=center,
                    roi_ids=self._roi_ids_for_point(center, frame_shape),
                )
            )

        return tracked

    # _nearest_track_id 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _nearest_track_id(
        self,
        center: tuple[float, float],
        used_track_ids: set[int],
    ) -> int | None:
        nearest_track_id = None
        nearest_distance = EVENT_TRACK_MATCH_DISTANCE

        for track_id, track in self._tracks.items():
            if track_id in used_track_ids:
                continue

            distance = self._distance(center, track.center)
            if distance <= nearest_distance:
                nearest_track_id = track_id
                nearest_distance = distance

        return nearest_track_id

    # _purge_stale_tracks 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _purge_stale_tracks(self, frame_id: int) -> None:
        stale_track_ids = [
            track_id
            for track_id, track in self._tracks.items()
            if frame_id - track.last_frame_id > EVENT_TRACK_STALE_FRAMES
        ]
        for track_id in stale_track_ids:
            self._tracks.pop(track_id, None)
            self._track_history.pop(track_id, None)
            self._slow_started_at.pop(track_id, None)

    # _roi_ids_for_point 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _roi_ids_for_point(
        self,
        center: tuple[float, float],
        frame_shape: tuple[int, ...],
    ) -> list[str]:
        height, width = frame_shape[:2]
        x_scale = width / ROI_BASE_WIDTH
        y_scale = height / ROI_BASE_HEIGHT
        point = (float(center[0]), float(center[1]))
        roi_ids: list[str] = []

        for roi_id, points in get_camera_rois(self.camera_id).items():
            scaled_points = np.array(
                [
                    [int(x * x_scale), int(y * y_scale)]
                    for x, y in points
                ],
                dtype=np.int32,
            )
            if cv2.pointPolygonTest(scaled_points, point, False) >= 0:
                roi_ids.append(roi_id)

        return roi_ids

    # _can_emit 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _can_emit(
        self,
        track_id: int,
        event_type: str,
        roi_id: str | None,
        timestamp: datetime,
    ) -> bool:
        # Track IDs can change frequently in CCTV streams.
        # Use a camera-level cooldown first to prevent event flooding
        # for the same camera/event/ROI even when track_id changes.
        camera_key = ("camera", self.camera_id, event_type, roi_id)
        track_key = ("track", track_id, event_type, roi_id)

        for key in (camera_key, track_key):
            last_event_at = self._last_event_at.get(key)
            if last_event_at is not None:
                elapsed = (timestamp - last_event_at).total_seconds()
                if elapsed < EVENT_COOLDOWN_SECONDS:
                    return False

        self._last_event_at[camera_key] = timestamp
        self._last_event_at[track_key] = timestamp
        return True

    # _build_event 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _build_event(
        self,
        *,
        item: _TrackedDetection,
        event_type: str,
        roi_id: str | None,
        timestamp: datetime,
        move: float,
        flow_speed: float,
        danger_time: float,
    ) -> dict[str, Any]:
        event_id = f"evt_{timestamp.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        lane_type = "SHOULDER" if event_type == "SHOULDER_STOP" else "LANE"
        base_url = AI_VM_PUBLIC_BASE_URL.rstrip("/")
        message = (
            f"track {item.track_id} {item.detection.class_name} low movement "
            f"{danger_time:.1f}s, move={move:.1f}, flow={flow_speed:.1f}"
        )

        return {
            "event_id": event_id,
            "camera_id": self.camera_id,
            "camera_name": self.camera_name,
            "event_type": event_type,
            "severity": "WARNING",
            "timestamp": timestamp.isoformat(),
            "bbox": item.detection.bbox,
            "detections": [item.detection.to_dict()],
            "detection_count": 1,
            "track_id": item.track_id,
            "roi_id": roi_id,
            "lane_type": lane_type,
            "estimated_speed_kmh": 0.0,
            "message": message,
            "snapshot_url": f"{base_url}/snapshots/{self.camera_id}/latest.jpg",
            "video_url": None,
            "stream_url": f"{base_url}/streams/{self.camera_id}.mjpeg",
        }

    # _is_stopped_candidate_size_ok 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    @staticmethod
    def _is_stopped_candidate_size_ok(bbox: list[float]) -> bool:
        try:
            x1, y1, x2, y2 = [float(value) for value in bbox]
        except (TypeError, ValueError):
            return False

        width = abs(x2 - x1)
        height = abs(y2 - y1)
        area = width * height

        return (
            width >= EVENT_STOPPED_MIN_BBOX_WIDTH
            and height >= EVENT_STOPPED_MIN_BBOX_HEIGHT
            and area >= EVENT_STOPPED_MIN_BBOX_AREA
        )

    # _event_type_for_rois 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    @staticmethod
    def _event_type_for_rois(roi_ids: list[str]) -> str:
        if "LEFT_SHOULDER" in roi_ids or "RIGHT_SHOULDER" in roi_ids:
            return "SHOULDER_STOP"
        return "STOPPED_VEHICLE"

    # _bottom_center 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    @staticmethod
    def _bottom_center(bbox: list[float]) -> tuple[float, float]:
        x1, _y1, x2, y2 = bbox
        return ((x1 + x2) / 2.0, y2)

    # _average_move 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    @staticmethod
    def _average_move(history: deque[tuple[float, float]]) -> float:
        if len(history) < 2:
            return 0.0

        distances = [
            EventDetector._distance(history[index - 1], history[index])
            for index in range(1, len(history))
        ]
        return float(np.mean(distances)) if distances else 0.0

    # _distance 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    @staticmethod
    def _distance(
        left: tuple[float, float],
        right: tuple[float, float],
    ) -> float:
        return math.sqrt((right[0] - left[0]) ** 2 + (right[1] - left[1]) ** 2)
