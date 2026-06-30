import unittest
from unittest.mock import Mock, patch

import requests
from fastapi import HTTPException
from contextlib import AsyncExitStack
from types import SimpleNamespace

import anyio
from starlette.requests import ClientDisconnect

from app import main as app_main
from app import stream_server
from app.stream_server import (
    BOUNDARY,
    StreamSlotStreamingResponse,
    active_stream_counts,
    claim_stream_slot,
    mjpeg_generator,
    register_stream_slot_cleanup,
)


class FakeStatus:
    value = "running"


class FakeWorker:
    camera_id = "camera-1"
    status = FakeStatus()

    def is_running(self):
        return True

    def get_latest_jpeg(self, quality=80):
        return b"fake-jpeg"


class StreamSlotLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.original_max_total = stream_server.MJPEG_MAX_TOTAL_CLIENTS
        self.original_max_per_camera = stream_server.MJPEG_MAX_CLIENTS_PER_CAMERA
        stream_server.MJPEG_MAX_TOTAL_CLIENTS = 1
        stream_server.MJPEG_MAX_CLIENTS_PER_CAMERA = 1
        self.reset_slots()

    def tearDown(self):
        self.reset_slots()
        stream_server.MJPEG_MAX_TOTAL_CLIENTS = self.original_max_total
        stream_server.MJPEG_MAX_CLIENTS_PER_CAMERA = self.original_max_per_camera

    def reset_slots(self):
        with stream_server._stream_lock:
            stream_server._stream_total_clients = 0
            stream_server._stream_clients_by_camera.clear()
            stream_server._stream_active_slots.clear()

    def test_disconnect_releases_slot_and_allows_new_claim(self):
        slot = claim_stream_slot("camera-1")
        self.assertIsNotNone(slot)
        self.assertIsNone(claim_stream_slot("camera-1"))

        response = StreamSlotStreamingResponse(
            mjpeg_generator(FakeWorker(), quality=80, fps=1000.0, slot=slot),
            slot=slot,
            media_type=f"multipart/x-mixed-replace; boundary={BOUNDARY}",
        )

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            if message["type"] == "http.response.body" and message.get("more_body"):
                raise OSError("client disconnected")

        async def call_response():
            await response(
                {"type": "http", "asgi": {"spec_version": "2.4"}},
                receive,
                send,
            )

        with self.assertRaises(ClientDisconnect):
            anyio.run(call_response)

        self.assertEqual(active_stream_counts()["total"], 0)
        replacement = claim_stream_slot("camera-1")
        self.assertIsNotNone(replacement)
        replacement.release()

    def test_request_cleanup_releases_slot_before_body_iteration_starts(self):
        async def exercise():
            slot = claim_stream_slot("camera-1")
            self.assertIsNotNone(slot)
            async with AsyncExitStack() as stack:
                request = SimpleNamespace(scope={"fastapi_inner_astack": stack})
                register_stream_slot_cleanup(request, slot)
                self.assertEqual(active_stream_counts()["total"], 1)

            self.assertEqual(active_stream_counts()["total"], 0)
            replacement = claim_stream_slot("camera-1")
            self.assertIsNotNone(replacement)
            replacement.release()

        anyio.run(exercise)

    def test_response_start_failure_releases_slot_without_starting_iterator(self):
        started = False
        slot = claim_stream_slot("camera-1")
        self.assertIsNotNone(slot)

        def content():
            nonlocal started
            started = True
            yield b"chunk"

        response = StreamSlotStreamingResponse(
            content(),
            slot=slot,
            media_type="application/octet-stream",
        )

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            if message["type"] == "http.response.start":
                raise OSError("client disconnected before body")

        async def call_response():
            await response(
                {"type": "http", "asgi": {"spec_version": "2.4"}},
                receive,
                send,
            )

        with self.assertRaises(ClientDisconnect):
            anyio.run(call_response)

        self.assertFalse(started)
        self.assertEqual(active_stream_counts()["total"], 0)


class StartedWorker:
    status = FakeStatus()

    def __init__(
        self,
        camera_id="camera-1",
        source_url="https://internal.example/stream.m3u8",
        name=None,
        target_fps=10.0,
        analysis_fps=2.0,
        analysis_queue_size=4,
        running=True,
    ):
        self.camera_id = camera_id
        self.source_url = source_url
        self.name = name
        self.target_fps = target_fps
        self.analysis_fps = analysis_fps
        self.analysis_queue_size = analysis_queue_size
        self.running = running

    def is_running(self):
        return self.running

    def get_latest_jpeg(self, quality=80):
        return b"fake-jpeg"

    def get_latest_detection_result(self):
        return None

    def get_latest_frame(self):
        return None


class FakeRegistry:
    def __init__(self):
        self.workers = {}
        self.start_calls = []

    def get_camera(self, camera_id):
        return self.workers.get(camera_id)

    def start_camera(self, **kwargs):
        self.start_calls.append(kwargs)
        worker = StartedWorker(**kwargs)
        self.workers[kwargs["camera_id"]] = worker
        return worker


class ConfiguredITSCameraWorkerTests(unittest.TestCase):
    def setUp(self):
        self.registry = FakeRegistry()
        self.source_names = [f"source-{index}" for index in range(1, 9)]
        self.patches = [
            patch.object(app_main, "camera_registry", self.registry),
            patch.object(app_main, "_selected_cctv_source_names", return_value=self.source_names),
        ]
        for patcher in self.patches:
            patcher.start()

    def tearDown(self):
        for patcher in reversed(self.patches):
            patcher.stop()
        app_main._configured_its_camera_locks.clear()

    def test_camera_2_starts_from_configured_its_source_with_analysis_fps(self):
        resolver = Mock(return_value={"name": "source-2", "url": "https://internal.example/camera-2.m3u8"})
        with patch.object(app_main, "find_its_cctv_by_name", resolver):
            worker = app_main._ensure_configured_its_camera_worker("camera-2")

        self.assertIsNotNone(worker)
        resolver.assert_called_once_with("source-2")
        self.assertEqual(len(self.registry.start_calls), 1)
        self.assertEqual(self.registry.start_calls[0]["name"], "source-2")
        self.assertEqual(self.registry.start_calls[0]["analysis_fps"], 2.0)
        self.assertEqual(self.registry.start_calls[0]["analysis_queue_size"], 4)
        self.assertEqual(worker.analysis_queue_size, 4)

    def test_camera_3_starts_from_configured_its_source_with_zero_analysis_fps(self):
        resolver = Mock(return_value={"name": "source-3", "url": "https://internal.example/camera-3.m3u8"})
        with patch.object(app_main, "find_its_cctv_by_name", resolver):
            worker = app_main._ensure_configured_its_camera_worker("camera-3")

        self.assertIsNotNone(worker)
        resolver.assert_called_once_with("source-3")
        self.assertEqual(self.registry.start_calls[0]["analysis_fps"], 0.0)
        self.assertEqual(self.registry.start_calls[0]["analysis_queue_size"], 4)
        self.assertEqual(worker.analysis_fps, 0.0)
        self.assertEqual(worker.analysis_queue_size, 4)

    def test_out_of_range_or_invalid_camera_does_not_resolve_or_start(self):
        resolver = Mock(return_value={"name": "source-9", "url": "https://internal.example/camera-9.m3u8"})
        with patch.object(app_main, "find_its_cctv_by_name", resolver):
            self.assertIsNone(app_main._ensure_configured_its_camera_worker("camera-9"))
            self.assertIsNone(app_main._ensure_configured_its_camera_worker("not-a-camera"))

        resolver.assert_not_called()
        self.assertEqual(self.registry.start_calls, [])

    def test_running_worker_is_reused_without_its_lookup(self):
        existing = StartedWorker(camera_id="camera-2", analysis_fps=2.0)
        self.registry.workers["camera-2"] = existing
        resolver = Mock(side_effect=AssertionError("resolver should not be called"))

        with patch.object(app_main, "find_its_cctv_by_name", resolver):
            worker = app_main._ensure_configured_its_camera_worker("camera-2")

        self.assertIs(worker, existing)
        resolver.assert_not_called()
        self.assertEqual(self.registry.start_calls, [])

    def test_its_lookup_failure_or_missing_url_does_not_expose_sensitive_url(self):
        sensitive_url = "rtsp://user:password@example.invalid/secret"
        with patch.object(
            app_main,
            "find_its_cctv_by_name",
            side_effect=requests.RequestException(sensitive_url),
        ):
            with self.assertRaises(HTTPException) as context:
                app_main._ensure_configured_its_camera_worker("camera-2")

        self.assertNotIn(sensitive_url, str(context.exception.detail))

        with patch.object(app_main, "find_its_cctv_by_name", return_value={"name": "source-2"}):
            with self.assertRaises(HTTPException) as context:
                app_main._ensure_configured_its_camera_worker("camera-2")

        self.assertNotIn("rtsp://", str(context.exception.detail))
        self.assertEqual(self.registry.start_calls, [])

    def test_stream_endpoint_keeps_slot_cleanup_and_mjpeg_media_type(self):
        resolver = Mock(return_value={"name": "source-2", "url": "https://internal.example/camera-2.m3u8"})
        request = SimpleNamespace(scope={})
        with patch.object(app_main, "find_its_cctv_by_name", resolver):
            response = app_main.camera_mjpeg_stream(
                "camera-2",
                request,
                source_url=None,
                quality=80,
                _auth=None,
            )

        self.assertEqual(
            response.media_type,
            "multipart/x-mixed-replace; boundary=frame",
        )
        self.assertEqual(active_stream_counts()["total"], 1)
        response._stream_slot.release()
        self.assertEqual(active_stream_counts()["total"], 0)


class SnapshotAndTrafficSecurityTests(unittest.TestCase):
    def setUp(self):
        self.registry = FakeRegistry()
        self.source_names = [f"source-{index}" for index in range(1, 9)]
        self.patches = [
            patch.object(app_main, "camera_registry", self.registry),
            patch.object(app_main, "_selected_cctv_source_names", return_value=self.source_names),
        ]
        for patcher in self.patches:
            patcher.start()

    def tearDown(self):
        for patcher in reversed(self.patches):
            patcher.stop()
        app_main._configured_its_camera_locks.clear()

    def route_for(self, path):
        for route in app_main.app.routes:
            if getattr(route, "path", None) == path:
                return route
        return None

    def assert_requires_internal_token(self, path):
        route = self.route_for(path)
        self.assertIsNotNone(route)
        dependency_calls = [
            dependency.call
            for dependency in getattr(route, "dependant", SimpleNamespace(dependencies=[])).dependencies
        ]
        self.assertIn(app_main.require_internal_token, dependency_calls)

    def test_internal_snapshot_route_exists_and_requires_internal_token(self):
        self.assert_requires_internal_token(
            "/internal/cameras/{camera_id}/snapshot/latest.jpg"
        )
        self.assert_requires_internal_token("/snapshots/{camera_id}/latest.jpg")

    def test_snapshot_lazy_start_is_limited_to_configured_camera_range(self):
        resolver = Mock(return_value={"name": "source-2", "url": "https://internal.example/camera-2.m3u8"})
        with patch.object(app_main, "find_its_cctv_by_name", resolver):
            response = app_main.camera_latest_snapshot("camera-2", quality=90, _auth=None)

        resolver.assert_called_once_with("source-2")
        self.assertEqual(response.media_type, "image/jpeg")
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertEqual(response.body, b"fake-jpeg")

        resolver = Mock(return_value={"name": "source-9", "url": "https://internal.example/camera-9.m3u8"})
        with patch.object(app_main, "find_its_cctv_by_name", resolver):
            with self.assertRaises(HTTPException) as context:
                app_main.camera_latest_snapshot("camera-9", quality=90, _auth=None)

        self.assertEqual(context.exception.status_code, 404)
        resolver.assert_not_called()
        self.assertEqual(len(self.registry.start_calls), 1)

    def test_traffic_cctv_response_removes_source_url_keys(self):
        cctv_response = {
            "items": [
                {
                    "name": "source-1",
                    "url": "https://internal.example/camera-1.m3u8",
                    "cctvurl": "https://internal.example/raw-camera-1.m3u8",
                    "source_url": "rtsp://user:password@example.invalid/secret",
                    "format": "HLS",
                },
                {
                    "name": "source-2",
                    "url": "https://internal.example/camera-2.m3u8",
                    "format": "HLS",
                },
            ],
            "fromCache": False,
            "cacheUpdatedAt": None,
            "originalError": None,
        }
        with patch.object(app_main, "get_its_cctv_list_response", return_value=cctv_response):
            response = app_main.traffic_cctv_api(
                min_x="0",
                max_x="1",
                min_y="0",
                max_y="1",
                cctv_type="5",
                road_type="ex",
                limit=2,
                source_names=None,
                _auth=None,
            )

        for payload_key in ("data", "items", "cameras"):
            for item in response[payload_key]:
                self.assertNotIn("url", item)
                self.assertNotIn("cctvurl", item)
                self.assertNotIn("source_url", item)
                self.assertIn("name", item)

    def test_traffic_cctv_errors_use_safe_messages(self):
        secret = "rtsp://user:password@example.invalid/secret"
        with patch.object(
            app_main,
            "get_its_cctv_list_response",
            side_effect=requests.RequestException(secret),
        ):
            response = app_main.traffic_cctv_api(
                min_x="0",
                max_x="1",
                min_y="0",
                max_y="1",
                cctv_type="5",
                road_type="ex",
                limit=2,
                source_names=None,
                _auth=None,
            )

        self.assertEqual(response.status_code, 502)
        self.assertIn(b"ITS API request failed.", response.body)
        self.assertNotIn(secret.encode("utf-8"), response.body)


if __name__ == "__main__":
    unittest.main()
