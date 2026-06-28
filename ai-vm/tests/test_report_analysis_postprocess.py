from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from app.report_analysis_postprocess import (
    postprocess_report_analysis_detections,
)


class ReportAnalysisPostprocessTest(unittest.TestCase):
    def test_candidate_vehicle_stays_green_until_stop_is_confirmed(self) -> None:
        detection = {
            "bbox": [800.0, 650.0, 1100.0, 950.0],
            "class_id": 2,
            "class_name": "car",
            "confidence": 0.95,
            "frame_index": 0,
        }

        with patch.dict(
            os.environ,
            {
                "REPORT_ANALYSIS_POSTPROCESS_ENABLED": "true",
                "REPORT_ANALYSIS_POSTPROCESS_DISPLAY_MODE": "filtered",
                "REPORT_ANALYSIS_POSTPROCESS_MIN_CONFIDENCE": "0.50",
                "REPORT_ANALYSIS_POSTPROCESS_CANDIDATE_MIN_CONFIDENCE": "0.55",
                "REPORT_ANALYSIS_POSTPROCESS_CANDIDATE_MIN_CENTER_Y_RATIO": "0.45",
                "REPORT_ANALYSIS_POSTPROCESS_CANDIDATE_MIN_AREA_RATIO": "0.0015",
            },
            clear=False,
        ):
            result = postprocess_report_analysis_detections(
                detections=[detection],
                frame_width=1920,
                frame_height=1080,
                camera_id=None,
                source_type="video",
            )

        self.assertEqual(len(result["display_detections"]), 1)
        displayed = result["display_detections"][0]

        self.assertEqual(displayed["box_color"], "green")
        self.assertNotIn("risk_level", displayed)
        self.assertNotIn("incident_type", displayed)

        self.assertEqual(len(result["incident_candidates"]), 1)
        candidate = result["incident_candidates"][0]

        self.assertEqual(
            candidate["candidate_type"],
            "STOPPED_VEHICLE_CANDIDATE",
        )
        self.assertEqual(candidate["box_color"], "green")
        self.assertNotIn("risk_level", candidate)
        self.assertNotIn("incident_type", candidate)


if __name__ == "__main__":
    unittest.main()
