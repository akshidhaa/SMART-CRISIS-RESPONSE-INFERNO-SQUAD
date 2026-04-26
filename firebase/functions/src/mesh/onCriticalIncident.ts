// onCriticalIncident — Firestore trigger that locally invokes the
// mesh-coordinator algorithm whenever an incident with severity in
// {high, critical} is created. In production this work is done by the
// Cloud Run mesh-coordinator service via Pub/Sub; here we run the same
// algorithm in-process so the local emulator demonstrates the chain
// end-to-end without Pub/Sub.

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { PLAYBOOKS, type PlaybookMeshEvent } from '@scr-mesh/playbooks';
import type {
  Facility,
  FacilityType,
  GeoPoint,
  Incident,
  MeshEvent,
  MeshSubscription,
} from '@scr-mesh/types';

const RATE_LIMIT_PER_HOUR = 10;
const HOUR_MS = 60 * 60 * 1000;
const EARTH_RADIUS_KM = 6371;
const ALL_TYPES: FacilityType[] = ['hospital', 'hotel', 'school', 'college', 'factory'];

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function normalizeGeoPoint(loc: unknown): GeoPoint | null {
  if (!loc || typeof loc !== 'object') return null;
  const a = loc as Record<string, unknown>;
  if (typeof a.latitude === 'number' && typeof a.longitude === 'number') {
    return { latitude: a.latitude, longitude: a.longitude };
  }
  if (typeof a.lat === 'number' && typeof a.lng === 'number') {
    return { latitude: a.lat as number, longitude: a.lng as number };
  }
  return null;
}

export const onCriticalIncident = onDocumentCreated(
  'incidents/{incidentId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const incident = snap.data() as Incident;
    const incidentId = event.params.incidentId;

    if (incident.severity !== 'high' && incident.severity !== 'critical') return;

    const db = admin.firestore();

    // 1. Source facility
    const facSnap = await db.collection('facilities').doc(incident.facilityId).get();
    if (!facSnap.exists) {
      console.warn(`[mesh] facility missing: ${incident.facilityId}`);
      return;
    }
    const sourceFacility = facSnap.data() as Facility;
    const sourceLoc = normalizeGeoPoint(sourceFacility.location);
    if (!sourceLoc) {
      console.warn(`[mesh] facility ${incident.facilityId} has no location`);
      return;
    }

    // 2. Playbook lookup + 3. Gemini merge (aiSummary may carry recommendations)
    const playbookKey = `${incident.facilityType}:${incident.type}`;
    const playbook = PLAYBOOKS[playbookKey];
    const baseRules: PlaybookMeshEvent[] = playbook?.meshEvents ?? [];
    const aiRecs = extractAiRecommendations(incident.aiSummary);
    const allRules: PlaybookMeshEvent[] = [...baseRules];
    for (const ruleType of aiRecs) {
      if (allRules.some((r) => r.eventType === ruleType)) continue;
      allRules.push({
        eventType: ruleType,
        targetFacilityTypes: ALL_TYPES.filter((t) => t !== incident.facilityType),
        radiusKm: 3,
        ttlMinutes: 60,
      });
    }
    if (allRules.length === 0) {
      console.log(`[mesh] no rules for ${playbookKey}`);
      return;
    }

    // 4. Rate limit
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - HOUR_MS);
    const recentSnap = await db
      .collection('meshEvents')
      .where('sourceFacilityId', '==', incident.facilityId)
      .where('publishedAt', '>=', cutoff)
      .get();
    const remainingBudget = RATE_LIMIT_PER_HOUR - recentSnap.size;
    if (remainingBudget <= 0) {
      console.warn(`[mesh] rate limit hit for ${incident.facilityId}`);
      return;
    }

    // 5. Resolve targets per rule
    const writeDocs: MeshEvent[] = [];
    for (const rule of allRules.slice(0, remainingBudget)) {
      const targetTypes = rule.targetFacilityTypes.slice(0, 10);
      const candSnap = await db
        .collection('facilities')
        .where('type', 'in', targetTypes)
        .get();

      const accepted: string[] = [];
      for (const candDoc of candSnap.docs) {
        if (candDoc.id === incident.facilityId) continue;
        const fac = candDoc.data() as Facility;
        const loc = normalizeGeoPoint(fac.location);
        if (!loc) continue;
        if (distanceKm(sourceLoc, loc) > rule.radiusKm) continue;

        // Subscription gate (opt-in): if subs exist, require eventType match.
        const subSnap = await db
          .collection('meshSubscriptions')
          .where('facilityId', '==', candDoc.id)
          .where('active', '==', true)
          .get();
        if (subSnap.size === 0) {
          accepted.push(candDoc.id);
          continue;
        }
        const ok = subSnap.docs.some((d) => {
          const s = d.data() as MeshSubscription;
          return s.eventTypes.includes(rule.eventType) && rule.radiusKm <= s.radiusKm;
        });
        if (ok) accepted.push(candDoc.id);
      }

      if (accepted.length === 0) continue;

      writeDocs.push({
        sourceFacilityId: incident.facilityId,
        sourceFacilityType: incident.facilityType,
        sourceIncidentId: incidentId,
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
        publishedAt: admin.firestore.FieldValue.serverTimestamp() as unknown as MeshEvent['publishedAt'],
        expiresAt: admin.firestore.Timestamp.fromMillis(
          Date.now() + rule.ttlMinutes * 60 * 1000,
        ) as unknown as MeshEvent['expiresAt'],
      });
    }

    if (writeDocs.length === 0) {
      console.log(`[mesh] no targets in radius for ${incidentId}`);
      return;
    }

    const batch = db.batch();
    const ids: string[] = [];
    for (const doc of writeDocs) {
      const ref = db.collection('meshEvents').doc();
      ids.push(ref.id);
      batch.set(ref, doc as admin.firestore.DocumentData);
    }
    await batch.commit();

    // Track the fired events on the incident for UI cross-referencing.
    await db.collection('incidents').doc(incidentId).update({
      meshEventsFired: admin.firestore.FieldValue.arrayUnion(...ids),
    });

    console.log(`[mesh] published ${ids.length} mesh events for ${incidentId}`, ids);
  },
);

// aiSummary can be either a free-form string ("…recommend SHELTER_IN_PLACE…")
// or a JSON string from Gemini with a `meshEventRecommendations: string[]`.
// We accept both forms — recommendations are upper-snake-case event types.
function extractAiRecommendations(aiSummary: string | undefined): string[] {
  if (!aiSummary) return [];
  try {
    const parsed = JSON.parse(aiSummary);
    if (Array.isArray(parsed?.meshEventRecommendations)) {
      return parsed.meshEventRecommendations
        .filter((s: unknown) => typeof s === 'string')
        .map((s: string) => s.toUpperCase());
    }
  } catch {
    // not JSON — fall through to regex scan
  }
  const matches = aiSummary.match(/\b[A-Z][A-Z0-9_]{4,}\b/g) ?? [];
  return Array.from(new Set(matches));
}
