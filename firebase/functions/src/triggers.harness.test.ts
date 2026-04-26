// firebase-functions-test harness tests — exercise the *exported* Cloud
// Function triggers (dispatchAlerts, escalateStaleIncidents) the same way
// the Functions runtime would, but with in-memory fakes injected via the
// __setDispatchDeps / __setEscalationDeps hooks. Per-facility-type coverage
// proves the end-to-end trigger wiring matches the Phase 2.3 contract.

import functionsTest from 'firebase-functions-test';
import type {
  Alert,
  User,
  Incident,
  FacilityType,
  IncidentSeverity,
} from '@scr-mesh/types';

// Mock firebase-admin BEFORE importing the triggers so PubSub / Firestore
// clients aren't spun up against live services. Only FieldValue sentinels
// are exercised by the handlers under test.
jest.mock('@google-cloud/pubsub', () => ({
  PubSub: class {
    topic() {
      return { publishMessage: async () => 'stub-message-id' };
    }
  },
}));

const testEnv = functionsTest();

import {
  dispatchAlerts,
  __setDispatchDeps,
  __resetDispatchDeps,
} from './alerts/dispatchAlerts';
import {
  escalateStaleIncidents,
  __setEscalationDeps,
  __resetEscalationDeps,
} from './incidents/escalateStaleIncidents';

// --- Minimal FakeDb re-implementation shared by harness tests ----------------

type DocData = Record<string, any>;

class FakeDocRef {
  constructor(public store: Map<string, DocData>, public id: string) {}
  async get() {
    const data = this.store.get(this.id);
    return { exists: data !== undefined, id: this.id, data: () => data };
  }
  async update(patch: DocData) {
    const cur = this.store.get(this.id) ?? {};
    const merged: DocData = { ...cur };
    for (const [k, v] of Object.entries(patch)) {
      if (v && typeof v === 'object' && (v as any).__arrayUnion) {
        merged[k] = [...(merged[k] ?? []), ...(v as any).values];
      } else if (v && typeof v === 'object' && (v as any).__arrayRemove) {
        merged[k] = (merged[k] ?? []).filter(
          (x: any) => !(v as any).values.includes(x)
        );
      } else {
        merged[k] = v;
      }
    }
    this.store.set(this.id, merged);
  }
  async set(data: DocData) {
    this.store.set(this.id, data);
  }
}

class FakeQuery {
  constructor(
    public store: Map<string, DocData>,
    public filters: Array<(d: DocData) => boolean> = []
  ) {}
  where(field: string, op: string, value: any) {
    return new FakeQuery(this.store, [
      ...this.filters,
      (d: DocData) => {
        const v = d[field];
        if (op === '==') return v === value;
        if (op === 'in') return Array.isArray(value) && value.includes(v);
        if (op === 'array-contains')
          return Array.isArray(v) && v.includes(value);
        return true;
      },
    ]);
  }
  async get() {
    const docs: any[] = [];
    for (const [id, data] of this.store.entries()) {
      if (this.filters.every((f) => f(data))) {
        const ref = new FakeDocRef(this.store, id);
        docs.push({ id, data: () => data, ref });
      }
    }
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

class FakeCollection extends FakeQuery {
  doc(id?: string) {
    const key = id ?? `auto_${Math.random().toString(36).slice(2, 10)}`;
    return new FakeDocRef(this.store, key);
  }
}

class FakeBatch {
  ops: Array<() => void> = [];
  set(ref: FakeDocRef, data: DocData) {
    this.ops.push(() => ref.set(data));
  }
  async commit() {
    for (const op of this.ops) await op();
  }
}

class FakeDb {
  collections: Record<string, Map<string, DocData>> = {};
  collection(name: string) {
    this.collections[name] ??= new Map();
    return new FakeCollection(this.collections[name]);
  }
  batch() {
    return new FakeBatch();
  }
  seed(name: string, id: string, data: DocData) {
    this.collections[name] ??= new Map();
    this.collections[name].set(id, data);
  }
  get(name: string, id: string) {
    return this.collections[name]?.get(id);
  }
  size(name: string) {
    return this.collections[name]?.size ?? 0;
  }
}

// --- dispatchAlerts trigger coverage ----------------------------------------

interface Fixture {
  facilityId: string;
  facilityType: FacilityType;
  incidentType: string;
  language: 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'bn';
  severity: IncidentSeverity;
}

const FIXTURES: Fixture[] = [
  { facilityId: 'facility_001',       facilityType: 'hospital', incidentType: 'code_blue',     language: 'en', severity: 'critical' },
  { facilityId: 'grand_horizon',      facilityType: 'hotel',    incidentType: 'fire',          language: 'hi', severity: 'high'     },
  { facilityId: 'lincoln_high',       facilityType: 'school',   incidentType: 'lockdown',      language: 'ta', severity: 'critical' },
  { facilityId: 'state_university',   facilityType: 'college',  incidentType: 'medical',       language: 'te', severity: 'medium'   },
  { facilityId: 'apex_manufacturing', facilityType: 'factory',  incidentType: 'chemical_spill',language: 'mr', severity: 'critical' },
];

function seedFor(db: FakeDb, f: Fixture) {
  const alertId = `alert_${f.facilityId}`;
  const incidentId = `inc_${f.facilityId}`;
  const userId = `user_${f.facilityId}`;
  db.seed('alerts', alertId, {
    incidentId,
    facilityId: f.facilityId,
    recipientId: userId,
    recipientRole: 'employee',
    message: `New Incident: ${f.incidentType}`,
    messageTranslations: {
      en: `[en] ${f.incidentType}`,
      hi: `[hi] ${f.incidentType}`,
      ta: `[ta] ${f.incidentType}`,
      te: `[te] ${f.incidentType}`,
      mr: `[mr] ${f.incidentType}`,
      bn: `[bn] ${f.incidentType}`,
    },
    acknowledged: false,
    deliveredVia: ['in_app'],
    createdAt: new Date(),
  } as Alert);
  db.seed('users', userId, {
    email: `${userId}@example.com`,
    displayName: userId,
    phoneNumber: '+15550000000',
    role: 'employee',
    designation: 'staff',
    facilityIds: [f.facilityId],
    zones: [],
    language: f.language,
    fcmTokens: ['token_a'],
    createdAt: new Date(),
  } as User);
  db.seed('incidents', incidentId, {
    facilityId: f.facilityId,
    facilityType: f.facilityType,
    type: f.incidentType,
    severity: f.severity,
    status: 'reported',
    reporterId: 'seeder',
    reporterRole: 'admin',
    location: { zone: 'Main', floor: '1' },
    description: 'fixture',
    assignedStaff: [],
    meshEventsFired: [],
    createdAt: new Date(),
  } as Incident);
  return { alertId, userId, incidentId };
}

describe('firebase-functions-test harness — dispatchAlerts', () => {
  afterEach(() => __resetDispatchDeps());
  afterAll(() => testEnv.cleanup());

  it.each(FIXTURES)(
    'wrapped trigger delivers $facilityType alert in $language',
    async (f) => {
      const db = new FakeDb();
      const { alertId } = seedFor(db, f);

      const fcmSpy = jest.fn(async ({ tokens }: any) => ({
        successCount: tokens.length,
        failureCount: 0,
        deadTokens: [],
      }));
      const twilioSpy = jest.fn(async () => ({ sid: 'sid_harness' }));
      const relaySpy = jest.fn(async () => 'relay_harness');

      __setDispatchDeps({
        db: db as any,
        fcm: fcmSpy,
        twilio: twilioSpy,
        meshRelay: relaySpy,
        sleep: async () => {},
      });

      const wrapped = testEnv.wrap(dispatchAlerts as any) as any;
      // Handler only reads event.data truthiness and event.params.alertId, so
      // a plain stub avoids makeDocumentSnapshot's value-proto encoder which
      // chokes on Date fixtures.
      await wrapped({ data: { id: alertId }, params: { alertId } });

      const stored = db.get('alerts', alertId)!;
      expect(stored.deliveredVia).toContain('push');
      expect(fcmSpy).toHaveBeenCalledTimes(1);
      expect(fcmSpy.mock.calls[0][0].body).toBe(`[${f.language}] ${f.incidentType}`);
      if (f.severity === 'critical') {
        expect(twilioSpy).toHaveBeenCalled();
      } else {
        expect(twilioSpy).not.toHaveBeenCalled();
      }
    }
  );
});

// --- escalateStaleIncidents trigger coverage --------------------------------

describe('firebase-functions-test harness — escalateStaleIncidents', () => {
  afterEach(() => __resetEscalationDeps());
  afterAll(() => testEnv.cleanup());

  it('wrapped scheduler promotes stale non-critical incidents and fans admin alerts', async () => {
    const db = new FakeDb();
    const NOW = 10_000_000;
    const fourMinAgo = NOW - 4 * 60_000;

    db.seed('incidents', 'inc_sched', {
      facilityId: 'facility_sched',
      facilityType: 'hospital' as FacilityType,
      type: 'fire',
      severity: 'medium' as IncidentSeverity,
      status: 'reported',
      reporterId: 'seeder',
      reporterRole: 'admin',
      location: { zone: 'Main', floor: '1' },
      description: 'stale',
      assignedStaff: [],
      meshEventsFired: [],
      createdAt: new Date(fourMinAgo),
    });
    db.seed('users', 'admin_sched', {
      email: 'admin_sched@example.com',
      displayName: 'Admin',
      phoneNumber: '+10000000000',
      role: 'admin',
      designation: 'admin',
      facilityIds: ['facility_sched'],
      zones: [],
      language: 'en',
      createdAt: new Date(),
    });

    const publishSpy = jest.fn(async (_payload: any) => 'mid_sched');
    __setEscalationDeps({
      db: db as any,
      now: () => NOW,
      publishMeshEvent: publishSpy,
    });

    const wrapped = testEnv.wrap(escalateStaleIncidents as any) as any;
    await wrapped({});

    expect(db.get('incidents', 'inc_sched')?.severity).toBe('high');
    expect(db.size('alerts')).toBe(1);
    expect(publishSpy).not.toHaveBeenCalled();
  });
});
