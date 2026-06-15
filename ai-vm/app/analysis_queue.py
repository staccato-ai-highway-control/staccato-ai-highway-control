from __future__ import annotations
# 역할: 카메라 캡처 프레임을 추론 스레드로 넘기는 분석 큐를 관리합니다.

from dataclasses import dataclass
from datetime import datetime
from queue import Empty, Full, Queue
from threading import Lock

import numpy as np


# 캡처된 프레임 한 장과 메타데이터를 추론 큐에 담기 위한 데이터 구조입니다.
@dataclass(frozen=True)
class AnalysisFrame:
    camera_id: str
    frame_id: int
    timestamp: datetime
    frame: np.ndarray


# 실시간성이 떨어지지 않도록 오래된 프레임을 버리며 최신 분석 프레임을 유지하는 큐입니다.
class AnalysisQueue:
    # 객체 생성에 필요한 설정값과 내부 상태를 초기화합니다.
    def __init__(self, maxsize: int = 4) -> None:
        self._queue: Queue[AnalysisFrame] = Queue(maxsize=max(1, maxsize))
        self._lock = Lock()
        self.pushed_frames = 0
        self.dropped_frames = 0

    # push 기능을 수행하는 함수입니다.
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

    # pop 기능을 수행하는 함수입니다.
    def pop(self, timeout: float = 0.2) -> AnalysisFrame | None:
        try:
            return self._queue.get(timeout=timeout)
        except Empty:
            return None

    # size 기능을 수행하는 함수입니다.
    def size(self) -> int:
        return self._queue.qsize()

    # clear 기능을 수행하는 함수입니다.
    def clear(self) -> None:
        while True:
            try:
                self._queue.get_nowait()
            except Empty:
                return
