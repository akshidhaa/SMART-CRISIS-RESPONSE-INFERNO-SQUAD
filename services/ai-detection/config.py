"""Service configuration — facility→detector routing and external endpoints."""

from __future__ import annotations

import os

GCP_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "scr-mesh-dev")

FIRESTORE_BASE = (
    f"https://firestore.googleapis.com/v1/projects/{GCP_PROJECT_ID}"
    "/databases/(default)/documents"
)

# Default detectors per facility type. Used when a camera record can't be
# resolved in Firestore and the caller didn't pass an `enabledDetectors`
# override on the request.
DEFAULT_FACILITY_DETECTORS: dict[str, list[str]] = {
    "hospital": ["weapon", "fire", "crowd_surge", "intruder_after_hours"],
    "hotel": ["weapon", "fire", "crowd_surge", "intruder_after_hours"],
    "school": ["weapon", "fire", "crowd_surge", "intruder_after_hours"],
    "college": ["weapon", "fire", "crowd_surge", "intruder_after_hours"],
    "factory": [
        "fire",
        "ppe_violation",
        "chemical_spill_visual",
        "intruder_after_hours",
    ],
}

# HuggingFace placeholder URLs — wired here so README and individual
# detectors stay in sync. Swap to `huggingface_hub.hf_hub_download(...)`
# once weights are published.
HF_MODEL_URLS: dict[str, str] = {
    "base": "https://huggingface.co/Ultralytics/YOLOv8/resolve/main/yolov8n.pt",
    "weapon": (
        "https://huggingface.co/Ultralytics/YOLOv8-weapons/resolve/main/yolov8-weapons.pt"
    ),
    "ppe": (
        "https://huggingface.co/keremberke/yolov8n-hard-hat-detection/resolve/main/best.pt"
    ),
    "fire": (
        "https://huggingface.co/prithivMLmods/Fire-Detection-Siglip2/resolve/main/model.safetensors"
    ),
}
