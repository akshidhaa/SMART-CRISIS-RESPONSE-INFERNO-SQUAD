"""FastAPI entrypoint — multi-facility AI detection service."""

from __future__ import annotations

import io
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import numpy as np
from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from PIL import Image

from config import DEFAULT_FACILITY_DETECTORS
from detectors import DetectorContext
from firestore_client import FirestoreClient
from pipeline import DetectionPipeline


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("ai-detection")

app = FastAPI(title="scr-mesh ai-detection", version="0.1.0")
pipeline = DetectionPipeline()
firestore = FirestoreClient()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-detection"}


@app.post("/detect")
async def detect(
    cameraId: str = Form(...),
    image: UploadFile = File(...),
    # Optional overrides — useful when Firestore isn't reachable (local dev)
    facilityType: str | None = Form(None),
    facilityId: str | None = Form(None),
    zone: str | None = Form(None),
    floor: str | None = Form(None),
    enabledDetectors: str | None = Form(None),  # comma-separated
) -> dict[str, Any]:
    raw = await image.read()
    try:
        pil = Image.open(io.BytesIO(raw)).convert("RGB")
        frame = np.array(pil, dtype=np.uint8)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}") from e

    camera = firestore.get_camera(cameraId)
    if camera is None:
        if not facilityType:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Camera {cameraId} not found in Firestore and no "
                    "facilityType override was provided."
                ),
            )
        camera = {
            "facilityId": facilityId or f"unknown-{facilityType}",
            "zone": zone or "unknown",
            "floor": floor or "1",
            "enabledDetectors": (
                [d.strip() for d in enabledDetectors.split(",") if d.strip()]
                if enabledDetectors
                else DEFAULT_FACILITY_DETECTORS.get(facilityType, [])
            ),
        }
    elif enabledDetectors:
        camera["enabledDetectors"] = [
            d.strip() for d in enabledDetectors.split(",") if d.strip()
        ]

    fac_id = camera.get("facilityId") or facilityId or ""
    fac_type = (
        facilityType
        or _resolve_facility_type(fac_id)
        or "hospital"
    )

    enabled = [
        d.strip()
        for d in camera.get("enabledDetectors", [])
        if d and str(d).strip()
    ]
    if not enabled:
        enabled = DEFAULT_FACILITY_DETECTORS.get(fac_type, [])

    ctx = DetectorContext(
        camera_id=cameraId,
        facility_id=fac_id,
        facility_type=fac_type,
        zone=str(camera.get("zone", zone or "unknown")),
        floor=str(camera.get("floor", floor or "1")),
        timestamp=datetime.now(timezone.utc),
    )

    result = pipeline.run(frame, ctx, enabled)

    incidents_created: list[str] = []
    for anomaly in result["anomalies"]:
        if anomaly["severity"] != "critical":
            continue
        incident_id = firestore.create_incident(
            {
                "facilityId": ctx.facility_id,
                "facilityType": ctx.facility_type,
                "type": anomaly["incidentType"],
                "severity": "critical",
                "status": "reported",
                "reporterId": "ai-detection-service",
                "reporterRole": "admin",
                "location": {"zone": ctx.zone, "floor": ctx.floor},
                "description": anomaly["description"],
                "assignedStaff": [],
                "meshEventsFired": [],
                "aiDetected": True,
                "cameraId": cameraId,
            }
        )
        if incident_id:
            incidents_created.append(incident_id)
            logger.info(
                "Auto-created incident %s from %s anomaly",
                incident_id,
                anomaly["detector"],
            )

    return {
        **result,
        "cameraId": cameraId,
        "facilityType": ctx.facility_type,
        "facilityId": ctx.facility_id,
        "zone": ctx.zone,
        "floor": ctx.floor,
        "enabledDetectors": enabled,
        "incidentsCreated": incidents_created,
    }


def _resolve_facility_type(facility_id: str) -> str | None:
    if not facility_id:
        return None
    facility = firestore.get_facility(facility_id)
    if facility is None:
        return None
    t = facility.get("type")
    return str(t) if isinstance(t, str) else None


@app.websocket("/detect-stream")
async def detect_stream(websocket: WebSocket) -> None:
    """Stub websocket — accepts JSON control messages and echoes a stub payload.

    A future iteration will:
      1. Authenticate via query token.
      2. Decode each binary frame and run the pipeline.
      3. Stream JSON detections back as they're produced.
    """
    await websocket.accept()
    try:
        while True:
            msg = await websocket.receive_text()
            try:
                payload = json.loads(msg)
            except json.JSONDecodeError:
                payload = {"raw": msg}
            await websocket.send_json(
                {
                    "type": "detection_stub",
                    "received": payload,
                    "note": (
                        "/detect-stream is a stub — full live streaming arrives in "
                        "Phase 3.x once the mesh-coordinator is wired up."
                    ),
                }
            )
    except WebSocketDisconnect:
        return
