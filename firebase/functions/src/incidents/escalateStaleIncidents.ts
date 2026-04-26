// escalateStaleIncidents — Phase 2.3 safety net.
//
// Runs every 60s. Finds incidents that are still unacknowledged past their
// SLA and either:
//   - bumps severity by one rung (3 minutes stale), then re-fires the alert
//     fanout so admins are looped in at the new level; OR
//   - if already critical and stale past 5 minutes, publishes an external
//     `REQUEST_EXTERNAL_EMERGENCY` mesh event for cross-facility response.
//
// The severity ladder below is the single source of truth for the promotion
// step. `escalationLevel` on the doc tracks how many times we've already
// bumped this incident so we don't escalate in an infinite loop.

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { PubSub } from '@google-cloud/pubsub';
import type {
  Incident,
  IncidentSeverity,
  IncidentId,
  FacilityId,
  FacilityType,
} from '@scr-mesh/types';

const SEVERITY_LADDER: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
const STALE_PROMOTE_MS = 3 * 60 * 1000;
const STALE_MESH_MS = 5 * 60 * 1000;
const MESH_EVENT_TOPIC = 'mesh.event.published';

let cachedPubSub: PubSub | null = null;
function getPubSub(): PubSub {
  if (!cachedPubSub) cachedPubSub = new PubSub();
  return cachedPubSub;
}

function nextSeverity(s: IncidentSeverity): IncidentSeverity {
  const idx = SEVERITY_LADDER.indexOf(s);
  if (idx < 0 || idx === SEVERITY_LADDER.length - 1) return 'critical';
  return SEVERITY_LADDER[idx + 1];
}

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object') {
    const anyVal = value as { toMillis?: () => number; seconds?: number };
    if (typeof anyVal.toMillis === 'function') return anyVal.toMillis();
    if (typeof anyVal.seconds === 'number') return anyVal.seconds * 1000;
  }
  return null;
}

export interface EscalationDeps {
  db?: FirebaseFirestore.Firestore;
  publishMeshEvent?: (payload: MeshEventPayload) => Promise<string>;
  now?: () => number;
}

export interface MeshEventPayload {
  incidentId: IncidentId;
  facilityId: FacilityId;
  facilityType: FacilityType;
  eventType: string;
  severity: IncidentSeverity;
}

export interface EscalationReport {
  scanned: number;
  promoted: string[];
  meshPublished: string[];
  alertsFired: number;
}

async function refireAlerts(
  db: FirebaseFirestore.Firestore,
  incidentId: IncidentId,
  incident: Incident
): Promise<number> {
  // Loop admins in at the new severity level. The existing onIncidentCreate
  // flow targets `employee`; when we escalate we widen to `admin` too so the
  // chain of command is informed. We write these as NEW alert docs so the
  // dispatchAlerts trigger picks them up.
  const admins = await db
    .collection('users')
    .where('role', '==', 'admin')
    .where('facilityIds', 'array-contains', incident.facilityId)
    .get();

  if (admins.empty) return 0;

  const batch = db.batch();
  let count = 0;
  admins.docs.forEach((userDoc) => {
    const ref = db.collection('alerts').doc();
    const typeLabel = (incident.type ?? 'incident').replace(/_/g, ' ').toUpperCase();
    batch.set(ref, {
      incidentId,
      facilityId: incident.facilityId,
      recipientId: userDoc.id,
      recipientRole: 'admin',
      message: `ESCALATED (${incident.severity}): ${typeLabel}`,
      messageTranslations: {
        en: `ESCALATED (${incident.severity}): ${typeLabel}`,
        hi: `बढ़ाया गया (${incident.severity}): ${incident.type}`,
        ta: `மேம்படுத்தப்பட்டது (${incident.severity}): ${incident.type}`,
        te: `పెంచబడింది (${incident.severity}): ${incident.type}`,
        mr: `वाढवले (${incident.severity}): ${incident.type}`,
        bn: `বৃদ্ধি (${incident.severity}): ${incident.type}`,
      },
      acknowledged: false,
      deliveredVia: ['in_app'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    count++;
  });
  await batch.commit();
  return count;
}

async function defaultPublishMeshEvent(payload: MeshEventPayload): Promise<string> {
  const messageId = await getPubSub()
    .topic(MESH_EVENT_TOPIC)
    .publishMessage({
      json: payload,
      attributes: {
        incidentId: payload.incidentId,
        facilityType: String(payload.facilityType),
        eventType: payload.eventType,
      },
    });
  return messageId;
}

export async function runEscalationSweep(
  deps: EscalationDeps = {}
): Promise<EscalationReport> {
  const db = deps.db ?? admin.firestore();
  const now = (deps.now ?? (() => Date.now()))();
  const publishMesh = deps.publishMeshEvent ?? defaultPublishMeshEvent;
  const report: EscalationReport = {
    scanned: 0,
    promoted: [],
    meshPublished: [],
    alertsFired: 0,
  };

  const cutoff = now - STALE_PROMOTE_MS;
  const snap = await db
    .collection('incidents')
    .where('status', 'in', ['reported', 'acknowledged', 'in_progress'])
    .get();
  report.scanned = snap.size;

  for (const doc of snap.docs) {
    const incident = doc.data() as Incident & { escalationLevel?: number };
    const createdAtMs = toMillis(incident.createdAt);
    if (createdAtMs === null || createdAtMs > cutoff) continue;
    if (incident.acknowledgedAt) continue;

    const ageMs = now - createdAtMs;
    const level = incident.escalationLevel ?? 0;

    // Critical + stale past 5 min -> external mesh event (once per incident).
    if (incident.severity === 'critical' && ageMs >= STALE_MESH_MS && !level) {
      try {
        const messageId = await publishMesh({
          incidentId: doc.id,
          facilityId: incident.facilityId,
          facilityType: incident.facilityType,
          eventType: 'REQUEST_EXTERNAL_EMERGENCY',
          severity: incident.severity,
        });
        await doc.ref.update({
          escalationLevel: 1,
          meshEventsFired: admin.firestore.FieldValue.arrayUnion(messageId),
        });
        report.meshPublished.push(doc.id);
      } catch (err) {
        console.error(`Mesh publish failed for ${doc.id}:`, err);
      }
      continue;
    }

    // Otherwise bump severity once per sweep and re-fire alerts.
    if (incident.severity !== 'critical' && !level) {
      const newSeverity = nextSeverity(incident.severity);
      await doc.ref.update({
        severity: newSeverity,
        escalationLevel: 1,
      });
      const fired = await refireAlerts(db, doc.id, {
        ...incident,
        severity: newSeverity,
      });
      report.promoted.push(doc.id);
      report.alertsFired += fired;
    }
  }

  return report;
}

// Test harness hook — firebase-functions-test wrapped invocations call the
// real trigger; the override lets tests inject the in-memory fake db and
// spies without hitting live Firestore / PubSub.
let _escalationDepsOverride: EscalationDeps = {};
export const __setEscalationDeps = (deps: EscalationDeps): void => {
  _escalationDepsOverride = deps;
};
export const __resetEscalationDeps = (): void => {
  _escalationDepsOverride = {};
};

export const escalateStaleIncidents = onSchedule('every 1 minutes', async () => {
  const report = await runEscalationSweep(_escalationDepsOverride);
  console.log(
    `escalateStaleIncidents scan=${report.scanned} promoted=${report.promoted.length} ` +
      `meshPublished=${report.meshPublished.length} alerts=${report.alertsFired}`
  );
});
