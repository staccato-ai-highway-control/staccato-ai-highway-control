from __future__ import annotations
# 역할: MJPEG 스트림 응답과 동시 접속 제한을 관리합니다.

from collections import Counter
from contextlib import suppress
from itertools import count
from threading import Lock
from typing import Any
import inspect
import time

import cv2
import numpy as np
from starlette.responses import StreamingResponse
from starlette.types import Receive, Scope, Send

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
_stream_active_slots: dict[int, StreamSlot] = {}
_stream_slot_ids = count(1)


# MJPEG 클라이언트 접속 수를 정확히 반납하기 위한 슬롯 객체입니다.
class StreamSlot:
    # 객체 생성에 필요한 설정값과 내부 상태를 초기화합니다.
    def __init__(self, camera_id: str, slot_id: int, claimed_at: float) -> None:
        self.camera_id = camera_id
        self.slot_id = slot_id
        self.claimed_at = claimed_at
        self._released = False

    # 점유한 스트림 슬롯을 반납합니다.
    def release(self) -> None:
        global _stream_total_clients

        with _stream_lock:
            if self._released:
                return

            self._released = True
            _stream_active_slots.pop(self.slot_id, None)
            _stream_total_clients = max(0, _stream_total_clients - 1)
            if _stream_clients_by_camera[self.camera_id] > 1:
                _stream_clients_by_camera[self.camera_id] -= 1
            else:
                _stream_clients_by_camera.pop(self.camera_id, None)


async def _close_async_iterator(iterator: Any) -> None:
    aclose = getattr(iterator, "aclose", None)
    if aclose is None:
        return

    with suppress(Exception):
        result = aclose()
        if inspect.isawaitable(result):
            await result


def _close_sync_iterator(iterator: Any) -> None:
    close = getattr(iterator, "close", None)
    if close is None:
        return

    with suppress(Exception):
        close()


# StreamingResponse 취소/단절 경로에서도 슬롯을 반납하는 응답 객체입니다.
class StreamSlotStreamingResponse(StreamingResponse):
    def __init__(self, content: Any, *, slot: StreamSlot, **kwargs: Any) -> None:
        self._stream_slot = slot
        self._stream_content = content
        super().__init__(content, **kwargs)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        try:
            await super().__call__(scope, receive, send)
        finally:
            self._stream_slot.release()
            _close_sync_iterator(self._stream_content)
            await _close_async_iterator(self.body_iterator)
            await _close_async_iterator(self._stream_content)


# FastAPI request cleanup stack에 슬롯 반납을 등록합니다.
def register_stream_slot_cleanup(request: Any, slot: StreamSlot) -> None:
    cleanup_stack = getattr(request, "scope", {}).get("fastapi_inner_astack")
    callback = getattr(cleanup_stack, "callback", None)
    if callback is not None:
        callback(slot.release)


# claim_stream_slot 기능을 수행하는 함수입니다.
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
        slot = StreamSlot(
            camera_id=camera_id,
            slot_id=next(_stream_slot_ids),
            claimed_at=time.monotonic(),
        )
        _stream_active_slots[slot.slot_id] = slot
        return slot


# active_stream_counts 기능을 수행하는 함수입니다.
def active_stream_counts() -> dict[str, object]:
    with _stream_lock:
        now = time.monotonic()
        return {
            "total": _stream_total_clients,
            "by_camera": dict(_stream_clients_by_camera),
            "active_slots": [
                {
                    "slot_id": slot.slot_id,
                    "camera_id": slot.camera_id,
                    "age_seconds": round(now - slot.claimed_at, 3),
                }
                for slot in sorted(_stream_active_slots.values(), key=lambda item: item.slot_id)
            ],
            "max_total": MJPEG_MAX_TOTAL_CLIENTS,
            "max_per_camera": MJPEG_MAX_CLIENTS_PER_CAMERA,
            "fps": MJPEG_STREAM_FPS,
        }


# mjpeg_generator 기능을 수행하는 함수입니다.
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
                "Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n"
                "Pragma: no-cache\r\n"
                "X-Accel-Buffering: no\r\n"
                f"Content-Length: {len(jpeg)}\r\n\r\n"
            ).encode("ascii") + jpeg + b"\r\n"

            target_interval = frame_interval if has_frame else idle_interval
            elapsed = time.monotonic() - started_at
            if elapsed < target_interval:
                time.sleep(target_interval - elapsed)
    finally:
        if slot is not None:
            slot.release()


# create_placeholder_jpeg 기능을 수행하는 함수입니다.
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
