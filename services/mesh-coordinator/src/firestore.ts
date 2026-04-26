// Thin Firestore helpers used by the coordinator. Kept generic so the same
// code runs against the emulator (admin SDK with FIRESTORE_EMULATOR_HOST set
// by Cloud Functions) or production.

import type {
  Facility,
  FacilityType,
  GeoPoint,
  Incident,
  MeshEvent,
  MeshEventStatus,
  MeshSubscription,
  Timestamp as TimestampType,
} from '@scr-mesh/types';

export interface FirestoreLike {
  /** Read a single doc — returns null if missing. */
  getDoc<T>(collection: string, id: string): Promise<T | null>;
  /** Query by `type ∈ list` returning {id, data}. */
  listFacilitiesByType(types: FacilityType[]): Promise<Array<{ id: string; data: Facility }>>;
  /** Read mesh subscriptions for a facility. */
  listSubscriptionsForFacility(facilityId: string): Promise<MeshSubscription[]>;
  /** Count outbound mesh events from this facility within window. */
  countRecentMeshEvents(sourceFacilityId: string, sinceMs: number): Promise<number>;
  /** Atomic batch write of mesh event docs. Returns ids in insertion order. */
  writeMeshEvents(docs: Omit<MeshEvent, never>[]): Promise<string[]>;
  /** Server timestamp factory; the coordinator emits these so the writes are
   *  resolved on the server, matching the rest of the codebase's convention. */
  serverTimestamp(): TimestampType;
  /** Future-dated timestamp helper (for expiresAt). */
  futureTimestamp(msFromNow: number): TimestampType;
}

// Lazy admin SDK adapter — only constructed when not in tests.
export async function buildAdminFirestoreAdapter(): Promise<FirestoreLike> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const admin = (await import('firebase-admin')) as typeof import('firebase-admin');
  if (admin.apps.length === 0) admin.initializeApp();
  const db = admin.firestore();

  return {
    async getDoc<T>(coll: string, id: string): Promise<T | null> {
      const snap = await db.collection(coll).doc(id).get();
      return snap.exists ? (snap.data() as T) : null;
    },
    async listFacilitiesByType(types) {
      if (types.length === 0) return [];
      const snap = await db.collection('facilities').where('type', 'in', types.slice(0, 10)).get();
      return snap.docs.map((d) => ({ id: d.id, data: d.data() as Facility }));
    },
    async listSubscriptionsForFacility(facilityId) {
      const snap = await db
        .collection('meshSubscriptions')
        .where('facilityId', '==', facilityId)
        .where('active', '==', true)
        .get();
      return snap.docs.map((d) => d.data() as MeshSubscription);
    },
    async countRecentMeshEvents(sourceFacilityId, sinceMs) {
      const cutoff = admin.firestore.Timestamp.fromMillis(sinceMs);
      const snap = await db
        .collection('meshEvents')
        .where('sourceFacilityId', '==', sourceFacilityId)
        .where('publishedAt', '>=', cutoff)
        .get();
      return snap.size;
    },
    async writeMeshEvents(docs) {
      if (docs.length === 0) return [];
      const batch = db.batch();
      const ids: string[] = [];
      for (const doc of docs) {
        const ref = db.collection('meshEvents').doc();
        ids.push(ref.id);
        batch.set(ref, doc as Record<string, unknown>);
      }
      await batch.commit();
      return ids;
    },
    serverTimestamp() {
      return admin.firestore.FieldValue.serverTimestamp() as unknown as TimestampType;
    },
    futureTimestamp(msFromNow) {
      return admin.firestore.Timestamp.fromMillis(Date.now() + msFromNow) as unknown as TimestampType;
    },
  };
}

// Helper: facility GeoPoint can be stored either as the Firestore GeoPoint
// instance or as a plain `{ latitude, longitude }` object — normalize.
export function normalizeGeoPoint(loc: unknown): GeoPoint | null {
  if (!loc || typeof loc !== 'object') return null;
  const anyLoc = loc as Record<string, unknown>;
  // Native Firestore GeoPoint has _latitude / _longitude getters.
  if (typeof anyLoc.latitude === 'number' && typeof anyLoc.longitude === 'number') {
    return { latitude: anyLoc.latitude, longitude: anyLoc.longitude };
  }
  // Bootstrap seed wrote { lat, lng } — accept it for dev convenience.
  if (typeof anyLoc.lat === 'number' && typeof anyLoc.lng === 'number') {
    return { latitude: anyLoc.lat as number, longitude: anyLoc.lng as number };
  }
  return null;
}

export type { Incident, MeshEvent, MeshEventStatus };
