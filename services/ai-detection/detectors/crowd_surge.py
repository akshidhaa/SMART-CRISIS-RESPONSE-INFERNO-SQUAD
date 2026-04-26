"""Crowd-surge detector — person density per zone above a configurable threshold."""

from __future__ import annotations

import logging

import numpy as np

from .base import Anomaly, BaseDetector, BBox, Detection, DetectorContext
from . import yolo_base

logger = logging.getLogger(__name__)


class CrowdSurgeDetector(BaseDetector):
    name = "crowd_surge"
    facility_types = ("hospital", "hotel", "school", "college")
    threshold: int = 6  # persons per camera frame considered a surge

    def detect(
        self, frame: np.ndarray, ctx: DetectorContext
    ) -> tuple[list[Detection], Anomaly | None]:
        persons = yolo_base.detect_persons(frame)
        if len(persons) < self.threshold:
            return [], None

        detections = [
            Detection(
                detector=self.name,
                label="person",
                confidence=p["confidence"],
                bbox=BBox(**p["bbox"]),
                metadata={"source": "crowd_surge"},
            )
            for p in persons
        ]

        anomaly = Anomaly(
            detector=self.name,
            severity="high",
            incident_type="crowd_surge",
            description=(
                f"Crowd density in {ctx.zone} reached {len(persons)} persons "
                f"(threshold {self.threshold})."
            ),
            detections=detections,
        )
        return detections, anomaly
