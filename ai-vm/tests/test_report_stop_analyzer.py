from __future__ import annotations

import json
import unittest
from unittest.mock import patch

from app.config import (
    EVENT_TRACK_STALE_FRAMES,
    REPORT_STOP_DANGER_SECONDS,
)
from app.detector import Detection
from app.report_stop_analyzer import ReportStopAnalyzer


FRAME_SHAPE = (1080, 1920, 3)
FULL_FRAME_POINTS = [
    [0, 0],
    [1920, 0],
    [1920, 1080],
    [0, 1080],
]
BOUNDARY_POINTS = [
    [900, 850],
    [950, 850],
    [950, 900],
    [900, 900],
]


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
    def _roi_payload(
        roi_type: str,
        points: list[list[int]] | None = None,
        roi_id: str | None = None,
    ) -> list[dict]:
        return [
            {
                "id": roi_id or roi_type.lower(),
                "type": roi_type,
                "polygon_points": points or FULL_FRAME_POINTS,
            }
        ]

    @staticmethod
    def _full_frame_roi(roi_id: str) -> dict[str, list[list[int]]]:
        return {roi_id: [list(point) for point in FULL_FRAME_POINTS]}

    def _run_stop_sequence(self, analyzer: ReportStopAnalyzer) -> list[dict]:
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
        return analyzer.update(
            frame_index=2,
            video_timestamp_seconds=event_timestamp,
            detections=[detection],
            frame_shape=FRAME_SHAPE,
        )

    def _emit_stop_event(self, analyzer: ReportStopAnalyzer) -> dict:
        events = self._run_stop_sequence(analyzer)
        self.assertEqual(len(events), 1, analyzer.build_result())
        return events[0]

    def _driving_lane_analyzer(self) -> ReportStopAnalyzer:
        return ReportStopAnalyzer(
            camera_id=None,
            model_name="test-model",
            model_version="test-version",
            rois=self._roi_payload("DRIVING_LANE"),
        )

    def test_confirmed_stop_annotations_persist_until_vehicle_moves(self) -> None:
        analyzer = self._driving_lane_analyzer()

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
                annotation["incident_type"] == "LANE_STOP"
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
        analyzer = self._driving_lane_analyzer()

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

    def test_unmatched_roi_boundary_emits_review_stopped_vehicle(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id=None,
            model_name="test-model",
            model_version="test-version",
            rois=self._roi_payload(
                "DRIVING_LANE",
                points=[[0, 0], [100, 0], [100, 100], [0, 100]],
            ),
        )

        event = self._emit_stop_event(analyzer)
        result = analyzer.build_result()
        last_log = result["detection_logs"][-1]

        self.assertEqual(event["incident_type"], "STOPPED_VEHICLE")
        self.assertEqual(event["box_color"], "red")
        self.assertTrue(event["review_required"])
        self.assertEqual(last_log["roi_type"], "UNKNOWN")
        self.assertFalse(last_log["roi_excluded"])
        self.assertTrue(last_log["review_required"])
        self.assertEqual(result["incident_candidates"], [event])

    def test_driving_lane_roi_emits_lane_stop(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id="camera-1",
            model_name="test-model",
            model_version="test-version",
            rois=self._roi_payload("DRIVING_LANE", roi_id="lane-1"),
        )

        event = self._emit_stop_event(analyzer)

        self.assertEqual(event["incident_type"], "LANE_STOP")
        self.assertEqual(event["roi_type"], "DRIVING_LANE")
        self.assertEqual(event["roi_id"], "lane-1")
        self.assertGreaterEqual(event["roi_overlap_ratio"], 0.35)

    def test_polygon_json_string_payload_emits_lane_stop(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id="camera-1",
            model_name="test-model",
            model_version="test-version",
            rois=[
                {
                    "id": "lane-json",
                    "type": "DRIVING_LANE",
                    "polygon_json": json.dumps(FULL_FRAME_POINTS),
                }
            ],
        )

        event = self._emit_stop_event(analyzer)

        self.assertEqual(event["incident_type"], "LANE_STOP")
        self.assertEqual(event["roi_id"], "lane-json")
        self.assertGreaterEqual(event["roi_overlap_ratio"], 0.35)

    def test_shoulder_roi_emits_shoulder_stop(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id="camera-1",
            model_name="test-model",
            model_version="test-version",
            rois=self._roi_payload("SHOULDER", roi_id="shoulder-1"),
        )

        event = self._emit_stop_event(analyzer)

        self.assertEqual(event["incident_type"], "SHOULDER_STOP")
        self.assertEqual(event["roi_type"], "SHOULDER")
        self.assertEqual(event["roi_id"], "shoulder-1")
        self.assertGreaterEqual(event["roi_overlap_ratio"], 0.35)

    def test_median_roi_excludes_stop_event(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id="camera-1",
            model_name="test-model",
            model_version="test-version",
            rois=self._roi_payload("MEDIAN", roi_id="median-1"),
        )

        events = self._run_stop_sequence(analyzer)
        result = analyzer.build_result()
        last_log = result["detection_logs"][-1]

        self.assertEqual(events, [])
        self.assertEqual(result["incident_candidates"], [])
        self.assertEqual(last_log["roi_type"], "MEDIAN")
        self.assertTrue(last_log["roi_excluded"])

    def test_ignore_zone_roi_excludes_stop_event(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id="camera-1",
            model_name="test-model",
            model_version="test-version",
            rois=self._roi_payload("IGNORE_ZONE", roi_id="ignore-1"),
        )

        events = self._run_stop_sequence(analyzer)
        result = analyzer.build_result()
        last_log = result["detection_logs"][-1]

        self.assertEqual(events, [])
        self.assertEqual(result["incident_candidates"], [])
        self.assertEqual(last_log["roi_type"], "IGNORE_ZONE")
        self.assertTrue(last_log["roi_excluded"])

    def test_unsupported_roi_type_emits_review_stopped_vehicle(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id="camera-1",
            model_name="test-model",
            model_version="test-version",
            rois=self._roi_payload(
                "UNSUPPORTED_ZONE",
                roi_id="unsupported-1",
            ),
        )

        event = self._emit_stop_event(analyzer)
        result = analyzer.build_result()
        last_log = result["detection_logs"][-1]

        self.assertEqual(event["incident_type"], "STOPPED_VEHICLE")
        self.assertEqual(event["box_color"], "red")
        self.assertTrue(event["review_required"])
        self.assertEqual(last_log["roi_type"], "UNCERTAIN_ROI_BOUNDARY")
        self.assertFalse(last_log["roi_excluded"])
        self.assertTrue(last_log["review_required"])
        self.assertEqual(result["incident_candidates"], [event])

    def test_boundary_overlap_below_threshold_emits_review_stopped_vehicle(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id="camera-1",
            model_name="test-model",
            model_version="test-version",
            rois=self._roi_payload(
                "DRIVING_LANE",
                points=BOUNDARY_POINTS,
                roi_id="lane-boundary",
            ),
        )

        event = self._emit_stop_event(analyzer)
        result = analyzer.build_result()
        last_log = result["detection_logs"][-1]

        self.assertEqual(event["incident_type"], "STOPPED_VEHICLE")
        self.assertEqual(event["box_color"], "red")
        self.assertTrue(event["review_required"])
        self.assertEqual(last_log["roi_type"], "UNCERTAIN_ROI_BOUNDARY")
        self.assertLess(last_log["roi_overlap_ratio"], 0.35)
        self.assertFalse(last_log["roi_excluded"])
        self.assertTrue(last_log["review_required"])
        self.assertEqual(result["incident_candidates"], [event])

    def test_default_median_roi_excludes_stop_event(self) -> None:
        analyzer = ReportStopAnalyzer(
            camera_id=None,
            model_name="test-model",
            model_version="test-version",
        )

        with patch(
            "app.roi_config.get_default_rois",
            return_value=self._full_frame_roi("MEDIAN"),
        ):
            events = self._run_stop_sequence(analyzer)

        result = analyzer.build_result()
        last_log = result["detection_logs"][-1]

        self.assertEqual(events, [])
        self.assertEqual(result["incident_candidates"], [])
        self.assertEqual(last_log["roi_type"], "MEDIAN")
        self.assertTrue(last_log["roi_excluded"])


if __name__ == "__main__":
    unittest.main()
