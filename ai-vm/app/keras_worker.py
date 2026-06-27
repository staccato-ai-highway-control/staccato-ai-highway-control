from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    import keras
    import keras_cv

    model = keras.saving.load_model(
        args.model,
        compile=False,
    )

    image = np.load(args.input).astype("float32")
    result = model.predict(
        np.expand_dims(image, axis=0),
        verbose=0,
    )

    count = int(np.asarray(result["num_detections"])[0])

    boxes = np.asarray(result["boxes"])[0][:count]
    confidence = np.asarray(result["confidence"])[0][:count]
    classes = np.asarray(result["classes"])[0][:count]

    detections = []

    for bbox, score, class_id in zip(boxes, confidence, classes):
        detections.append(
            {
                "bbox": [float(value) for value in bbox.tolist()],
                "confidence": float(score),
                "class_id": int(class_id),
            }
        )

    Path(args.output).write_text(
        json.dumps({"detections": detections}),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
