# ai-detection

Python 3.11 + FastAPI service for YOLOv8-based visual anomaly detection
across every SCR-Mesh facility type — hospital, hotel, school, college,
factory.

Each camera's `enabledDetectors` field drives which detectors run per
frame, so a school camera scans for weapons and crowd surges while a
factory camera scans for PPE violations and chemical spills. Critical
anomalies auto-create incidents in Firestore via REST, where the Phase 2.1
**gemini-orchestrator** picks them up.

---

## Architecture

```
Frame (JPEG/PNG)
    │
    ▼
POST /detect ──► Firestore camera lookup ──► pipeline.run()
                          │                           │
                          ▼                           ▼
                  enabledDetectors            run facility-applicable
                                              detector plugins
                                                      │
                                                      ▼
                                           { detections, anomalies }
                                                      │
                                  (if critical) ──────┼─► POST /incidents
                                                      │      (Firestore REST)
                                                      ▼
                                            HTTP 200 JSON response
```

## Endpoints

| Method | Path             | Purpose                                         |
|--------|------------------|-------------------------------------------------|
| GET    | `/health`        | Cloud Run liveness probe                        |
| POST   | `/detect`        | Multipart image + `cameraId` → detection result |
| WS     | `/detect-stream` | Websocket stub (full streaming arrives later)   |

### `POST /detect`

Multipart form fields:

- `cameraId` *(required)* — looked up against Firestore `cameras/{id}`.
- `image`    *(required)* — JPEG/PNG binary.
- Overrides (used when Firestore is unreachable, e.g. local dev):
  - `facilityType` — `hospital | hotel | school | college | factory`
  - `facilityId`
  - `zone`, `floor`
  - `enabledDetectors` — comma-separated detector names

Response shape:

```json
{
  "cameraId": "cam_lincoln_hallwayB",
  "facilityId": "lincoln_high",
  "facilityType": "school",
  "zone": "Hallway B",
  "floor": "2",
  "enabledDetectors": ["weapon", "crowd_surge"],
  "detections": [
    {
      "detector": "weapon",
      "label": "weapon",
      "confidence": 0.78,
      "bbox": {"x": 95, "y": 260, "w": 45, "h": 22},
      "metadata": {"source": "heuristic"}
    }
  ],
  "anomalies": [
    {
      "detector": "weapon",
      "severity": "critical",
      "incidentType": "weapon_sighting",
      "description": "Weapon visually detected …",
      "detections": [...]
    }
  ],
  "incidentsCreated": ["IxByGd…"]
}
```

## Detectors

| Detector                | Facilities                    | Severity         | Fallback heuristic                            |
|-------------------------|-------------------------------|------------------|-----------------------------------------------|
| `weapon`                | hospital/hotel/school/college | critical         | red marker patches                            |
| `fire` / `smoke`        | all                           | critical / high  | HSV bands on orange flames + gray plumes      |
| `crowd_surge`           | hospital/hotel/school/college | high             | person count ≥ 6                              |
| `ppe_violation`         | factory                       | medium           | missing helmet/vest patches on a person bbox  |
| `chemical_spill_visual` | factory                       | critical         | saturated cyan/green/yellow pool, lower frame |
| `intruder_after_hours`  | all                           | high             | person detection outside `schedule_hours`     |

Detectors live as plugins under [`detectors/`](./detectors/) — adding a
new one means dropping a file and registering it in
[`detectors/__init__.py`](./detectors/__init__.py).

### HuggingFace model placeholders

Each specialized detector documents its weights URL. Replace the
ultralytics constructor call with `huggingface_hub.hf_hub_download(...)`
once the weights are published.

| Detector        | URL                                                                                              |
|-----------------|--------------------------------------------------------------------------------------------------|
| Base (person)   | `https://huggingface.co/Ultralytics/YOLOv8/resolve/main/yolov8n.pt`                              |
| Weapon          | `https://huggingface.co/Ultralytics/YOLOv8-weapons/resolve/main/yolov8-weapons.pt`               |
| PPE / hard hat  | `https://huggingface.co/keremberke/yolov8n-hard-hat-detection/resolve/main/best.pt`              |
| Fire classifier | `https://huggingface.co/prithivMLmods/Fire-Detection-Siglip2/resolve/main/model.safetensors`     |

If a specialized model is unavailable, each detector falls back to a
deterministic heuristic so `/detect` never hard-fails.

### Downloading real weights

```bash
pip install huggingface_hub ultralytics
python scripts/download_models.py --dest ./models
```

The script caches weights into `./models/` using
`huggingface_hub.hf_hub_download`. Any failed download is logged and the
corresponding detector stays on the heuristic path.

### Seeding cameras

`/detect` looks up `cameras/{cameraId}` in Firestore to resolve
`enabledDetectors`. Two cameras per facility are seeded by
[`apps/web-admin/seed.ts`](../../apps/web-admin/seed.ts) — run it once
after the initial Firestore bootstrap:

```bash
cd apps/web-admin && npx tsx seed.ts YOUR_PASSWORD
```

Seeded camera IDs follow the pattern `{facility_id}_cam_{NN}` (e.g.
`lincoln_high_cam_01`).

## Local dev

```bash
cd services/ai-detection
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Standalone demo — generates synthetic frames + runs all 5 facility types
python demo.py

# Start the service (uses ADC for Firestore writes)
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

### Smoke test

```bash
curl -F cameraId=demo \
     -F facilityType=school \
     -F facilityId=lincoln_high \
     -F zone="Hallway B" -F floor=2 \
     -F enabledDetectors="weapon,crowd_surge" \
     -F image=@demo-assets/school_weapon.png \
     http://localhost:8080/detect
```

## Demo artifact

`python demo.py` writes the timeline to `demo-output.txt`. See
[`./demo-assets/README.md`](./demo-assets/README.md) for fixture details.

## Cloud Run deployment (reference)

```bash
gcloud run deploy ai-detection \
  --source services/ai-detection \
  --project scr-mesh-dev \
  --region us-central1 \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --no-allow-unauthenticated
```

## Environment

- `FIREBASE_PROJECT_ID` — defaults to `scr-mesh-dev`
- `LOG_LEVEL` — defaults to `INFO`
- `GOOGLE_APPLICATION_CREDENTIALS` — service account JSON for Firestore REST

If ADC is missing, Firestore reads/writes silently no-op so the service
still handles `/detect` requests (useful for local demos).
