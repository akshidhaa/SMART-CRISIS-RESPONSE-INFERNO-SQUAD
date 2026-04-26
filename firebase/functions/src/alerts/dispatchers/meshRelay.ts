// Fallback channel — when neither FCM nor SMS is available, write the
// payload into a Firestore "mesh-relay" queue so an on-prem device
// (or a Phase 7 mesh gateway) can pick it up asynchronously. The Phase 2.3
// contract just requires a durable fallback; the actual transport is
// installed later.

import * as admin from 'firebase-admin';

export interface MeshRelayInput {
  alertId: string;
  incidentId: string;
  recipientId: string;
  message: string;
  createdAt?: FirebaseFirestore.FieldValue;
}

export async function dispatchMeshRelay(
  input: MeshRelayInput,
  db: FirebaseFirestore.Firestore = admin.firestore()
): Promise<string> {
  const ref = db.collection('meshRelayQueue').doc();
  await ref.set({
    alertId: input.alertId,
    incidentId: input.incidentId,
    recipientId: input.recipientId,
    message: input.message,
    createdAt: input.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
    delivered: false,
  });
  return ref.id;
}
