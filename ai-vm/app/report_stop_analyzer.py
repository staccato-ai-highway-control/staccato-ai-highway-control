from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any

import cv2
import numpy as np

from .config import (
    EVENT_TRACK_MATCH_DISTANCE,
    EVENT_TRACK_STALE_FRAMES,
    EVENT_VEHICLE_CLASSES,
    REPORT_STOP_DANGER_SECONDS,
    REPORT_STOP_MIN_CONFIDENCE,
    REPORT_STOPPED_MIN_CONFIDENCE,
    REPORT_STOPPED_MOVE_PX,
    ROI_BASE_HEIGHT,
    ROI_BASE_WIDTH,
)
from .detector import Detection
from .roi_config import get_camera_rois


SHOULDER_ROI_IDS = {"LEFT_SHOULDER", "RIGHT_SHOULDER"}


@dataclass
class _Track:
    track_id: int
    class_name: str
    center: tuple[float, float]
    bbox: list[float]
    last_frame_index: int
    last_timestamp_seconds: float
    stopped_started_at_seconds: float | None = None
    emitted_stop_event: bool = False
    # 마지막으로 정차가 확인된 렌더링 정보입니다.
    # 다음 분석 샘플에서 탐지가 한 번 누락되어도 빨간 박스가 끊기지 않게 합니다.
    last_stop_payload: dict[str, Any] | None = None


class ReportStopAnalyzer:
    """업로드 영상 전용 차량 추적·정차 분석기.

    정차 시간은 서버 처리 시간이 아니라 영상 시각(frame_index / fps)으로 계산한다.
    """

    def __init__(
        self,
        *,
        camera_id: str | None,
        model_name: str | None,
        model_version: str | None,
    ) -> None:
        self.camera_id = str(camera_id or "").strip() or None
        self.model_name = model_name or "unknown"
        self.model_version = model_version

        self.vehicle_classes = {
            str(item).strip().lower()
            for item in EVENT_VEHICLE_CLASSES
        }

        self._next_track_id = 1
        self._tracks: dict[int, _Track] = {}
        self._tracked_ids: set[int] = set()
        self._stop_candidate_ids: set[int] = set()

        self._events: list[dict[str, Any]] = []
        self._detection_logs: list[dict[str, Any]] = []
        # 영상 렌더링용: 정차가 확정된 차량은 이후 분석 프레임에도
        # 빨간 박스로 유지할 수 있도록 별도 기록합니다.
        self._render_annotations: list[dict[str, Any]] = []

        self._raw_detections_count = 0
        self._vehicle_detections_count = 0
        self._eligible_vehicle_count = 0
        self._stop_confident_vehicle_count = 0
        self._roi_matched_count = 0
        self._movement_too_large_count = 0
        self._max_stopped_seconds = 0.0

        self._frame_width = 0
        self._frame_height = 0

    def update(
        self,
        *,
        frame_index: int,
        video_timestamp_seconds: float,
        detections: list[Detection],
        frame_shape: tuple[int, ...],
    ) -> list[dict[str, Any]]:
        self._purge_stale_tracks(frame_index)

        frame_height, frame_width = frame_shape[:2]
        self._frame_width = int(frame_width)
        self._frame_height = int(frame_height)

        self._raw_detections_count += len(detections)

        emitted_events: list[dict[str, Any]] = []
        used_track_ids: set[int] = set()

        for detection in detections:
            class_name = self._class_name(detection)

            if class_name not in self.vehicle_classes:
                continue

            self._vehicle_detections_count += 1

            confidence = float(detection.confidence or 0.0)
            if confidence < REPORT_STOP_MIN_CONFIDENCE:
                continue

            self._eligible_vehicle_count += 1

            if confidence >= REPORT_STOPPED_MIN_CONFIDENCE:
                self._stop_confident_vehicle_count += 1

            center = self._bottom_center(detection.bbox)
            track_id, track = self._match_track(
                detection=detection,
                class_name=class_name,
                center=center,
                frame_index=frame_index,
                used_track_ids=used_track_ids,
            )

            is_new_track = track is None
            previous_center = track.center if track is not None else None
            previous_timestamp = (
                track.last_timestamp_seconds
                if track is not None
                else None
            )

            if track is None:
                track = _Track(
                    track_id=track_id,
                    class_name=class_name,
                    center=center,
                    bbox=list(detection.bbox),
                    last_frame_index=frame_index,
                    last_timestamp_seconds=video_timestamp_seconds,
                )
                self._tracks[track_id] = track
            else:
                track.class_name = class_name
                track.center = center
                track.bbox = list(detection.bbox)
                track.last_frame_index = frame_index
                track.last_timestamp_seconds = video_timestamp_seconds

            used_track_ids.add(track_id)
            self._tracked_ids.add(track_id)

            movement_delta = (
                self._distance(previous_center, center)
                if previous_center is not None
                else None
            )

            if movement_delta is None:
                stopped_seconds = 0.0
            elif movement_delta <= REPORT_STOPPED_MOVE_PX:
                if track.stopped_started_at_seconds is None:
                    track.stopped_started_at_seconds = previous_timestamp

                stopped_started_at = (
                    track.stopped_started_at_seconds
                )
                stopped_seconds = max(
                    0.0,
                    video_timestamp_seconds
                    - float(
                        stopped_started_at
                        if stopped_started_at is not None
                        else video_timestamp_seconds
                    ),
                )
                self._stop_candidate_ids.add(track_id)
                self._max_stopped_seconds = max(
                    self._max_stopped_seconds,
                    stopped_seconds,
                )
            else:
                self._movement_too_large_count += 1
                track.stopped_started_at_seconds = None
                track.emitted_stop_event = False
                track.last_stop_payload = None
                stopped_seconds = 0.0

            roi_ids = self._roi_ids_for_point(
                center=center,
                frame_shape=frame_shape,
            )

            if roi_ids:
                self._roi_matched_count += 1

            roi_id = roi_ids[0] if roi_ids else None
            roi_type = self._roi_type(roi_ids)

            self._detection_logs.append(
                {
                    "track_id": track_id,
                    "object_type": class_name.upper(),
                    "bbox": [float(value) for value in detection.bbox],
                    "center": [
                        round(float(center[0]), 2),
                        round(float(center[1]), 2),
                    ],
                    "confidence": round(confidence, 5),
                    "movement_delta": (
                        round(float(movement_delta), 3)
                        if movement_delta is not None
                        else None
                    ),
                    "stopped_seconds": round(float(stopped_seconds), 3),
                    "frame_index": int(frame_index),
                    "video_timestamp_seconds": round(
                        float(video_timestamp_seconds),
                        3,
                    ),
                    "model_name": self.model_name,
                    "model_version": self.model_version,
                    "roi_type": roi_type,
                    "roi_id": roi_id,
                    "roi_ids": roi_ids,
                    "is_new_track": is_new_track,
                }
            )

            if movement_delta is None:
                continue

            if confidence < REPORT_STOPPED_MIN_CONFIDENCE:
                continue

            if stopped_seconds < REPORT_STOP_DANGER_SECONDS:
                continue

            if roi_type == "SHOULDER":
                incident_type = "SHOULDER_STOP"
            elif roi_ids:
                incident_type = "LANE_STOP"
            else:
                incident_type = "STOPPED_VEHICLE"

            stop_payload = {
                "incident_type": incident_type,
                "risk_level": "HIGH",
                "track_id": track_id,
                "object_type": class_name.upper(),
                "bbox": [float(value) for value in detection.bbox],
                "center": [
                    round(float(center[0]), 2),
                    round(float(center[1]), 2),
                ],
                "confidence": round(confidence, 5),
                "movement_delta": round(float(movement_delta), 3),
                "stopped_seconds": round(float(stopped_seconds), 3),
                "roi_type": roi_type,
                "roi_id": roi_id,
                "roi_ids": roi_ids,
                "frame_index": int(frame_index),
                "video_timestamp_seconds": round(
                    float(video_timestamp_seconds),
                    3,
                ),
                "model_name": self.model_name,
                "model_version": self.model_version,
                "source_type": "video",
                "box_color": "red",
                "display_label": (
                    f"{incident_type} {stopped_seconds:.1f}s"
                ),
                "risk_reason": (
                    "vehicle stayed below the movement threshold "
                    f"for {stopped_seconds:.1f}s inside {roi_type}"
                    if roi_ids
                    else (
                        "vehicle stayed below the movement threshold "
                        f"for {stopped_seconds:.1f}s without a matched ROI"
                    )
                ),
            }

            # 마지막으로 확정된 정차 정보를 track에 보관합니다.
            # 다음 분석 샘플에서 모델이 차량을 잠깐 놓쳐도 이 bbox를 이어서 사용합니다.
            track.last_stop_payload = dict(stop_payload)

            # 정차가 확정된 차량은 같은 track_id가 계속 멈춰 있는 동안
            # 분석 프레임마다 빨간 렌더링 정보도 남깁니다.
            self._render_annotations.append(
                {
                    **stop_payload,
                    "persistent_annotation": True,
                    "inferred_from_last_seen": False,
                }
            )

            # 사고 이벤트는 최초 한 번만 생성합니다.
            # 이후 프레임은 위의 render annotation으로만 빨간 표시를 유지합니다.
            if track.emitted_stop_event:
                continue

            event = {
                "detected": True,
                **stop_payload,
                "snapshot_path": None,
            }

            self._events.append(event)
            emitted_events.append(event)
            track.emitted_stop_event = True

        # 이번 분석 샘플에서 탐지되지 않았더라도, stale 기준 안의 정차 track은
        # 마지막 bbox를 이용해 빨간 박스를 한 구간 더 유지합니다.
        # 차량이 다시 움직이면 위의 이동량 처리에서 last_stop_payload가 즉시 제거됩니다.
        for track in self._tracks.values():
            if track.track_id in used_track_ids:
                continue

            if track.last_stop_payload is None:
                continue

            carried_payload = dict(track.last_stop_payload)
            stopped_started_at = track.stopped_started_at_seconds
            carried_stopped_seconds = (
                max(
                    0.0,
                    float(video_timestamp_seconds)
                    - float(stopped_started_at),
                )
                if stopped_started_at is not None
                else carried_payload.get("stopped_seconds", 0.0)
            )

            carried_payload.update(
                {
                    "bbox": [float(value) for value in track.bbox],
                    "center": [
                        round(float(track.center[0]), 2),
                        round(float(track.center[1]), 2),
                    ],
                    "frame_index": int(frame_index),
                    "video_timestamp_seconds": round(
                        float(video_timestamp_seconds),
                        3,
                    ),
                    "stopped_seconds": round(
                        float(carried_stopped_seconds),
                        3,
                    ),
                    "persistent_annotation": True,
                    "inferred_from_last_seen": True,
                }
            )

            self._render_annotations.append(carried_payload)

        return emitted_events

    def build_result(self) -> dict[str, Any]:
        return {
            "incident_candidates": self._events,
            "detection_logs": self._detection_logs,
            "render_annotations": self._render_annotations,
            "debug": {
                "raw_detections_count": self._raw_detections_count,
                "vehicle_detections_count": self._vehicle_detections_count,
                "roi_matched_count": self._roi_matched_count,
                "tracked_vehicle_count": len(self._tracked_ids),
                "stop_candidate_count": len(self._stop_candidate_ids),
                "final_stop_event_count": len(self._events),
                "frame_width": self._frame_width,
                "frame_height": self._frame_height,
                "roi_base_width": ROI_BASE_WIDTH,
                "roi_base_height": ROI_BASE_HEIGHT,
                "thresholds": {
                    "confidence": REPORT_STOP_MIN_CONFIDENCE,
                    "stopped_min_confidence": (
                        REPORT_STOPPED_MIN_CONFIDENCE
                    ),
                    "movement_threshold_px": REPORT_STOPPED_MOVE_PX,
                    "danger_seconds": REPORT_STOP_DANGER_SECONDS,
                    "track_match_distance_px": (
                        EVENT_TRACK_MATCH_DISTANCE
                    ),
                },
                "failure_reason": self._failure_reason(),
            },
        }

    def _failure_reason(self) -> str | None:
        if self._events:
            return None

        if self._raw_detections_count == 0:
            return "NO_RAW_DETECTIONS"

        if self._vehicle_detections_count == 0:
            return "NO_VEHICLE_DETECTIONS"

        if self._stop_confident_vehicle_count == 0:
            return "LOW_CONFIDENCE_ONLY"

        if not self._tracked_ids:
            return "TRACKING_FAILED"

        if (
            self._stop_candidate_ids
            and self._max_stopped_seconds < REPORT_STOP_DANGER_SECONDS
        ):
            return "STOP_DURATION_TOO_SHORT"

        if self._movement_too_large_count > 0:
            return "MOVEMENT_TOO_LARGE"

        return "TRACKING_FAILED"

    def _match_track(
        self,
        *,
        detection: Detection,
        class_name: str,
        center: tuple[float, float],
        frame_index: int,
        used_track_ids: set[int],
    ) -> tuple[int, _Track | None]:
        if detection.track_id is not None:
            try:
                source_track_id = int(detection.track_id)
            except (TypeError, ValueError):
                source_track_id = None

            if source_track_id is not None:
                existing = self._tracks.get(source_track_id)
                if (
                    source_track_id not in used_track_ids
                    and (
                        existing is None
                        or existing.class_name == class_name
                    )
                ):
                    self._next_track_id = max(
                        self._next_track_id,
                        source_track_id + 1,
                    )
                    return source_track_id, existing

        nearest_track: _Track | None = None
        nearest_distance = EVENT_TRACK_MATCH_DISTANCE

        for candidate in self._tracks.values():
            if candidate.track_id in used_track_ids:
                continue

            if candidate.class_name != class_name:
                continue

            if (
                frame_index - candidate.last_frame_index
                > EVENT_TRACK_STALE_FRAMES
            ):
                continue

            distance = self._distance(candidate.center, center)

            if distance <= nearest_distance:
                nearest_track = candidate
                nearest_distance = distance

        if nearest_track is not None:
            return nearest_track.track_id, nearest_track

        track_id = self._next_track_id
        self._next_track_id += 1
        return track_id, None

    def _purge_stale_tracks(self, frame_index: int) -> None:
        stale_ids = [
            track_id
            for track_id, track in self._tracks.items()
            if frame_index - track.last_frame_index
            > EVENT_TRACK_STALE_FRAMES
        ]

        for track_id in stale_ids:
            self._tracks.pop(track_id, None)

    def _roi_ids_for_point(
        self,
        *,
        center: tuple[float, float],
        frame_shape: tuple[int, ...],
    ) -> list[str]:
        if not self.camera_id:
            return []

        height, width = frame_shape[:2]

        if width <= 0 or height <= 0:
            return []

        try:
            rois = get_camera_rois(self.camera_id)
        except Exception:
            return []

        x_scale = width / float(ROI_BASE_WIDTH or width)
        y_scale = height / float(ROI_BASE_HEIGHT or height)

        point = (float(center[0]), float(center[1]))
        roi_ids: list[str] = []

        for roi_id, points in rois.items():
            scaled_points = []

            for item in points:
                try:
                    x, y = item
                    scaled_points.append(
                        [
                            int(float(x) * x_scale),
                            int(float(y) * y_scale),
                        ]
                    )
                except (TypeError, ValueError):
                    continue

            if len(scaled_points) < 3:
                continue

            polygon = np.array(scaled_points, dtype=np.int32)

            if cv2.pointPolygonTest(polygon, point, False) >= 0:
                roi_ids.append(str(roi_id))

        return roi_ids

    @staticmethod
    def _class_name(detection: Detection) -> str:
        return str(detection.class_name or "").strip().lower()

    @staticmethod
    def _roi_type(roi_ids: list[str]) -> str:
        if SHOULDER_ROI_IDS.intersection(roi_ids):
            return "SHOULDER"

        if roi_ids:
            return "DRIVING_LANE"

        return "UNKNOWN"

    @staticmethod
    def _bottom_center(
        bbox: list[float],
    ) -> tuple[float, float]:
        x1, _y1, x2, y2 = [float(value) for value in bbox]
        return ((x1 + x2) / 2.0, y2)

    @staticmethod
    def _distance(
        left: tuple[float, float],
        right: tuple[float, float],
    ) -> float:
        return math.sqrt(
            (right[0] - left[0]) ** 2
            + (right[1] - left[1]) ** 2
        )
