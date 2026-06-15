from __future__ import annotations
# 역할: 이벤트 클립 생성을 위해 최근 프레임을 시간 순서대로 보관합니다.

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock

import cv2
import numpy as np


# 이벤트 클립용으로 저장하는 timestamp와 프레임 복사본입니다.
@dataclass(frozen=True)
class FrameSnapshot:
    timestamp: datetime
    frame: np.ndarray


# 최근 프레임을 고정 길이로 보관하는 순환 버퍼입니다.
class RingBuffer:
    # 객체 생성에 필요한 설정값과 내부 상태를 초기화합니다.
    def __init__(
        self,
        max_seconds: float,
        fps: float,
        max_width: int = 0,
        max_height: int = 0,
        max_frames: int = 0,
    ) -> None:
        self.max_seconds = max_seconds
        self.fps = fps
        calculated_max_frames = max(1, int(max_seconds * fps))
        self.max_frames = (
            min(calculated_max_frames, max_frames)
            if max_frames > 0
            else calculated_max_frames
        )
        self.max_width = max_width
        self.max_height = max_height
        self._frames: deque[FrameSnapshot] = deque(maxlen=self.max_frames)
        self._lock = Lock()

    # 프레임을 버퍼에 추가하고 저장된 snapshot을 반환합니다.
    def append(self, frame: np.ndarray, timestamp: datetime | None = None) -> FrameSnapshot:
        frame_timestamp = timestamp or datetime.now(timezone.utc)
        stored_frame = self._resize_for_buffer(frame)
        snapshot = FrameSnapshot(timestamp=frame_timestamp, frame=stored_frame)
        with self._lock:
            self._frames.append(snapshot)
        return snapshot

    # 현재 버퍼 내용을 복사본 또는 참조 목록으로 반환합니다.
    def snapshot(self, copy_frames: bool = True) -> list[FrameSnapshot]:
        with self._lock:
            if not copy_frames:
                return list(self._frames)

            return [
                FrameSnapshot(timestamp=item.timestamp, frame=item.frame.copy())
                for item in self._frames
            ]

    # 현재 버퍼에 저장된 프레임 수를 반환합니다.
    def __len__(self) -> int:
        with self._lock:
            return len(self._frames)

    # estimated_bytes 기능을 수행하는 함수입니다.
    def estimated_bytes(self) -> int:
        with self._lock:
            return sum(item.frame.nbytes for item in self._frames)

    # _resize_for_buffer 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _resize_for_buffer(self, frame: np.ndarray) -> np.ndarray:
        if self.max_width <= 0 and self.max_height <= 0:
            return frame.copy()

        height, width = frame.shape[:2]
        scale = 1.0
        if self.max_width > 0 and width > self.max_width:
            scale = min(scale, self.max_width / width)
        if self.max_height > 0 and height > self.max_height:
            scale = min(scale, self.max_height / height)

        if scale >= 1.0:
            return frame.copy()

        resized_width = max(2, int(width * scale))
        resized_height = max(2, int(height * scale))
        resized_width -= resized_width % 2
        resized_height -= resized_height % 2
        return cv2.resize(
            frame,
            (resized_width, resized_height),
            interpolation=cv2.INTER_AREA,
        )
