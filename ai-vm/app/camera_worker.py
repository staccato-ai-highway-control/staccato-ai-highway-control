from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from threading import Event, Lock, Thread
import time
import uuid

import cv2
import numpy as np

from .analysis_queue import AnalysisFrame, AnalysisQueue
from .config import (
    AI_VM_PUBLIC_BASE_URL,
    CCTV_SOURCE_REFRESH_ENABLED,
    CCTV_SOURCE_REFRESH_INTERVAL_SECONDS,
    RING_BUFFER_MAX_FRAMES,
    RING_BUFFER_MAX_HEIGHT,
    RING_BUFFER_MAX_WIDTH,
)
from .detector import detector
from .event_clip_worker import EventClipWorker
from .inference_worker import InferenceWorker
from .its_openapi import find_its_cctv_by_name, normalize_cctv_name
from .ring_buffer import RingBuffer


class CameraStatus(str, Enum):
    INIT = "INIT"
    CONNECTING = "CONNECTING"
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    RECONNECTING = "RECONNECTING"
    ERROR = "ERROR"
    STOPPED = "STOPPED"


class CameraWorker:
    def __init__(
        self,
        camera_id: str,
        source_url: str,
        name: str | None = None,
        target_fps: float = 10.0,
        analysis_fps: float = 2.0,
        analysis_queue_size: int = 4,
        buffer_seconds: float = 12.0,
        stale_timeout_seconds: float = 10.0,
        reconnect_backoff_seconds: float = 3.0,
    ) -> None:
        self.camera_id = camera_id
        self.source_url = source_url
        self.name = name or camera_id
        self.source_identity = normalize_cctv_name(self.name)
        self.target_fps = target_fps
        self.analysis_fps = analysis_fps
        self.analysis_interval = 1.0 / analysis_fps if analysis_fps > 0 else 0.0
        self.stale_timeout_seconds = stale_timeout_seconds
        self.reconnect_backoff_seconds = reconnect_backoff_seconds

        self.ring_buffer = RingBuffer(
            max_seconds=buffer_seconds,
            fps=target_fps,
            max_width=RING_BUFFER_MAX_WIDTH,
            max_height=RING_BUFFER_MAX_HEIGHT,
            max_frames=RING_BUFFER_MAX_FRAMES,
        )
        self.analysis_queue = AnalysisQueue(maxsize=analysis_queue_size)
        self.event_clip_worker = EventClipWorker(
            camera_id=camera_id,
            camera_name=self.name,
            ring_buffer=self.ring_buffer,
            output_fps=target_fps,
        )
        self.inference_worker = InferenceWorker(
            camera_id=camera_id,
            camera_name=self.name,
            analysis_queue=self.analysis_queue,
            event_handler=self._handle_inference_events,
        )

        self.latest_frame: np.ndarray | None = None
        self.latest_frame_lock = Lock()
        self._latest_jpeg_cache: dict[int, tuple[int, bytes]] = {}

        self._status = CameraStatus.INIT
        self._status_lock = Lock()
        self._thread: Thread | None = None
        self._stop_event = Event()

        self.started_at: datetime | None = None
        self.status_changed_at = self._utc_now()
        self.last_frame_at: datetime | None = None
        self.last_success_at: datetime | None = None
        self.last_analysis_push_monotonic = 0.0
        self.frames_read = 0
        self.error_message: str | None = None
        self.source_refresh_enabled = CCTV_SOURCE_REFRESH_ENABLED
        self.source_refresh_count = 0
        self.last_source_refresh_at: datetime | None = None
        self.last_source_refresh_error: str | None = None
        self._last_source_refresh_attempt_monotonic = 0.0

    @property
    def status(self) -> CameraStatus:
        with self._status_lock:
            return self._status

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._stop_event.clear()
        self.started_at = self._utc_now()
        self._set_status(CameraStatus.INIT)
        self.event_clip_worker.start()
        self.inference_worker.start()
        self._thread = Thread(
            target=self._capture_loop,
            name=f"CameraWorker-{self.camera_id}",
            daemon=True,
        )
        self._thread.start()

    def stop(self, join_timeout: float = 2.0) -> None:
        self._stop_event.set()
        self._set_status(CameraStatus.STOPPED)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=join_timeout)
        self.inference_worker.stop(join_timeout=join_timeout)
        self.event_clip_worker.stop(join_timeout=join_timeout)

    def is_running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    def get_latest_frame(self) -> np.ndarray | None:
        with self.latest_frame_lock:
            if self.latest_frame is None:
                return None
            return self.latest_frame.copy()

    def get_latest_jpeg(self, quality: int = 80) -> bytes | None:
        with self.latest_frame_lock:
            if self.latest_frame is None:
                return None

            cached = self._latest_jpeg_cache.get(quality)
            if cached and cached[0] == self.frames_read:
                return cached[1]

            frame_version = self.frames_read
            frame = self.latest_frame.copy()

        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        success, encoded = cv2.imencode(".jpg", frame, encode_params)
        if not success:
            return None

        jpeg = encoded.tobytes()
        with self.latest_frame_lock:
            if self.frames_read == frame_version:
                self._latest_jpeg_cache[quality] = (frame_version, jpeg)
        return jpeg

    def get_latest_detection_result(self) -> dict | None:
        result = self.inference_worker.get_latest_result()
        return result.to_dict() if result else None

    def matches_source_identity(self, name: str | None = None, source_url: str | None = None) -> bool:
        clean_name = normalize_cctv_name(name)
        if clean_name:
            return clean_name == self.source_identity

        return bool(source_url and source_url == self.source_url)

    def trigger_manual_event(
        self,
        *,
        event_type: str = "STOPPED_VEHICLE",
        severity: str = "WARNING",
        message: str | None = None,
        pre_seconds: float | None = None,
        post_seconds: float | None = None,
    ) -> dict:
        timestamp = self._utc_now()
        event_id = f"evt_manual_{timestamp.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        base_url = AI_VM_PUBLIC_BASE_URL.rstrip("/")
        detections = self._collect_manual_event_detections()
        primary_detection = detections[0] if detections else None
        event = {
            "event_id": event_id,
            "camera_id": self.camera_id,
            "camera_name": self.name,
            "event_type": event_type,
            "severity": severity,
            "timestamp": timestamp.isoformat(),
            "bbox": primary_detection["bbox"] if primary_detection else None,
            "detections": detections,
            "detection_count": len(detections),
            "track_id": primary_detection.get("track_id") if primary_detection else None,
            "roi_id": None,
            "lane_type": "SHOULDER" if event_type == "SHOULDER_STOP" else "LANE",
            "estimated_speed_kmh": 0.0,
            "message": message or "manual event trigger",
            "snapshot_url": f"{base_url}/snapshots/{self.camera_id}/latest.jpg",
            "video_url": None,
            "stream_url": f"{base_url}/streams/{self.camera_id}.mjpeg",
        }
        self.event_clip_worker.enqueue_event(
            event,
            pre_seconds=pre_seconds,
            post_seconds=post_seconds,
        )
        return event

    def _collect_manual_event_detections(self) -> list[dict]:
        if self.analysis_interval > 0:
            frame = self.get_latest_frame()
            if frame is not None:
                try:
                    return [item.to_dict() for item in detector.detect(frame)]
                except Exception as error:
                    self.error_message = f"Manual YOLO detection failed: {error}"

        latest_result = self.inference_worker.get_latest_result()
        if latest_result and latest_result.detections:
            return [item.to_dict() for item in latest_result.detections]

        return []

    def to_status_payload(self) -> dict:
        return {
            "camera_id": self.camera_id,
            "camera_name": self.name,
            "source_url": self.source_url,
            "source_refresh": {
                "enabled": self.source_refresh_enabled,
                "count": self.source_refresh_count,
                "last_refreshed_at": self._format_dt(self.last_source_refresh_at),
                "last_error": self.last_source_refresh_error,
            },
            "status": self.status.value,
            "timestamp": self._utc_now().isoformat(),
            "started_at": self._format_dt(self.started_at),
            "status_changed_at": self._format_dt(self.status_changed_at),
            "last_frame_at": self._format_dt(self.last_frame_at),
            "target_fps": self.target_fps,
            "analysis_fps": self.analysis_fps,
            "frames_read": self.frames_read,
            "ring_buffer_frames": len(self.ring_buffer),
            "ring_buffer_max_frames": self.ring_buffer.max_frames,
            "ring_buffer_estimated_mb": round(
                self.ring_buffer.estimated_bytes() / (1024 * 1024),
                2,
            ),
            "ring_buffer_frame_limit": {
                "max_width": self.ring_buffer.max_width,
                "max_height": self.ring_buffer.max_height,
            },
            "inference": self.inference_worker.to_status_payload(),
            "event_clips": self.event_clip_worker.to_status_payload(),
            "error_message": self.error_message,
        }

    def _capture_loop(self) -> None:
        frame_interval = 1.0 / self.target_fps

        while not self._stop_event.is_set():
            capture = None
            try:
                self.error_message = None
                self._set_status(CameraStatus.CONNECTING)
                self._refresh_source_url_if_needed()

                capture = cv2.VideoCapture(self.source_url)
                capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)

                if not capture.isOpened():
                    self.error_message = "VideoCapture could not open source_url."
                    self._set_status(CameraStatus.RECONNECTING)
                    self._sleep_backoff()
                    continue

                self._set_status(CameraStatus.ONLINE)
                self.last_success_at = self._utc_now()
                session_frames_read = 0

                while not self._stop_event.is_set():
                    loop_started_at = time.monotonic()
                    success, frame = capture.read()

                    if not success or frame is None:
                        if session_frames_read > 0:
                            self.error_message = "Stream segment ended; refreshing source_url."
                            self._set_status(CameraStatus.RECONNECTING)
                            self._stop_event.wait(timeout=min(self.reconnect_backoff_seconds, 0.5))
                            break

                        if self._is_stale():
                            self.error_message = "No frame received before stale timeout."
                            self._set_status(CameraStatus.RECONNECTING)
                            break
                        time.sleep(min(frame_interval, 0.2))
                        continue

                    now = self._utc_now()
                    self.last_success_at = now
                    self.last_frame_at = now
                    self.frames_read += 1
                    session_frames_read += 1

                    shared_frame = frame.copy()
                    with self.latest_frame_lock:
                        self.latest_frame = shared_frame
                        self._latest_jpeg_cache.clear()

                    buffer_snapshot = self.ring_buffer.append(shared_frame, now)
                    self.event_clip_worker.on_frame(buffer_snapshot.frame, now)
                    self._maybe_push_analysis_frame(shared_frame, now)

                    elapsed = time.monotonic() - loop_started_at
                    if elapsed < frame_interval:
                        time.sleep(frame_interval - elapsed)

            except Exception as error:
                self.error_message = str(error)
                self._set_status(CameraStatus.ERROR)
                self._sleep_backoff()
            finally:
                if capture is not None:
                    capture.release()

        self._set_status(CameraStatus.STOPPED)

    def _is_stale(self) -> bool:
        if self.last_success_at is None:
            return False
        elapsed = (self._utc_now() - self.last_success_at).total_seconds()
        return elapsed >= self.stale_timeout_seconds

    def _sleep_backoff(self) -> None:
        self._stop_event.wait(timeout=self.reconnect_backoff_seconds)

    def _refresh_source_url_if_needed(self) -> bool:
        if not self.source_refresh_enabled or not self.source_identity:
            return False

        source_url_lower = self.source_url.lower()
        if not source_url_lower.startswith(("http://", "https://")):
            return False

        now_monotonic = time.monotonic()
        if (
            now_monotonic - self._last_source_refresh_attempt_monotonic
            < CCTV_SOURCE_REFRESH_INTERVAL_SECONDS
        ):
            return False

        self._last_source_refresh_attempt_monotonic = now_monotonic

        try:
            cctv = find_its_cctv_by_name(self.name)
            refreshed_source_url = (cctv or {}).get("url", "").strip()
            refreshed_name = (cctv or {}).get("name", "").strip()

            if not refreshed_source_url:
                self.last_source_refresh_error = f"CCTV source not found for {self.name}"
                return False

            if refreshed_source_url == self.source_url:
                self.last_source_refresh_error = None
                return False

            self.source_url = refreshed_source_url
            if refreshed_name:
                self.name = refreshed_name
                self.source_identity = normalize_cctv_name(refreshed_name)
                self.event_clip_worker.camera_name = self.name
                self.inference_worker.camera_name = self.name
            self.source_refresh_count += 1
            self.last_source_refresh_at = self._utc_now()
            self.last_source_refresh_error = None
            return True
        except Exception as error:
            self.last_source_refresh_error = str(error)
            return False

    def _maybe_push_analysis_frame(self, frame: np.ndarray, timestamp: datetime) -> None:
        if self.analysis_interval <= 0:
            return

        now_monotonic = time.monotonic()
        if now_monotonic - self.last_analysis_push_monotonic < self.analysis_interval:
            return

        self.last_analysis_push_monotonic = now_monotonic
        self.analysis_queue.push(
            AnalysisFrame(
                camera_id=self.camera_id,
                frame_id=self.frames_read,
                timestamp=timestamp,
                frame=frame.copy(),
            )
        )

    def _handle_inference_events(self, events: list[dict]) -> None:
        for event in events:
            self.event_clip_worker.enqueue_event(event)

    def _set_status(self, status: CameraStatus) -> None:
        with self._status_lock:
            if self._status == status:
                return
            self._status = status
            self.status_changed_at = self._utc_now()

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _format_dt(value: datetime | None) -> str | None:
        return value.isoformat() if value else None
