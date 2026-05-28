from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from queue import Empty, Full, Queue
from threading import Lock

import numpy as np


@dataclass(frozen=True)
class AnalysisFrame:
    camera_id: str
    frame_id: int
    timestamp: datetime
    frame: np.ndarray


class AnalysisQueue:
    def __init__(self, maxsize: int = 4) -> None:
        self._queue: Queue[AnalysisFrame] = Queue(maxsize=max(1, maxsize))
        self._lock = Lock()
        self.pushed_frames = 0
        self.dropped_frames = 0

    def push(self, item: AnalysisFrame) -> None:
        with self._lock:
            self.pushed_frames += 1
            try:
                self._queue.put_nowait(item)
                return
            except Full:
                self.dropped_frames += 1

            try:
                self._queue.get_nowait()
            except Empty:
                pass

            try:
                self._queue.put_nowait(item)
            except Full:
                self.dropped_frames += 1

    def pop(self, timeout: float = 0.2) -> AnalysisFrame | None:
        try:
            return self._queue.get(timeout=timeout)
        except Empty:
            return None

    def size(self) -> int:
        return self._queue.qsize()

    def clear(self) -> None:
        while True:
            try:
                self._queue.get_nowait()
            except Empty:
                return
