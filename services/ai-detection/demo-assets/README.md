# demo-assets

`demo.py` generates 640×480 PNG fixtures into this directory on first
run — one per facility-type scenario:

| File                            | Facility | Scenario                                    |
|---------------------------------|----------|---------------------------------------------|
| `hospital_intruder.png`         | hospital | After-hours person near main entrance       |
| `hotel_robbery.png`             | hotel    | Person + visible weapon in lobby            |
| `school_weapon.png`             | school   | Two students, one carrying a weapon         |
| `college_protest_surge.png`     | college  | Crowd density above the surge threshold     |
| `factory_ppe_missing.png`       | factory  | Three workers — only one fully PPE-compliant |
| `factory_chemical_spill.png`    | factory  | Cyan + green liquid pools on the floor      |

## Color markers

The synthetic fixtures use a deterministic color palette so the heuristic
fallback in each detector produces stable detections. Real videos override
this when they're dropped into the directory.

| Marker        | RGB             | Encoded meaning                       |
|---------------|------------------|----------------------------------------|
| Magenta       | `(255, 0, 255)`  | Person silhouette                      |
| Red           | `(255, 0, 0)`    | Weapon                                 |
| Yellow        | `(255, 210, 0)`  | Hard hat (helmet)                      |
| Orange        | `(255, 140, 0)`  | High-vis safety vest                   |
| Bright orange | `(255, 110, 0)`  | Visible flames                         |
| Mid-gray      | `(170, 170, 170)`| Smoke plume                            |
| Cyan          | `(0, 180, 220)`  | Industrial liquid spill (chem storage) |
| Hazard green  | `(30, 200, 80)`  | Hazardous green spill                  |

## Replacing with real footage

To exercise the pipeline against real video:

1. Drop `<scenario>.mp4` into this directory.
2. Update `SCENARIOS[*]['file']` in `../demo.py` to point at a sampled
   keyframe (e.g. via `ffmpeg -i input.mp4 -vframes 1 frame.png`).
3. The detectors automatically prefer real YOLO weights when available
   and fall back to the color heuristics only if loading fails.
