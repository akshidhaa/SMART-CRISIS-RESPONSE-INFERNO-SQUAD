// Shared types for the live mesh visualization page.

import type { Facility, FacilityId, MeshEvent, Incident } from '@scr-mesh/types';

export interface FacilityNode {
  id: FacilityId;
  data: Facility;
  /** Resolved lat/lng from facility.location (handles {lat,lng} or {latitude,longitude}). */
  position: { lat: number; lng: number } | null;
}

export interface MeshEventRow extends MeshEvent {
  id: string;
  publishedAtMs: number;
}

export interface IncidentRow extends Incident {
  id: string;
  createdAtMs: number;
}

export interface ActiveArc {
  /** Stable id so React doesn't restart the animation. */
  key: string;
  meshEventId: string;
  eventType: string;
  source: { lat: number; lng: number };
  target: { lat: number; lng: number };
  targetFacilityId: FacilityId;
  /** Tailwind hex color for the stroke. */
  color: string;
}
