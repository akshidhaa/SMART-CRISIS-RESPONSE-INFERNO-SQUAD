"""Phase 2.2 demo runner — exercises every facility-type scenario in-process.

Generates six synthetic frames (one per scenario), runs each through the
detection pipeline, prints a single timeline to stdout and writes the same
output to ``demo-output.txt`` as the Phase 2.2 artifact.

Usage:
    python demo.py [--output demo-output.txt]
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from detectors import DetectorContext  # noqa: E402
from pipeline import DetectionPipeline  # noqa: E402


ASSETS_DIR = HERE / "demo-assets"

# ---------------------------------------------------------------------------
# Scenario fixtures — each scenario defines:
#   - facility metadata
#   - the camera's `enabledDetectors` array
#   - the synthetic-frame draw list (kind, (x, y, w, h))
# ---------------------------------------------------------------------------

COLORS: dict[str, tuple[int, int, int]] = {
    "person": (255, 0, 255),       # magenta
    "weapon": (255, 0, 0),         # red
    "helmet": (255, 210, 0),       # yellow
    "vest": (255, 140, 0),         # orange
    "fire": (255, 110, 0),         # saturated orange
    "smoke": (170, 170, 170),      # mid-gray
    "spill_cyan": (0, 180, 220),
    "spill_green": (30, 200, 80),
}

SCENARIOS: list[dict[str, Any]] = [
    {
        "name": "hospital_intruder",
        "file": "hospital_intruder.png",
        "facilityType": "hospital",
        "facilityId": "facility_001",
        "zone": "Main Entrance",
        "floor": "1",
        "enabledDetectors": ["intruder_after_hours", "weapon"],
        # 02:15 UTC → outside the default 07:00–21:00 window
        "timestamp": datetime(2026, 4, 19, 2, 15, tzinfo=timezone.utc),
        "draw": [("person", (80, 220, 60, 180))],
    },
    {
        "name": "hotel_robbery",
        "file": "hotel_robbery.png",
        "facilityType": "hotel",
        "facilityId": "grand_horizon",
        "zone": "Lobby",
        "floor": "G",
        "enabledDetectors": ["weapon", "intruder_after_hours"],
        "timestamp": datetime(2026, 4, 19, 23, 45, tzinfo=timezone.utc),
        "draw": [
            ("person", (100, 200, 55, 180)),
            ("weapon", (165, 260, 40, 22)),
        ],
    },
    {
        "name": "school_weapon",
        "file": "school_weapon.png",
        "facilityType": "school",
        "facilityId": "lincoln_high",
        "zone": "Hallway B",
        "floor": "2",
        "enabledDetectors": ["weapon", "crowd_surge"],
        "timestamp": datetime(2026, 4, 19, 10, 30, tzinfo=timezone.utc),
        "draw": [
            ("person", (40, 200, 55, 180)),
            ("person", (180, 210, 55, 170)),
            ("weapon", (95, 260, 45, 22)),
        ],
    },
    {
        "name": "college_protest_surge",
        "file": "college_protest_surge.png",
        "facilityType": "college",
        "facilityId": "state_university",
        "zone": "Quad",
        "floor": "Outdoor",
        "enabledDetectors": ["crowd_surge", "intruder_after_hours"],
        "timestamp": datetime(2026, 4, 19, 14, 0, tzinfo=timezone.utc),
        "draw": [("person", (40 + i * 75, 220, 55, 170)) for i in range(8)],
    },
    {
        "name": "factory_ppe_missing",
        "file": "factory_ppe_missing.png",
        "facilityType": "factory",
        "facilityId": "apex_manufacturing",
        "zone": "Assembly Line 3",
        "floor": "1",
        "enabledDetectors": ["ppe_violation", "fire"],
        "timestamp": datetime(2026, 4, 19, 11, 0, tzinfo=timezone.utc),
        # Helmet/vest patches are narrower than the person silhouette so the
        # magenta stays connected via 10px side strips — otherwise the
        # heuristic person-detector would split each worker into multiple
        # contours.
        "draw": [
            # Worker A — bare-headed, no vest
            ("person", (80, 180, 60, 220)),
            # Worker B — has helmet, no vest
            ("person", (260, 180, 60, 220)),
            ("helmet", (270, 180, 40, 30)),
            # Worker C — fully compliant (helmet + vest)
            ("person", (440, 180, 60, 220)),
            ("helmet", (450, 180, 40, 30)),
            ("vest", (450, 260, 40, 100)),
        ],
    },
    {
        "name": "factory_chemical_spill",
        "file": "factory_chemical_spill.png",
        "facilityType": "factory",
        "facilityId": "apex_manufacturing",
        "zone": "Chem Storage",
        "floor": "1",
        "enabledDetectors": ["chemical_spill_visual", "ppe_violation"],
        "timestamp": datetime(2026, 4, 19, 8, 30, tzinfo=timezone.utc),
        "draw": [
            ("spill_cyan", (120, 340, 280, 110)),
            ("spill_green", (420, 370, 120, 80)),
        ],
    },
]


# ---------------------------------------------------------------------------
# Frame generation
# ---------------------------------------------------------------------------


def _make_frame(scenario: dict[str, Any]) -> Image.Image:
    img = Image.new("RGB", (640, 480), (58, 68, 82))   # dim indoor wall
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 320, 640, 480], fill=(90, 84, 72))  # floor plane
    for kind, (x, y, w, h) in scenario["draw"]:
        draw.rectangle([x, y, x + w, y + h], fill=COLORS[kind])
    return img


def _ensure_assets() -> None:
    ASSETS_DIR.mkdir(exist_ok=True)
    for sc in SCENARIOS:
        target = ASSETS_DIR / sc["file"]
        if not target.exists():
            _make_frame(sc).save(target, format="PNG")


# ---------------------------------------------------------------------------
# Pipeline orchestration
# ---------------------------------------------------------------------------


def run() -> list[dict[str, Any]]:
    _ensure_assets()
    pipeline = DetectionPipeline()
    out: list[dict[str, Any]] = []
    for sc in SCENARIOS:
        img = Image.open(ASSETS_DIR / sc["file"]).convert("RGB")
        frame = np.array(img, dtype=np.uint8)
        ctx = DetectorContext(
            camera_id=f"demo_{sc['name']}",
            facility_id=sc["facilityId"],
            facility_type=sc["facilityType"],
            zone=sc["zone"],
            floor=sc["floor"],
            timestamp=sc["timestamp"],
        )
        result = pipeline.run(frame, ctx, sc["enabledDetectors"])
        out.append({"scenario": sc["name"], "ctx": ctx, "output": result})
    return out


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------


def _format_timeline(results: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    bar = "=" * 78
    lines.append(bar)
    lines.append("SCR-Mesh | services/ai-detection | Phase 2.2 demo timeline")
    lines.append(bar)

    for r in results:
        ctx: DetectorContext = r["ctx"]
        out = r["output"]
        lines.append("")
        lines.append(
            f">> {r['scenario']}  [{ctx.facility_type} @ {ctx.zone}, floor {ctx.floor}]"
        )
        lines.append(f"  camera     : {ctx.camera_id}")
        lines.append(f"  timestamp  : {ctx.timestamp.isoformat()}")
        lines.append(f"  detections : {len(out['detections'])}")
        if out["detections"]:
            grouped: dict[str, list[str]] = {}
            for d in out["detections"]:
                grouped.setdefault(d["detector"], []).append(
                    f"{d['label']}({d['confidence']:.2f})"
                )
            for det_name, items in grouped.items():
                lines.append(f"    - {det_name:<24} {', '.join(items)}")
        if out["anomalies"]:
            lines.append(f"  anomalies  : {len(out['anomalies'])}")
            for a in out["anomalies"]:
                lines.append(
                    f"    ! [{a['severity'].upper():<8}] {a['detector']} -> "
                    f"{a['incidentType']}"
                )
                lines.append(f"      {a['description']}")
        else:
            lines.append("  anomalies  : none")

    lines.append("")
    lines.append(bar)
    lines.append(
        f"{len(results)} scenarios run · "
        f"{sum(len(r['output']['anomalies']) for r in results)} anomalies fired"
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Phase 2.2 ai-detection demo")
    parser.add_argument(
        "--output",
        default=str(HERE / "demo-output.txt"),
        help="Where to write the timeline artifact",
    )
    args = parser.parse_args()

    results = run()
    report = _format_timeline(results)
    # Write the artifact first so a console encoding error never loses it.
    Path(args.output).write_text(report + "\n", encoding="utf-8")
    try:
        print(report)
    except UnicodeEncodeError:
        sys.stdout.buffer.write(report.encode("utf-8", errors="replace"))
        sys.stdout.buffer.write(b"\n")
    print(f"\n(Artifact written to {args.output})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
