"""Thin Firestore REST client — camera/facility lookup + incident creation.

Uses google-auth's Application Default Credentials to mint short-lived
access tokens. We deliberately avoid `firebase-admin` here so the Python
service stays small (no gRPC, no protobuf) and matches Phase 2.2's "Firestore
REST" requirement.

If credentials are missing (local dev without ADC) every call degrades to a
no-op so `/detect` still returns a useful response.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import requests

from config import FIRESTORE_BASE

logger = logging.getLogger(__name__)


class FirestoreClient:
    def __init__(self) -> None:
        self._creds: Any | None = None
        self._authed: bool = False
        try:
            import google.auth  # type: ignore

            self._creds, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/datastore"]
            )
            self._authed = True
        except Exception as e:
            logger.warning(
                "Firestore credentials unavailable (%s) — REST calls will be skipped.",
                e,
            )

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------

    def get_camera(self, camera_id: str) -> dict[str, Any] | None:
        return self._get_doc(f"cameras/{camera_id}")

    def get_facility(self, facility_id: str) -> dict[str, Any] | None:
        return self._get_doc(f"facilities/{facility_id}")

    def create_incident(self, payload: dict[str, Any]) -> str | None:
        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        body = {"fields": _to_firestore({**payload, "createdAt": now_iso})}
        resp = self._post("incidents", body)
        if resp is None:
            return None
        name: str = resp.get("name", "")
        return name.split("/")[-1] if name else None

    # ------------------------------------------------------------------
    # internals
    # ------------------------------------------------------------------

    def _get_doc(self, rel_path: str) -> dict[str, Any] | None:
        raw = self._get(rel_path)
        if raw is None:
            return None
        return _from_firestore(raw.get("fields", {}))

    def _headers(self) -> dict[str, str] | None:
        if not self._authed or self._creds is None:
            return None
        try:
            from google.auth.transport.requests import Request  # type: ignore

            self._creds.refresh(Request())
            return {
                "Authorization": f"Bearer {self._creds.token}",
                "Content-Type": "application/json",
            }
        except Exception as e:
            logger.warning("Failed to refresh Firestore credentials: %s", e)
            return None

    def _get(self, rel_path: str) -> dict[str, Any] | None:
        headers = self._headers()
        if headers is None:
            return None
        url = f"{FIRESTORE_BASE}/{rel_path}"
        try:
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.warning("Firestore GET %s failed: %s", rel_path, e)
            return None

    def _post(self, collection: str, body: dict[str, Any]) -> dict[str, Any] | None:
        headers = self._headers()
        if headers is None:
            return None
        url = f"{FIRESTORE_BASE}/{collection}"
        try:
            r = requests.post(url, json=body, headers=headers, timeout=5)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.warning("Firestore POST %s failed: %s", collection, e)
            return None


# ---------------------------------------------------------------------------
# Firestore JSON encoding
# https://cloud.google.com/firestore/docs/reference/rest/v1/Value
# ---------------------------------------------------------------------------


def _to_firestore(value: dict[str, Any]) -> dict[str, Any]:
    return {k: _encode(v) for k, v in value.items()}


def _encode(v: Any) -> dict[str, Any]:
    if v is None:
        return {"nullValue": None}
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, int):
        return {"integerValue": str(v)}
    if isinstance(v, float):
        return {"doubleValue": v}
    if isinstance(v, str):
        return (
            {"timestampValue": v}
            if _is_iso_timestamp(v)
            else {"stringValue": v}
        )
    if isinstance(v, (list, tuple)):
        return {"arrayValue": {"values": [_encode(item) for item in v]}}
    if isinstance(v, dict):
        return {"mapValue": {"fields": {k: _encode(val) for k, val in v.items()}}}
    return {"stringValue": str(v)}


def _is_iso_timestamp(s: str) -> bool:
    if len(s) < 20 or "T" not in s:
        return False
    try:
        datetime.fromisoformat(s.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def _from_firestore(fields: dict[str, Any]) -> dict[str, Any]:
    return {k: _decode(v) for k, v in fields.items()}


def _decode(wrapped: dict[str, Any]) -> Any:
    if "stringValue" in wrapped:
        return wrapped["stringValue"]
    if "integerValue" in wrapped:
        return int(wrapped["integerValue"])
    if "doubleValue" in wrapped:
        return float(wrapped["doubleValue"])
    if "booleanValue" in wrapped:
        return wrapped["booleanValue"]
    if "nullValue" in wrapped:
        return None
    if "timestampValue" in wrapped:
        return wrapped["timestampValue"]
    if "arrayValue" in wrapped:
        return [_decode(v) for v in wrapped["arrayValue"].get("values", [])]
    if "mapValue" in wrapped:
        return _from_firestore(wrapped["mapValue"].get("fields", {}))
    if "geoPointValue" in wrapped:
        gp = wrapped["geoPointValue"]
        return {"latitude": gp.get("latitude"), "longitude": gp.get("longitude")}
    return None
