"""Fire / smoke detector — HSV color-band classifier with contour grouping.

Real deployment swaps the HSV path for a CNN classifier head; the HSV
heuristic stays as the fallback so we always emit *some* signal.
"""

from __future__ import annotations

import logging

import cv2
import numpy as np

from .base import Anomaly, BaseDetector, BBox, Detection, DetectorContext

logger = logging.getLogger(__name__)

HF_MODEL_URL = (
    "https://huggingface.co/prithivMLmods/Fire-Detection-Siglip2/resolve/main/model.safetensors"
)

# Saturated red→deep-orange flame band. Hue is intentionally tight so that
# safety-vest orange (H≈16) and hard-hat yellow (H≈25) don't false-trigger.
FIRE_HSV = ((0, 14), (200, 255), (200, 255))
# Smoke = low-saturation gray plumes; tolerate a wider value band.
SMOKE_HSV = ((0, 180), (0, 40), (120, 220))


class FireSmokeDetector(BaseDetector):
    name = "fire"
    facility_types = ("hospital", "hotel", "school", "college", "factory")

    def detect(
        self, frame: np.ndarray, ctx: DetectorContext
    ) -> tuple[list[Detection], Anomaly | None]:
        hsv = cv2.cvtColor(frame, cv2.COLOR_RGB2HSV)
        fire_mask = self._in_hsv(hsv, FIRE_HSV)
        smoke_mask = self._in_hsv(hsv, SMOKE_HSV)

        detections: list[Detection] = []
        for kind, mask, conf, min_area in (
            ("fire", fire_mask, 0.82, 300),
            ("smoke", smoke_mask, 0.70, 1200),
        ):
            for x, y, w, h in self._contours(mask, min_area=min_area):
                detections.append(
                    Detection(
                        detector=self.name,
                        label=kind,
                        confidence=conf,
                        bbox=BBox(x, y, w, h),
                        metadata={"area_px": int(w * h)},
                    )
                )

        if not detections:
            return [], None

        has_fire = any(d.label == "fire" for d in detections)
        has_smoke = any(d.label == "smoke" for d in detections)
        severity = "critical" if has_fire else "high"
        incident_type = "fire" if has_fire else "smoke"
        kinds = []
        if has_fire:
            kinds.append("visible flames")
        if has_smoke:
            kinds.append("smoke plume")
        description = (
            f"{' and '.join(kinds)} detected in {ctx.zone} (floor {ctx.floor})."
        )
        anomaly = Anomaly(
            detector="fire" if has_fire else "smoke",
            severity=severity,
            incident_type=incident_type,
            description=description,
            detections=detections,
        )
        return detections, anomaly

    @staticmethod
    def _in_hsv(
        hsv: np.ndarray,
        bounds: tuple[tuple[int, int], tuple[int, int], tuple[int, int]],
    ) -> np.ndarray:
        (hlo, hhi), (slo, shi), (vlo, vhi) = bounds
        return cv2.inRange(
            hsv, np.array([hlo, slo, vlo]), np.array([hhi, shi, vhi])
        )

    @staticmethod
    def _contours(mask: np.ndarray, *, min_area: int) -> list[tuple[int, int, int, int]]:
        if not mask.any():
            return []
        contours, _ = cv2.findContours(
            mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        out: list[tuple[int, int, int, int]] = []
        for c in contours:
            x, y, w, h = cv2.boundingRect(c)
            if w * h >= min_area:
                out.append((int(x), int(y), int(w), int(h)))
        return out
