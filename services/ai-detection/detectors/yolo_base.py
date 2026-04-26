"""Shared YOLOv8 base — person/object backbone with a heuristic fallback.

Loads `yolov8n.pt` lazily on first call. If ultralytics or the weights are
unavailable (no GPU runtime, offline dev, missing HF cache), falls back to a
deterministic color-marker heuristic so the demo and synthetic fixtures still
produce results.
"""

from __future__ import annotations

import logging
from typing import Any

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Sentinel marker used by demo-asset frames to encode "person".
# Magenta is uncommon enough in real scenes to avoid false positives there
# while staying visually obvious in synthetic fixtures.
PERSON_MARKER_RGB = ((200, 255), (0, 80), (200, 255))

_model: Any | None = None
_unavailable: bool = False


def _load_model() -> Any | None:
    """Load yolov8n.pt once. Set the unavailable flag on any failure."""
    global _model, _unavailable
    if _model is not None or _unavailable:
        return _model
    try:
        from ultralytics import YOLO  # type: ignore

        _model = YOLO("yolov8n.pt")
        logger.info("Loaded yolov8n.pt for base person/object detection")
    except Exception as e:  # pragma: no cover — depends on runtime
        logger.warning(
            "Ultralytics unavailable (%s) — using heuristic person backbone.", e
        )
        _unavailable = True
    return _model


def detect_persons(frame: np.ndarray) -> list[dict[str, Any]]:
    """Return a list of person detections.

    Each detection is a plain dict so detectors that wrap them can decide
    on the final Detection / Anomaly shape.
    """
    model = _load_model()
    if model is not None:
        try:
            # class 0 = person in COCO
            results = model.predict(frame, classes=[0], verbose=False)
            out: list[dict[str, Any]] = []
            for r in results:
                if not hasattr(r, "boxes") or r.boxes is None:
                    continue
                for box in r.boxes:
                    x1, y1, x2, y2 = (int(v) for v in box.xyxy[0].tolist())
                    out.append(
                        {
                            "label": "person",
                            "confidence": float(box.conf[0]),
                            "bbox": {
                                "x": x1,
                                "y": y1,
                                "w": x2 - x1,
                                "h": y2 - y1,
                            },
                        }
                    )
            if out:
                return out
        except Exception as e:  # pragma: no cover
            logger.warning("YOLO predict failed (%s) — falling back to heuristic.", e)

    return detect_color_marker(
        frame, PERSON_MARKER_RGB, label="person", confidence=0.85
    )


def detect_color_marker(
    frame: np.ndarray,
    rgb_bounds: tuple[tuple[int, int], tuple[int, int], tuple[int, int]],
    *,
    label: str,
    confidence: float,
    min_area: int = 25,
) -> list[dict[str, Any]]:
    """Find connected regions matching `rgb_bounds` in `frame`."""
    if frame.ndim != 3 or frame.shape[2] < 3:
        return []
    (rlo, rhi), (glo, ghi), (blo, bhi) = rgb_bounds
    mask = (
        (frame[..., 0] >= rlo)
        & (frame[..., 0] <= rhi)
        & (frame[..., 1] >= glo)
        & (frame[..., 1] <= ghi)
        & (frame[..., 2] >= blo)
        & (frame[..., 2] <= bhi)
    ).astype(np.uint8) * 255
    if not mask.any():
        return []
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    detections: list[dict[str, Any]] = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w * h < min_area:
            continue
        detections.append(
            {
                "label": label,
                "confidence": confidence,
                "bbox": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
            }
        )
    return detections
