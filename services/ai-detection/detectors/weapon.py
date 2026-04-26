"""Weapon detector — specialized YOLO weights with a heuristic fallback."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

from .base import Anomaly, BaseDetector, BBox, Detection, DetectorContext
from . import yolo_base

logger = logging.getLogger(__name__)

# Replace with `from huggingface_hub import hf_hub_download` once the
# specialized weapons model is published; until then the heuristic path runs.
HF_MODEL_URL = (
    "https://huggingface.co/Ultralytics/YOLOv8-weapons/resolve/main/yolov8-weapons.pt"
)

# Synthetic-frame marker — saturated red rectangles encode "weapon".
WEAPON_MARKER_RGB = ((200, 255), (0, 60), (0, 60))


class WeaponDetector(BaseDetector):
    name = "weapon"
    facility_types = ("hospital", "hotel", "school", "college")

    def __init__(self) -> None:
        self._model: Any | None = None
        self._unavailable = False

    def _load(self) -> Any | None:
        if self._model is not None or self._unavailable:
            return self._model
        try:
            from ultralytics import YOLO  # type: ignore

            self._model = YOLO("yolov8-weapons.pt")
            logger.info("WeaponDetector: loaded specialized weapons model")
        except Exception as e:
            logger.info(
                "WeaponDetector: specialized weights unavailable (%s) — heuristic only.",
                e,
            )
            self._unavailable = True
        return self._model

    def detect(
        self, frame: np.ndarray, ctx: DetectorContext
    ) -> tuple[list[Detection], Anomaly | None]:
        detections: list[Detection] = []

        model = self._load()
        if model is not None:
            try:
                results = model.predict(frame, verbose=False)
                for r in results:
                    names = getattr(r, "names", {})
                    for box in r.boxes:
                        x1, y1, x2, y2 = (int(v) for v in box.xyxy[0].tolist())
                        cls = int(box.cls[0])
                        label = names.get(cls, f"weapon_class_{cls}")
                        detections.append(
                            Detection(
                                detector=self.name,
                                label=label,
                                confidence=float(box.conf[0]),
                                bbox=BBox(x1, y1, x2 - x1, y2 - y1),
                                metadata={"model": "yolov8-weapons"},
                            )
                        )
            except Exception as e:  # pragma: no cover
                logger.warning("WeaponDetector inference failed: %s", e)

        # Heuristic augment / fallback (always runs — cheap, deterministic)
        for h in yolo_base.detect_color_marker(
            frame, WEAPON_MARKER_RGB, label="weapon", confidence=0.78, min_area=200
        ):
            detections.append(
                Detection(
                    detector=self.name,
                    label=h["label"],
                    confidence=h["confidence"],
                    bbox=BBox(**h["bbox"]),
                    metadata={"source": "heuristic"},
                )
            )

        if not detections:
            return [], None

        anomaly = Anomaly(
            detector=self.name,
            severity="critical",
            incident_type="weapon_sighting",
            description=(
                f"Weapon visually detected in {ctx.zone} (floor {ctx.floor}) — "
                f"{len(detections)} candidate(s) at {ctx.facility_type} facility."
            ),
            detections=detections,
        )
        return detections, anomaly
