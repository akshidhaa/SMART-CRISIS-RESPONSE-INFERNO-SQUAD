import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { PubSub } from '@google-cloud/pubsub';

// Pub/Sub topic the gemini-orchestrator (Phase 2.1) subscribes to. The push
// subscription is configured out-of-band (gcloud / Terraform); the Cloud Run
// service exposes /pubsub and expects `{ incidentId }` as the decoded payload.
const INCIDENT_CREATED_TOPIC = 'incident.created';

// Reuse the same client across invocations on a warm instance.
const pubsub = new PubSub();

export const onIncidentCreate = onDocumentCreated(
  'incidents/{incidentId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const incident = snapshot.data();
    const incidentId = event.params.incidentId;
    const facilityId = incident.facilityId;
    const facilityType = incident.facilityType;
    const type = incident.type;
    const zone = incident.location?.zone;

    // Fast-path exit
    if (!facilityId || !facilityType || !type) return;

    // 1) Fan out alerts to the right employees. Playbook-driven roles are
    //    filled in by the orchestrator after Gemini triage — this first pass
    //    just ensures someone on-site sees the incident immediately.
    const targetRoles = ['employee', 'admin'];
    const db = admin.firestore();

    try {
      const usersQuery = await db.collection('users')
        .where('role', 'in', targetRoles)
        .where('facilityIds', 'array-contains', facilityId)
        .get();

      const batch = db.batch();
      let alertCount = 0;

      usersQuery.docs.forEach(userDoc => {
        const user = userDoc.data();
        const matchesZone = !zone || !user.zones || user.zones.includes(zone) || user.zones.length === 0;
        if (!matchesZone) return;

        const alertRef = db.collection('alerts').doc();
        batch.set(alertRef, {
          incidentId,
          facilityId,
          recipientId: userDoc.id,
          recipientRole: user.role,
          message: `New Incident: ${type.replace('_', ' ').toUpperCase()}`,
          messageTranslations: {
            en: `New Incident: ${type.replace('_', ' ').toUpperCase()}`,
            hi: `नई घटना: ${type}`,
            ta: `புதிய சம்பவம்: ${type}`,
            te: `కొత్త సంఘటన: ${type}`,
            mr: `नवीन घटना: ${type}`,
            bn: `নতুন ঘটনা: ${type}`,
          },
          acknowledged: false,
          deliveredVia: ['in_app'],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        alertCount++;
      });

      if (alertCount > 0) {
        await batch.commit();
        console.log(`Created ${alertCount} alerts for incident ${incidentId}`);
      }
    } catch (error) {
      console.error('Error creating alerts on incident create:', error);
    }

    // 2) Publish to Pub/Sub so gemini-orchestrator can pick it up.
    //    We publish *after* the alerts batch so a Pub/Sub failure never
    //    swallows the local alert fanout.
    try {
      const messageId = await pubsub
        .topic(INCIDENT_CREATED_TOPIC)
        .publishMessage({
          json: { incidentId, facilityId, facilityType, type },
          attributes: {
            incidentId,
            facilityType: String(facilityType),
            aiDetected: incident.aiDetected ? 'true' : 'false',
          },
        });
      console.log(
        `Published ${INCIDENT_CREATED_TOPIC} (messageId=${messageId}) for incident ${incidentId}`
      );
    } catch (error) {
      // Don't throw — the orchestrator can be replayed from Firestore if
      // needed, and failing here would retry the whole function including
      // the alert batch above.
      console.error(
        `Failed to publish to ${INCIDENT_CREATED_TOPIC} for incident ${incidentId}:`,
        error
      );
    }
  }
);
