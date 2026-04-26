"""Chemical spill detector — color segmentation on the floor plane.

Restricts the search to the lower half of the frame (ground plane) and
requires saturated cyan / hazardous-green / yellow patches above a minimum
relative-area threshold. Morphological closing fuses split contours from
puddle reflections.
"""

from __future__ import annotations

import logging

import cv2
import numpy as np

from .base import Anomaly, BaseDetector, BBox, Detection, DetectorContext

logger = logging.getLogger(__name__)

# (Hue, Saturation, Value) ranges for OpenCV HSV (H is 0-179).
SPILL_HSV_RANGES: list[tuple[tuple[int, int], tuple[int, int], tuple[int, int]]] = [
    # Cyan / industrial blue
    ((85, 130), (80, 255), (50, 255)),
    # Hazard green (require high sat to ignore foliage)
    ((35, 85), (150, 255), (50, 255)),
    # Hazard yellow
    ((20, 35), (150, 255), (150, 255)),
]


class ChemicalSpillDetector(BaseDetector):
    name = "chemical_spill_visual"
    facility_types = ("factory",)

    def detect(
        self, frame: np.ndarray, ctx: DetectorContext
    ) -> tuple[list[Detection], Anomaly | None]:
        h_img, w_img = frame.shape[:2]
        ground = frame[h_img // 2 :, :, :]
        hsv = cv2.cvtColor(ground, cv2.COLOR_RGB2HSV)

        combined = np.zeros(hsv.shape[:2], dtype=np.uint8)
        for (hlo, hhi), (slo, shi), (vlo, vhi) in SPILL_HSV_RANGES:
            combined |= cv2.inRange(
                hsv, np.array([hlo, slo, vlo]), np.array([hhi, shi, vhi])
            )

        kernel = np.ones((5, 5), np.uint8)
        combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(
            combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        # Require a pool to cover at least 0.5% of the frame.
        min_area = max(2000, (h_img * w_img) // 200)

        detections: list[Detection] = []
        for c in contours:
            area = cv2.contourArea(c)
            if area < min_area:
                continue
            x, y, w, h = cv2.boundingRect(c)
            detections.append(
                Detection(
                    detector=self.name,
                    label="liquid_pool",
                    confidence=0.68,
                    bbox=BBox(int(x), int(y + h_img // 2), int(w), int(h)),
                    metadata={"area_px": int(area)},
                )
            )

        if not detections:
            return [], None

        total_px = sum(d.metadata.get("area_px", 0) for d in detections)
        anomaly = Anomaly(
            detector=self.name,
            severity="critical",
            incident_type="chemical_spill",
            description=(
                f"Large liquid pool (~{total_px} px²) detected on floor in "
                f"{ctx.zone}, floor {ctx.floor}."
            ),
            detections=detections,
        )
        return detections, anomaly
