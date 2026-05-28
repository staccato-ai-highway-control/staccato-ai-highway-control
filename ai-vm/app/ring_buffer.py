from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock

import cv2
import numpy as np


@dataclass(frozen=True)
class FrameSnapshot:
    timestamp: datetime
    frame: np.ndarray


class RingBuffer:
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

    def append(self, frame: np.ndarray, timestamp: datetime | None = None) -> FrameSnapshot:
        frame_timestamp = timestamp or datetime.now(timezone.utc)
        stored_frame = self._resize_for_buffer(frame)
        snapshot = FrameSnapshot(timestamp=frame_timestamp, frame=stored_frame)
        with self._lock:
            self._frames.append(snapshot)
        return snapshot

    def snapshot(self, copy_frames: bool = True) -> list[FrameSnapshot]:
        with self._lock:
            if not copy_frames:
                return list(self._frames)

            return [
                FrameSnapshot(timestamp=item.timestamp, frame=item.frame.copy())
                for item in self._frames
            ]

    def __len__(self) -> int:
        with self._lock:
            return len(self._frames)

    def estimated_bytes(self) -> int:
        with self._lock:
            return sum(item.frame.nbytes for item in self._frames)

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
