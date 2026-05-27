from __future__ import annotations

from threading import Lock

from .camera_worker import CameraWorker


class CameraRegistry:
    def __init__(self) -> None:
        self._workers: dict[str, CameraWorker] = {}
        self._lock = Lock()

    def start_camera(
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
    ) -> CameraWorker:
        with self._lock:
            existing = self._workers.get(camera_id)
            if existing and existing.is_running() and existing.source_url == source_url:
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

    def stop_camera(self, camera_id: str) -> CameraWorker | None:
        with self._lock:
            worker = self._workers.get(camera_id)
        if worker:
            worker.stop()
        return worker

    def get_camera(self, camera_id: str) -> CameraWorker | None:
        with self._lock:
            return self._workers.get(camera_id)

    def list_statuses(self) -> list[dict]:
        with self._lock:
            workers = list(self._workers.values())
        return [worker.to_status_payload() for worker in workers]

    def stop_all(self) -> None:
        with self._lock:
            workers = list(self._workers.values())
        for worker in workers:
            worker.stop()


camera_registry = CameraRegistry()
