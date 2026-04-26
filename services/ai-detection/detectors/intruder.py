"""After-hours intruder detector — fires only outside the camera's schedule."""

from __future__ import annotations

import logging

import numpy as np

from .base import Anomaly, BaseDetector, BBox, Detection, DetectorContext
from . import yolo_base

logger = logging.getLogger(__name__)


class IntruderAfterHoursDetector(BaseDetector):
    name = "intruder_after_hours"
    facility_types = ("hospital", "hotel", "school", "college", "factory")

    def detect(
        self, frame: np.ndarray, ctx: DetectorContext
    ) -> tuple[list[Detection], Anomaly | None]:
        hour = ctx.timestamp.hour
        start, end = ctx.schedule_hours
        # Support both day windows (7-21) and overnight windows (22-6)
        if start < end:
            on_hours = start <= hour < end
        else:
            on_hours = hour >= start or hour < end
        if on_hours:
            return [], None

        persons = yolo_base.detect_persons(frame)
        if not persons:
            return [], None

        detections = [
            Detection(
                detector=self.name,
                label="person",
                confidence=p["confidence"],
                bbox=BBox(**p["bbox"]),
                metadata={"hourDetected": hour},
            )
            for p in persons
        ]

        anomaly = Anomaly(
            detector=self.name,
            severity="high",
            incident_type="intruder",
            description=(
                f"After-hours person(s) detected in {ctx.zone} at "
                f"{ctx.timestamp.isoformat()} ({len(persons)} person(s))."
            ),
            detections=detections,
        )
        return detections, anomaly
