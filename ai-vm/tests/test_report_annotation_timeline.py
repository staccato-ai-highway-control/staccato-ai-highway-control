from __future__ import annotations

import unittest

from app.report_annotation_timeline import (
    active_report_analysis_detections,
)


class ReportAnnotationTimelineTest(unittest.TestCase):
    @staticmethod
    def _green_vehicle(frame_index: int) -> dict:
        return {
            "frame_index": frame_index,
            "track_id": 101,
            "display_label": "CAR 0.95",
            "box_color": "green",
        }

    @staticmethod
    def _red_stopped_vehicle(frame_index: int) -> dict:
        return {
            "frame_index": frame_index,
            "track_id": 101,
            "display_label": "SHOULDER_STOP 2.0s",
            "box_color": "red",
            "persistent_annotation": True,
        }

    def test_confirmed_shoulder_stop_stays_red_between_samples(self) -> None:
        green_at_30 = self._green_vehicle(30)
        red_at_30 = self._red_stopped_vehicle(30)

        green_at_60 = self._green_vehicle(60)
        red_at_60 = self._red_stopped_vehicle(60)

        # 90프레임에는 차량이 다시 움직였다고 가정합니다.
        # 따라서 일반 초록 탐지만 있고 새 빨간 annotation은 없습니다.
        green_at_90 = self._green_vehicle(90)

        detections_by_frame = {
            30: [green_at_30, red_at_30],
            60: [green_at_60, red_at_60],
            90: [green_at_90],
        }

        active_at_30 = active_report_analysis_detections(
            detections_by_frame,
            30,
            hold_frames=3,
            persistent_annotation_hold_frames=29,
        )
        self.assertEqual(active_at_30, [green_at_30, red_at_30])
        self.assertEqual(
            active_at_30[-1]["box_color"],
            "red",
            "같은 차량의 초록 박스 위에 빨간 정차 박스가 마지막에 그려져야 합니다.",
        )

        active_at_34 = active_report_analysis_detections(
            detections_by_frame,
            34,
            hold_frames=3,
            persistent_annotation_hold_frames=29,
        )
        self.assertEqual(
            active_at_34,
            [red_at_30],
            "일반 초록 박스가 사라진 뒤에도 갓길 정차 차량은 빨간 박스를 유지해야 합니다.",
        )

        active_at_59 = active_report_analysis_detections(
            detections_by_frame,
            59,
            hold_frames=3,
            persistent_annotation_hold_frames=29,
        )
        self.assertEqual(
            active_at_59,
            [red_at_30],
            "다음 분석 샘플 직전까지 빨간 정차 박스가 계속 유지되어야 합니다.",
        )

        active_at_60 = active_report_analysis_detections(
            detections_by_frame,
            60,
            hold_frames=3,
            persistent_annotation_hold_frames=29,
        )
        self.assertEqual(active_at_60, [green_at_60, red_at_60])
        self.assertEqual(
            active_at_60[-1]["box_color"],
            "red",
            "정차가 계속되면 최신 분석 프레임에서도 빨간 박스로 갱신되어야 합니다.",
        )

        active_at_89 = active_report_analysis_detections(
            detections_by_frame,
            89,
            hold_frames=3,
            persistent_annotation_hold_frames=29,
        )
        self.assertEqual(
            active_at_89,
            [red_at_60],
            "두 번째 분석 구간에서도 빨간 정차 박스가 끊기면 안 됩니다.",
        )

        active_at_90 = active_report_analysis_detections(
            detections_by_frame,
            90,
            hold_frames=3,
            persistent_annotation_hold_frames=29,
        )
        self.assertEqual(
            active_at_90,
            [green_at_90],
            "차량이 다시 움직인 분석 프레임부터는 빨간 정차 박스가 없어져야 합니다.",
        )


if __name__ == "__main__":
    unittest.main()
