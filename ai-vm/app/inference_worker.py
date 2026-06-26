from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from threading import Event, Lock, Thread
import time
from typing import Any, Callable

from .analysis_queue import AnalysisQueue
from .bbox_store import build_bbox_metadata, set_latest_bbox_metadata
from .detector import Detection, detector
from .event_detector import EventDetector
from .relay_client import RelayClient
from .realtime_detection_filter import filter_realtime_display_detections



class InferenceStatus(str, Enum):
    INIT = "INIT"
    RUNNING = "RUNNING"
    ERROR = "ERROR"
    STOPPED = "STOPPED"


@dataclass(frozen=True)
class InferenceResult:
    camera_id: str
    frame_id: int
    timestamp: datetime
    frame_width: int
    frame_height: int
    bbox_format: str
    model: str | None
    detections: list[Detection]
    events: list[dict[str, Any]]
    inference_ms: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "camera_id": self.camera_id,
            "frame_id": self.frame_id,
            "timestamp": self.timestamp.isoformat(),
            "frame_width": self.frame_width,
            "frame_height": self.frame_height,
            "bbox_format": self.bbox_format,
            "model": self.model,
            "detections": [item.to_dict() for item in self.detections],
            "count": len(self.detections),
            "events": self.events,
            "event_count": len(self.events),
            "inference_ms": round(self.inference_ms, 2),
        }


class InferenceWorker:
    def __init__(
        self,
        camera_id: str,
        analysis_queue: AnalysisQueue,
        camera_name: str | None = None,
        event_handler: Callable[[list[dict[str, Any]]], None] | None = None,
        confidence: float | None = None,
        imgsz: int | None = None,
    ) -> None:
        self.camera_id = camera_id
        self.camera_name = camera_name or camera_id
        self.analysis_queue = analysis_queue
        self.confidence = confidence
        self.imgsz = imgsz
        self.event_handler = event_handler
        self.event_detector = EventDetector(
            camera_id=camera_id,
            camera_name=self.camera_name,
        )
        self.relay_client = RelayClient()

        self._status = InferenceStatus.INIT
        self._status_lock = Lock()
        self._thread: Thread | None = None
        self._stop_event = Event()

        self._latest_result: InferenceResult | None = None
        self._latest_result_lock = Lock()

        self.started_at: datetime | None = None
        self.status_changed_at = self._utc_now()
        self.last_inference_at: datetime | None = None
        self.frames_analyzed = 0
        self.error_message: str | None = None

    @property
    def status(self) -> InferenceStatus:
        with self._status_lock:
            return self._status

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._stop_event.clear()
        self.started_at = self._utc_now()
        self._set_status(InferenceStatus.INIT)
        self._thread = Thread(
            target=self._inference_loop,
            name=f"InferenceWorker-{self.camera_id}",
            daemon=True,
        )
        self._thread.start()

    def stop(self, join_timeout: float = 2.0) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=join_timeout)
        self._set_status(InferenceStatus.STOPPED)
        self.analysis_queue.clear()

    def is_running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    def get_latest_result(self) -> InferenceResult | None:
        with self._latest_result_lock:
            return self._latest_result

    def to_status_payload(self) -> dict[str, Any]:
        latest_result = self.get_latest_result()
        return {
            "status": self.status.value,
            "started_at": self._format_dt(self.started_at),
            "status_changed_at": self._format_dt(self.status_changed_at),
            "last_inference_at": self._format_dt(self.last_inference_at),
            "frames_analyzed": self.frames_analyzed,
            "queue_size": self.analysis_queue.size(),
            "queue_pushed_frames": self.analysis_queue.pushed_frames,
            "queue_dropped_frames": self.analysis_queue.dropped_frames,
            "latest_frame_id": latest_result.frame_id if latest_result else None,
            "latest_detections_count": len(latest_result.detections)
            if latest_result
            else 0,
            "latest_event_count": len(latest_result.events) if latest_result else 0,
            "model": detector.current_model_name,
            "event_detector": self.event_detector.to_status_payload(),
            "event_handler_enabled": self.event_handler is not None,
            "relay": self.relay_client.to_status_payload(),
            "error_message": self.error_message,
        }

    def _inference_loop(self) -> None:
        self._set_status(InferenceStatus.RUNNING)

        while not self._stop_event.is_set():
            item = self.analysis_queue.pop(timeout=0.2)
            if item is None:
                continue

            started_at = time.monotonic()
            try:
                raw_detections = detector.detect(
                    item.frame,
                    confidence=self.confidence,
                    imgsz=self.imgsz,
                    frame_id=item.frame_id,
                )
                display_detections = filter_realtime_display_detections(
                    camera_id=item.camera_id,
                    detections=raw_detections,
                    frame_shape=item.frame.shape,
                )
                events = self.event_detector.update(
                    frame_id=item.frame_id,
                    timestamp=item.timestamp,
                    detections=raw_detections,
                    frame_shape=item.frame.shape,
                )
                set_latest_bbox_metadata(
                    self.camera_id,
                    build_bbox_metadata(
                        camera_id=self.camera_id,
                        frame_id=item.frame_id,
                        timestamp=item.timestamp,
                        frame_shape=item.frame.shape,
                        detections=[item.to_dict() for item in display_detections],
                    ),
                )
                if events:
                    if self.event_handler is not None:
                        self.event_handler(events)
                    else:
                        for event in events:
                            self.relay_client.send_event(event)

                inference_ms = (time.monotonic() - started_at) * 1000.0
                frame_height, frame_width = item.frame.shape[:2]

                result = InferenceResult(
                    camera_id=item.camera_id,
                    frame_id=item.frame_id,
                    timestamp=item.timestamp,
                    frame_width=int(frame_width),
                    frame_height=int(frame_height),
                    bbox_format="xyxy",
                    model=detector.model_name,
                    detections=display_detections,
                    events=events,
                    inference_ms=inference_ms,
                )

                with self._latest_result_lock:
                    self._latest_result = result

                self.frames_analyzed += 1
                self.last_inference_at = self._utc_now()
                self.error_message = None
                self._set_status(InferenceStatus.RUNNING)
            except Exception as error:
                self.error_message = str(error)
                self._set_status(InferenceStatus.ERROR)
                self._stop_event.wait(timeout=1.0)

        self._set_status(InferenceStatus.STOPPED)

    def _set_status(self, status: InferenceStatus) -> None:
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
