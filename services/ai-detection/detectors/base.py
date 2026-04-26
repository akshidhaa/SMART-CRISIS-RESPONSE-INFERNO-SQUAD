"""Shared types for the detector plugin contract."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

import numpy as np


@dataclass(frozen=True)
class BBox:
    x: int
    y: int
    w: int
    h: int

    def asdict(self) -> dict[str, int]:
        return asdict(self)


@dataclass
class Detection:
    detector: str
    label: str
    confidence: float
    bbox: BBox | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def asdict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "detector": self.detector,
            "label": self.label,
            "confidence": round(float(self.confidence), 3),
            "metadata": self.metadata,
        }
        if self.bbox is not None:
            out["bbox"] = self.bbox.asdict()
        return out


@dataclass
class Anomaly:
    detector: str
    severity: str  # 'low' | 'medium' | 'high' | 'critical'
    incident_type: str  # matches Firestore Incident.type
    description: str
    detections: list[Detection] = field(default_factory=list)

    def asdict(self) -> dict[str, Any]:
        return {
            "detector": self.detector,
            "severity": self.severity,
            "incidentType": self.incident_type,
            "description": self.description,
            "detections": [d.asdict() for d in self.detections],
        }


@dataclass
class DetectorContext:
    """Per-frame context passed to every detector."""

    camera_id: str
    facility_id: str
    facility_type: str
    zone: str
    floor: str
    timestamp: datetime
    # Operating hours window for the camera; outside this window the
    # intruder_after_hours detector becomes active.
    schedule_hours: tuple[int, int] = (7, 21)


class BaseDetector(ABC):
    """Detector plugin contract — one class per detection capability."""

    name: str = ""
    facility_types: tuple[str, ...] = ()

    @abstractmethod
    def detect(
        self,
        frame: np.ndarray,
        ctx: DetectorContext,
    ) -> tuple[list[Detection], Anomaly | None]:
        ...
