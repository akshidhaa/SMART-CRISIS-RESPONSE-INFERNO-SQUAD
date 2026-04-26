"""Facility-aware detector plugin registry.

Each detector is a self-contained plugin that knows which facility types it
supports and how to convert a frame into Detection + Anomaly objects. The
pipeline (`pipeline.py`) routes camera-enabled detector names through this
REGISTRY.
"""

from .base import Anomaly, BaseDetector, BBox, Detection, DetectorContext
from .chemical_spill import ChemicalSpillDetector
from .crowd_surge import CrowdSurgeDetector
from .fire_smoke import FireSmokeDetector
from .intruder import IntruderAfterHoursDetector
from .ppe import PPEDetector
from .weapon import WeaponDetector

# Names map to FacilityType.enabledDetectors values from shared/types.
# `crowd` and `smoke` are aliases of broader detectors so the FacilityType
# enum and per-camera arrays stay readable.
REGISTRY: dict[str, type[BaseDetector]] = {
    "weapon": WeaponDetector,
    "fire": FireSmokeDetector,
    "smoke": FireSmokeDetector,
    "crowd_surge": CrowdSurgeDetector,
    "crowd": CrowdSurgeDetector,
    "ppe_violation": PPEDetector,
    "chemical_spill_visual": ChemicalSpillDetector,
    "intruder_after_hours": IntruderAfterHoursDetector,
}

__all__ = [
    "Anomaly",
    "BaseDetector",
    "BBox",
    "Detection",
    "DetectorContext",
    "REGISTRY",
]
