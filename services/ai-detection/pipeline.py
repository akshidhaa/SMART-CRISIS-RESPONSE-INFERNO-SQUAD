"""Detection pipeline — runs the camera-enabled detectors over a single frame."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

from detectors import BaseDetector, DetectorContext, REGISTRY

logger = logging.getLogger(__name__)


class DetectionPipeline:
    """Stateful pipeline — instantiates each detector class once and reuses it.

    Multiple registry keys can map to the same detector class (e.g. `fire` and
    `smoke` both → FireSmokeDetector); we de-dupe per-class so the pipeline
    runs each underlying detector at most once per frame.
    """

    def __init__(self) -> None:
        self._instances: dict[str, BaseDetector] = {}

    def _get(self, name: str) -> BaseDetector | None:
        cls = REGISTRY.get(name)
        if cls is None:
            return None
        inst = self._instances.get(cls.__name__)
        if inst is None:
            inst = cls()
            self._instances[cls.__name__] = inst
        return inst

    def run(
        self,
        frame: np.ndarray,
        ctx: DetectorContext,
        enabled: list[str],
    ) -> dict[str, Any]:
        detections: list[dict[str, Any]] = []
        anomalies: list[dict[str, Any]] = []
        seen: set[str] = set()

        for name in enabled:
            detector = self._get(name)
            if detector is None:
                logger.info("Skipping unknown detector '%s'", name)
                continue
            cls_name = type(detector).__name__
            if cls_name in seen:
                continue
            seen.add(cls_name)

            if detector.facility_types and ctx.facility_type not in detector.facility_types:
                logger.info(
                    "Detector %s not applicable to %s — skipping",
                    cls_name,
                    ctx.facility_type,
                )
                continue

            try:
                det, anomaly = detector.detect(frame, ctx)
                for d in det:
                    detections.append(d.asdict())
                if anomaly is not None:
                    anomalies.append(anomaly.asdict())
            except Exception as e:  # pragma: no cover
                logger.exception("Detector %s crashed: %s", cls_name, e)

        return {"detections": detections, "anomalies": anomalies}
