from __future__ import annotations

import unittest
from unittest.mock import patch

from app.config import REPORT_STOP_DANGER_SECONDS
from app.detector import Detection
from app.report_stop_analyzer import ReportStopAnalyzer


FRAME_SHAPE = (1080, 1920, 3)


class ReportStopAnalyzerTest(unittest.TestCase):
    @staticmethod
    def _vehicle_detection() -> Detection:
        return Detection(
            bbox=[900.0, 700.0, 1100.0, 900.0],
            class_id=2,
            class_name="car",
            confidence=0.95,
            track_id=101,
        )

    @staticmethod
    def _full_frame_roi(roi_id: str) -> dict[str, list[list[int]]]:
        return {
            roi_id: [
                [0, 0],
                [1920, 0],
                [1920, 1080],
                [0, 1080],
            ]
        }

    def _emit_stop_event(self, analyzer: ReportStopAnalyzer) -> dict:
        detection = self._vehicle_detection()

        analyzer.update(
            frame_index=0,
            video_timestamp_seconds=0.0,
            detections=[detection],
            frame_shape=FRAME_SHAPE,
        )
        analyzer.update(
            frame_index=1,
            video_timestamp_seconds=1.0,
            detections=[detection],
            frame_shape=FRAME_SHAPE,
        )

        event_timestamp = max(
            2.0,
            float(REPORT_STOP_DANGER_SECONDS) + 0.1,
        )
        events = analyzer.update(
            frame_index=2,
            video_timestamp_seconds=event_timestamp,
            detections=[detection],
            frame_shape=FRAME_SHAPE,
        )

        self.assertEqual(len(events), 1, analyzer.build_result())
        return events[0]

    def test_no_roi_emits_stopped_vehicle(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id=None,
            model_name="test-model",
            model_version="test-version",
        )

        event = self._emit_stop_event(analyzer)

        self.assertEqual(event["incident_type"], "STOPPED_VEHICLE")
        self.assertEqual(event["roi_type"], "UNKNOWN")
        self.assertIsNone(event["roi_id"])
        self.assertEqual(event["roi_ids"], [])
        self.assertIsNone(analyzer.build_result()["debug"]["failure_reason"])

    def test_driving_lane_roi_emits_lane_stop(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id="camera-1",
            model_name="test-model",
            model_version="test-version",
        )

        with patch(
            "app.report_stop_analyzer.get_camera_rois",
            return_value=self._full_frame_roi("MEDIAN"),
        ):
            event = self._emit_stop_event(analyzer)

        self.assertEqual(event["incident_type"], "LANE_STOP")
        self.assertEqual(event["roi_type"], "DRIVING_LANE")
        self.assertEqual(event["roi_id"], "MEDIAN")
        self.assertEqual(event["roi_ids"], ["MEDIAN"])

    def test_shoulder_roi_emits_shoulder_stop(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id="camera-1",
            model_name="test-model",
            model_version="test-version",
        )

        with patch(
            "app.report_stop_analyzer.get_camera_rois",
            return_value=self._full_frame_roi("LEFT_SHOULDER"),
        ):
            event = self._emit_stop_event(analyzer)

        self.assertEqual(event["incident_type"], "SHOULDER_STOP")
        self.assertEqual(event["roi_type"], "SHOULDER")
        self.assertEqual(event["roi_id"], "LEFT_SHOULDER")
        self.assertEqual(event["roi_ids"], ["LEFT_SHOULDER"])


if __name__ == "__main__":
    unittest.main()
