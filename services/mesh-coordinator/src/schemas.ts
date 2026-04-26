// Input/output schemas for the mesh-coordinator.

import type {
  FacilityType,
  IncidentSeverity,
  GeoPoint,
} from '@scr-mesh/types';

export interface CoordinateInput {
  incidentId: string;
  /** Optional override — if absent, the coordinator looks up the incident in
   *  Firestore. Useful for tests. */
  incident?: {
    facilityId: string;
    facilityType: FacilityType;
    type: string;
    severity: IncidentSeverity;
    aiSummary?: string;
    /** Mesh event types Gemini wants us to emit, even if not in the
     *  playbook. Coordinator merges and de-duplicates. */
    meshEventRecommendations?: string[];
  };
}

export interface CoordinateOutput {
  meshEventIds: string[];
  /** Reasons the coordinator chose to skip — one per playbook rule. */
  skipped: { eventType: string; reason: string }[];
}
