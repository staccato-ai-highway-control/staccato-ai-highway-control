from __future__ import annotations

import unittest
from unittest.mock import patch

from app.config import (
    EVENT_TRACK_STALE_FRAMES,
    REPORT_STOP_DANGER_SECONDS,
)
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

    def test_confirmed_stop_annotations_persist_until_vehicle_moves(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id=None,
            model_name="test-model",
            model_version="test-version",
        )

        event = self._emit_stop_event(analyzer)
        event_timestamp = float(event["video_timestamp_seconds"])

        analyzer.update(
            frame_index=3,
            video_timestamp_seconds=event_timestamp + 1.0,
            detections=[self._vehicle_detection()],
            frame_shape=FRAME_SHAPE,
        )

        annotations = analyzer.build_result()["render_annotations"]

        self.assertEqual(len(annotations), 2)
        self.assertEqual(
            [annotation["frame_index"] for annotation in annotations],
            [2, 3],
        )
        self.assertTrue(
            all(annotation["persistent_annotation"] for annotation in annotations)
        )
        self.assertTrue(
            all(annotation["box_color"] == "red" for annotation in annotations)
        )
        self.assertTrue(
            all(
                annotation["incident_type"] == "STOPPED_VEHICLE"
                for annotation in annotations
            )
        )

        moved_detection = Detection(
            bbox=[1300.0, 700.0, 1500.0, 900.0],
            class_id=2,
            class_name="car",
            confidence=0.95,
            track_id=101,
        )

        analyzer.update(
            frame_index=4,
            video_timestamp_seconds=event_timestamp + 2.0,
            detections=[moved_detection],
            frame_shape=FRAME_SHAPE,
        )

        annotations_after_move = analyzer.build_result()["render_annotations"]

        self.assertEqual(
            len(annotations_after_move),
            2,
            "차량이 다시 움직이면 빨간 정차 렌더링 기록이 추가되면 안 됩니다.",
        )

    def test_confirmed_stop_survives_one_missing_analysis_sample(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id=None,
            model_name="test-model",
            model_version="test-version",
        )

        event = self._emit_stop_event(analyzer)
        event_timestamp = float(event["video_timestamp_seconds"])

        missing_sample_frame = 2 + EVENT_TRACK_STALE_FRAMES

        analyzer.update(
            frame_index=missing_sample_frame,
            video_timestamp_seconds=event_timestamp + 1.0,
            detections=[],
            frame_shape=FRAME_SHAPE,
        )

        annotations = analyzer.build_result()["render_annotations"]

        self.assertEqual(
            len(annotations),
            2,
            "정차 확정 뒤 한 번의 탐지 누락은 마지막 빨간 bbox로 보완해야 합니다.",
        )

        carried = annotations[-1]

        self.assertEqual(carried["frame_index"], missing_sample_frame)
        self.assertTrue(carried["persistent_annotation"])
        self.assertTrue(carried["inferred_from_last_seen"])
        self.assertEqual(carried["box_color"], "red")
        self.assertEqual(carried["track_id"], 101)

        annotation_count_before_expiry = len(annotations)

        analyzer.update(
            frame_index=(
                missing_sample_frame
                + EVENT_TRACK_STALE_FRAMES
                + 1
            ),
            video_timestamp_seconds=event_timestamp + 2.0,
            detections=[],
            frame_shape=FRAME_SHAPE,
        )

        annotations_after_expiry = analyzer.build_result()["render_annotations"]

        self.assertEqual(
            len(annotations_after_expiry),
            annotation_count_before_expiry,
            "stale 기준을 넘겨 차량이 사라진 뒤에는 빨간 박스를 더 유지하면 안 됩니다.",
        )

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
