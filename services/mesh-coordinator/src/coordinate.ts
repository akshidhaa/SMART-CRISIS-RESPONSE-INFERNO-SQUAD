// mesh-coordinator core logic — pure-ish, testable.
//
// Flow (Phase 3.1):
//   1. Resolve source facility + incident (from input or Firestore).
//   2. Look up the matching playbook's `meshEvents` array.
//   3. Merge with `incident.aiSummary.meshEventRecommendations` from Gemini.
//   4. For each rule, query candidate facilities of the right types,
//      filter by haversine distance ≤ radiusKm, drop the source facility,
//      respect mesh subscriptions when present.
//   5. Apply per-source rate limit (max 10 outbound events / hour).
//   6. Batch-write meshEvents docs.

import { PLAYBOOKS, type PlaybookMeshEvent } from '@scr-mesh/playbooks';
import type {
  Facility,
  FacilityType,
  Incident,
  IncidentSeverity,
  MeshEvent,
} from '@scr-mesh/types';

import { distanceKm } from './geo.js';
import {
  type FirestoreLike,
  normalizeGeoPoint,
} from './firestore.js';
import type { CoordinateInput, CoordinateOutput } from './schemas.js';

const RATE_LIMIT_PER_HOUR = 10;
const HOUR_MS = 60 * 60 * 1000;

export interface CoordinateDeps {
  fs: FirestoreLike;
  /** Override Date.now() for tests. */
  now?: () => number;
  /** Logger sink — defaults to console. */
  log?: (msg: string, ctx?: Record<string, unknown>) => void;
}

const SEVERITIES_THAT_FAN_OUT: IncidentSeverity[] = ['high', 'critical'];

export async function coordinate(
  input: CoordinateInput,
  deps: CoordinateDeps,
): Promise<CoordinateOutput> {
  const { fs } = deps;
  const log = deps.log ?? ((m, c) => console.log(`[mesh-coordinator] ${m}`, c ?? {}));
  const now = deps.now ?? Date.now;

  // 1. Resolve incident + source facility.
  const incident =
    input.incident ??
    ((await fs.getDoc<Incident>('incidents', input.incidentId)) as Incident | null);

  if (!incident) {
    log('incident not found', { incidentId: input.incidentId });
    return { meshEventIds: [], skipped: [{ eventType: '*', reason: 'incident-missing' }] };
  }

  if (!SEVERITIES_THAT_FAN_OUT.includes(incident.severity)) {
    return { meshEventIds: [], skipped: [{ eventType: '*', reason: `severity-${incident.severity}` }] };
  }

  const sourceFacility = await fs.getDoc<Facility>('facilities', incident.facilityId);
  if (!sourceFacility) {
    log('source facility missing', { facilityId: incident.facilityId });
    return { meshEventIds: [], skipped: [{ eventType: '*', reason: 'facility-missing' }] };
  }
  const sourceLoc = normalizeGeoPoint(sourceFacility.location);
  if (!sourceLoc) {
    return { meshEventIds: [], skipped: [{ eventType: '*', reason: 'facility-no-location' }] };
  }

  // 2. Playbook lookup.
  const playbookKey = `${incident.facilityType}:${incident.type}`;
  const playbook = PLAYBOOKS[playbookKey];
  const baseRules: PlaybookMeshEvent[] = playbook?.meshEvents ?? [];

  // 3. Merge Gemini recommendations — promote strings to default-shape rules.
  //    Defaults are conservative: 3 km radius, 60 min ttl, all other facility types.
  const allRules: PlaybookMeshEvent[] = [...baseRules];
  const recommendedTypes = new Set(
    (input.incident?.meshEventRecommendations ?? []).map((s) => s.toUpperCase()),
  );
  for (const ruleType of recommendedTypes) {
    if (allRules.some((r) => r.eventType === ruleType)) continue;
    const otherTypes = allFacilityTypesExcept(incident.facilityType);
    allRules.push({
      eventType: ruleType,
      targetFacilityTypes: otherTypes,
      radiusKm: 3,
      ttlMinutes: 60,
    });
  }

  if (allRules.length === 0) {
    return { meshEventIds: [], skipped: [{ eventType: '*', reason: 'no-rules' }] };
  }

  // 4. Rate limit.
  const recentCount = await fs.countRecentMeshEvents(incident.facilityId, now() - HOUR_MS);
  if (recentCount >= RATE_LIMIT_PER_HOUR) {
    log('rate limit hit', { facilityId: incident.facilityId, recentCount });
    return {
      meshEventIds: [],
      skipped: allRules.map((r) => ({ eventType: r.eventType, reason: 'rate-limited' })),
    };
  }

  const remainingBudget = RATE_LIMIT_PER_HOUR - recentCount;

  // 5. For each rule, find target facilities.
  const docs: MeshEvent[] = [];
  const skipped: { eventType: string; reason: string }[] = [];

  for (const rule of allRules.slice(0, remainingBudget)) {
    const candidates = await fs.listFacilitiesByType(rule.targetFacilityTypes);
    const within = candidates.filter(({ id, data }) => {
      if (id === incident.facilityId) return false;
      const loc = normalizeGeoPoint(data.location);
      if (!loc) return false;
      return distanceKm(sourceLoc, loc) <= rule.radiusKm;
    });

    // Mesh subscription gate — if any subscription docs exist for the facility,
    // require this eventType to be in their accepted list. If no subs exist,
    // accept by default (greenfield demo facilities don't need to opt in).
    const accepted: string[] = [];
    for (const cand of within) {
      const subs = await fs.listSubscriptionsForFacility(cand.id);
      if (subs.length === 0) {
        accepted.push(cand.id);
        continue;
      }
      const ok = subs.some(
        (s) => s.eventTypes.includes(rule.eventType) && rule.radiusKm <= s.radiusKm,
      );
      if (ok) accepted.push(cand.id);
    }

    if (accepted.length === 0) {
      skipped.push({ eventType: rule.eventType, reason: 'no-targets-in-radius' });
      continue;
    }

    docs.push({
      sourceFacilityId: incident.facilityId,
      sourceFacilityType: incident.facilityType,
      sourceIncidentId: input.incidentId,
      eventType: rule.eventType,
      payload: {
        incidentType: incident.type,
        severity: incident.severity,
        sourceFacilityName: sourceFacility.name,
        ...(rule.payloadHints ?? {}),
      },
      targetFacilityTypes: rule.targetFacilityTypes,
      radiusKm: rule.radiusKm,
      affectedFacilityIds: accepted,
      status: 'published',
      publishedAt: fs.serverTimestamp(),
      expiresAt: fs.futureTimestamp(rule.ttlMinutes * 60 * 1000),
    });
  }

  if (docs.length === 0) {
    return { meshEventIds: [], skipped };
  }

  const ids = await fs.writeMeshEvents(docs);
  log('mesh events published', {
    incidentId: input.incidentId,
    count: ids.length,
    ids,
  });
  return { meshEventIds: ids, skipped };
}

function allFacilityTypesExcept(t: FacilityType): FacilityType[] {
  return (['hospital', 'hotel', 'school', 'college', 'factory'] as FacilityType[]).filter(
    (x) => x !== t,
  );
}
