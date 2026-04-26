"""PPE compliance detector — checks each detected person for required gear.

Real deployment uses a hat/vest YOLO head; the heuristic checks for color
patches in the head/torso regions of each person bbox so synthetic frames
can express compliant vs. non-compliant workers deterministically.
"""

from __future__ import annotations

import logging

import numpy as np

from .base import Anomaly, BaseDetector, BBox, Detection, DetectorContext
from . import yolo_base

logger = logging.getLogger(__name__)

HF_MODEL_URL = (
    "https://huggingface.co/keremberke/yolov8n-hard-hat-detection/resolve/main/best.pt"
)

# Yellow patch in the *top quarter* of a person bbox = helmet present.
HELMET_MARKER_RGB = ((220, 255), (180, 230), (0, 60))
# Orange patch in the *middle half* of a person bbox = high-vis vest present.
VEST_MARKER_RGB = ((220, 255), (120, 170), (0, 60))

MIN_MARKER_PIXELS = 30


class PPEDetector(BaseDetector):
    name = "ppe_violation"
    facility_types = ("factory",)

    def detect(
        self, frame: np.ndarray, ctx: DetectorContext
    ) -> tuple[list[Detection], Anomaly | None]:
        persons = yolo_base.detect_persons(frame)
        if not persons:
            return [], None

        detections: list[Detection] = []
        missing_totals: dict[str, int] = {}

        for p in persons:
            bb = p["bbox"]
            x, y, w, h = bb["x"], bb["y"], bb["w"], bb["h"]
            head = frame[y : y + max(1, h // 4), x : x + w]
            torso = frame[y + h // 4 : y + (3 * h) // 4, x : x + w]

            has_helmet = _region_has_color(head, HELMET_MARKER_RGB)
            has_vest = _region_has_color(torso, VEST_MARKER_RGB)

            missing: list[str] = []
            if not has_helmet:
                missing.append("helmet")
            if not has_vest:
                missing.append("vest")

            if missing:
                for g in missing:
                    missing_totals[g] = missing_totals.get(g, 0) + 1
                detections.append(
                    Detection(
                        detector=self.name,
                        label="missing_" + "_".join(missing),
                        confidence=0.74,
                        bbox=BBox(x, y, w, h),
                        metadata={"missingGear": missing},
                    )
                )

        if not detections:
            return [], None

        breakdown = ", ".join(
            f"{n} missing {gear}" for gear, n in missing_totals.items()
        )
        anomaly = Anomaly(
            detector=self.name,
            severity="medium",
            incident_type="ppe_violation",
            description=(
                f"{len(detections)} worker(s) in {ctx.zone} not fully PPE-compliant — "
                f"{breakdown}."
            ),
            detections=detections,
        )
        return detections, anomaly


def _region_has_color(
    region: np.ndarray,
    bounds: tuple[tuple[int, int], tuple[int, int], tuple[int, int]],
) -> bool:
    if region.size == 0:
        return False
    (rlo, rhi), (glo, ghi), (blo, bhi) = bounds
    mask = (
        (region[..., 0] >= rlo)
        & (region[..., 0] <= rhi)
        & (region[..., 1] >= glo)
        & (region[..., 1] <= ghi)
        & (region[..., 2] >= blo)
        & (region[..., 2] <= bhi)
    )
    return int(mask.sum()) >= MIN_MARKER_PIXELS
