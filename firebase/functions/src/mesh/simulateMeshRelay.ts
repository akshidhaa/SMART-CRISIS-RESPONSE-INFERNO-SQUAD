// simulateMeshRelay — Phase 3.2 connectivity simulator backend.
//
// Mirrors every alerts/{alertId} doc to a parallel meshRelay/{alertId}
// collection so the client can show BLE-mesh fallback during the demo.
// This is separate from the meshRelayQueue fallback in dispatchAlerts
// (which only fires when FCM+SMS both fail). The simulator needs the
// full alert stream to demonstrate continuity when Wi-Fi is "off".

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import type { Alert } from '@scr-mesh/types';

export const simulateMeshRelay = onDocumentCreated(
  'alerts/{alertId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const alertId = event.params.alertId;
    const alert = snap.data() as Alert;

    try {
      await admin
        .firestore()
        .collection('meshRelay')
        .doc(alertId)
        .set({
          alertId,
          incidentId: alert.incidentId,
          facilityId: alert.facilityId,
          recipientId: alert.recipientId ?? null,
          recipientRole: alert.recipientRole,
          message: alert.message,
          messageTranslations: alert.messageTranslations,
          relayedAt: admin.firestore.FieldValue.serverTimestamp(),
          // Mirror createdAt so the client can order deterministically
          createdAt: alert.createdAt,
        });
      console.log(`[simulateMeshRelay] mirrored alert ${alertId} to meshRelay`);
    } catch (err) {
      console.error(`[simulateMeshRelay] failed for ${alertId}:`, err);
    }
  }
);
