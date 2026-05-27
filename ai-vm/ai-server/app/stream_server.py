from __future__ import annotations

from collections import Counter
from threading import Lock
import time

import cv2
import numpy as np

from .camera_worker import CameraWorker
from .config import (
    MJPEG_MAX_CLIENTS_PER_CAMERA,
    MJPEG_MAX_TOTAL_CLIENTS,
    MJPEG_STREAM_FPS,
)


BOUNDARY = "frame"
_stream_lock = Lock()
_stream_total_clients = 0
_stream_clients_by_camera: Counter[str] = Counter()


class StreamSlot:
    def __init__(self, camera_id: str) -> None:
        self.camera_id = camera_id
        self._released = False

    def release(self) -> None:
        global _stream_total_clients

        with _stream_lock:
            if self._released:
                return

            self._released = True
            _stream_total_clients = max(0, _stream_total_clients - 1)
            if _stream_clients_by_camera[self.camera_id] > 1:
                _stream_clients_by_camera[self.camera_id] -= 1
            else:
                _stream_clients_by_camera.pop(self.camera_id, None)


def claim_stream_slot(camera_id: str) -> StreamSlot | None:
    global _stream_total_clients

    with _stream_lock:
        if MJPEG_MAX_TOTAL_CLIENTS > 0 and _stream_total_clients >= MJPEG_MAX_TOTAL_CLIENTS:
            return None
        if (
            MJPEG_MAX_CLIENTS_PER_CAMERA > 0
            and _stream_clients_by_camera[camera_id] >= MJPEG_MAX_CLIENTS_PER_CAMERA
        ):
            return None

        _stream_total_clients += 1
        _stream_clients_by_camera[camera_id] += 1
        return StreamSlot(camera_id)


def active_stream_counts() -> dict[str, object]:
    with _stream_lock:
        return {
            "total": _stream_total_clients,
            "by_camera": dict(_stream_clients_by_camera),
            "max_total": MJPEG_MAX_TOTAL_CLIENTS,
            "max_per_camera": MJPEG_MAX_CLIENTS_PER_CAMERA,
            "fps": MJPEG_STREAM_FPS,
        }


def mjpeg_generator(
    worker: CameraWorker,
    quality: int = 80,
    idle_fps: float = 1.0,
    fps: float = MJPEG_STREAM_FPS,
    slot: StreamSlot | None = None,
):
    frame_interval = 1.0 / max(fps, 0.1)
    idle_interval = 1.0 / max(idle_fps, 0.1)

    try:
        while worker.is_running():
            started_at = time.monotonic()
            jpeg = worker.get_latest_jpeg(quality=quality)
            has_frame = jpeg is not None
            if jpeg is None:
                jpeg = create_placeholder_jpeg(
                    f"{worker.camera_id} {worker.status.value}",
                    quality=quality,
                )

            yield (
                f"--{BOUNDARY}\r\n"
                "Content-Type: image/jpeg\r\n"
                f"Content-Length: {len(jpeg)}\r\n\r\n"
            ).encode("ascii") + jpeg + b"\r\n"

            target_interval = frame_interval if has_frame else idle_interval
            elapsed = time.monotonic() - started_at
            if elapsed < target_interval:
                time.sleep(target_interval - elapsed)
    finally:
        if slot is not None:
            slot.release()


def create_placeholder_jpeg(message: str, quality: int = 80) -> bytes:
    frame = np.zeros((360, 640, 3), dtype=np.uint8)
    cv2.putText(
        frame,
        message[:64],
        (32, 180),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (230, 230, 230),
        2,
        cv2.LINE_AA,
    )
    success, encoded = cv2.imencode(
        ".jpg",
        frame,
        [int(cv2.IMWRITE_JPEG_QUALITY), quality],
    )
    if not success:
        raise RuntimeError("Failed to encode placeholder JPEG.")
    return encoded.tobytes()
