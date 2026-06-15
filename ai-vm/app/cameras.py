from __future__ import annotations
# 역할: 실행 중인 CameraWorker 인스턴스를 camera_id 기준으로 등록하고 관리합니다.

from threading import Lock

from .camera_worker import CameraWorker


# 여러 카메라 워커를 생성, 조회, 중지하는 공유 레지스트리입니다.
class CameraRegistry:
    # 객체 생성에 필요한 설정값과 내부 상태를 초기화합니다.
    def __init__(self) -> None:
        self._workers: dict[str, CameraWorker] = {}
        self._lock = Lock()

    # start_camera 기능을 수행하는 함수입니다.
    def start_camera(
        self,
        camera_id: str,
        source_url: str,
        name: str | None = None,
        target_fps: float = 10.0,
        analysis_fps: float = 5.0,
        analysis_queue_size: int = 1,
        buffer_seconds: float = 12.0,
        stale_timeout_seconds: float = 10.0,
        reconnect_backoff_seconds: float = 3.0,
    ) -> CameraWorker:
        with self._lock:
            existing = self._workers.get(camera_id)
            if (
                existing
                and existing.is_running()
                and existing.source_url == source_url
                and existing.target_fps == target_fps
                and existing.analysis_fps == analysis_fps
            ):
                return existing

            if existing:
                existing.stop()

            worker = CameraWorker(
                camera_id=camera_id,
                source_url=source_url,
                name=name,
                target_fps=target_fps,
                analysis_fps=analysis_fps,
                analysis_queue_size=analysis_queue_size,
                buffer_seconds=buffer_seconds,
                stale_timeout_seconds=stale_timeout_seconds,
                reconnect_backoff_seconds=reconnect_backoff_seconds,
            )
            self._workers[camera_id] = worker
            worker.start()
            return worker

    # stop_camera 기능을 수행하는 함수입니다.
    def stop_camera(self, camera_id: str) -> CameraWorker | None:
        with self._lock:
            worker = self._workers.get(camera_id)
        if worker:
            worker.stop()
        return worker

    # get_camera 기능을 수행하는 함수입니다.
    def get_camera(self, camera_id: str) -> CameraWorker | None:
        with self._lock:
            return self._workers.get(camera_id)

    # list_statuses 기능을 수행하는 함수입니다.
    def list_statuses(self) -> list[dict]:
        with self._lock:
            workers = list(self._workers.values())
        return [worker.to_status_payload() for worker in workers]

    # stop_all 기능을 수행하는 함수입니다.
    def stop_all(self) -> None:
        with self._lock:
            workers = list(self._workers.values())
        for worker in workers:
            worker.stop()


camera_registry = CameraRegistry()
