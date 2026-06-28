import unittest

import numpy as np

from app.config import (
    YOLO_REPORT_FOREGROUND_BOTTOM_RATIO,
    YOLO_REPORT_FOREGROUND_TOP_RATIO,
)
from app.detector import Detection, YoloDetector


class FakeTensor:
    def __init__(self, values):
        self.values = values

    def cpu(self):
        return self

    def tolist(self):
        return self.values


class FakeBoxes:
    def __init__(self, boxes, classes, confidences):
        self.xyxy = FakeTensor(boxes)
        self.cls = FakeTensor(classes)
        self.conf = FakeTensor(confidences)
        self.id = None

    def __len__(self):
        return len(self.xyxy.values)


class FakeResult:
    def __init__(self, boxes, classes, confidences, names):
        self.boxes = FakeBoxes(boxes, classes, confidences)
        self.names = names


class FakeModel:
    def __init__(self):
        self.source_heights = []

    def predict(self, *, source, **kwargs):
        height = int(source.shape[0])
        self.source_heights.append(height)

        # 전체 프레임 결과:
        # - 전경 crop 결과와 겹치는 낮은 confidence 차량
        # - 겹치지 않는 정상 차량
        if height == 640:
            return [
                FakeResult(
                    boxes=[
                        [110.0, 300.0, 224.0, 424.0],
                        [250.0, 180.0, 320.0, 240.0],
                    ],
                    classes=[2.0, 2.0],
                    confidences=[0.51, 0.80],
                    names={
                        2: "car",
                        7: "truck",
                    },
                )
            ]

        # 전경 crop 결과:
        # local y=125~245 + crop_top=179
        # => 원본 y=304~424
        return [
            FakeResult(
                boxes=[
                    [112.0, 125.0, 223.0, 245.0],
                ],
                classes=[7.0],
                confidences=[0.71],
                names={
                    2: "car",
                    7: "truck",
                },
            )
        ]


class YoloDetectorForegroundCropTests(unittest.TestCase):
    def make_detector(self):
        detector = YoloDetector(
            model_paths=["unused.pt"],
            target_classes={"car", "bus", "truck"},
            enable_far_crop=False,
        )
        detector._model = FakeModel()
        return detector

    def test_foreground_crop_bounds_use_normalized_frame_ratios(self):
        crop_top, crop_bottom = YoloDetector._report_foreground_crop_bounds(
            640
        )

        self.assertEqual(
            crop_top,
            int(640 * YOLO_REPORT_FOREGROUND_TOP_RATIO),
        )
        self.assertEqual(
            crop_bottom,
            int(640 * YOLO_REPORT_FOREGROUND_BOTTOM_RATIO),
        )

    def test_foreground_crop_restores_original_y_coordinate_and_deduplicates(self):
        detector = self.make_detector()
        frame = np.zeros((640, 360, 3), dtype=np.uint8)

        detections = detector.detect(
            frame,
            report_foreground_crop=True,
        )

        self.assertEqual(
            detector._model.source_heights,
            [640, 301],
        )
        self.assertEqual(len(detections), 2)

        foreground = next(
            detection
            for detection in detections
            if detection.source == "report_foreground_crop"
        )

        self.assertEqual(
            foreground,
            Detection(
                bbox=[112.0, 304.0, 223.0, 424.0],
                class_id=7,
                class_name="truck",
                confidence=0.71,
                source="report_foreground_crop",
            ),
        )

        self.assertFalse(
            any(
                detection.bbox == [110.0, 300.0, 224.0, 424.0]
                for detection in detections
            )
        )

    def test_foreground_crop_disabled_keeps_existing_single_pass_behavior(self):
        detector = self.make_detector()
        frame = np.zeros((640, 360, 3), dtype=np.uint8)

        detections = detector.detect(
            frame,
            report_foreground_crop=False,
        )

        self.assertEqual(
            detector._model.source_heights,
            [640],
        )
        self.assertEqual(len(detections), 2)
        self.assertTrue(
            all(
                detection.source == "full_frame"
                for detection in detections
            )
        )


if __name__ == "__main__":
    unittest.main()
