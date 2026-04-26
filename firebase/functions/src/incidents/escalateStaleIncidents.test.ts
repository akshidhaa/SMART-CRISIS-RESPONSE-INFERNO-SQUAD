// escalateStaleIncidents — verifies severity promotion, admin re-fanout,
// and mesh-event publishing once a critical incident ages past 5 minutes.
// Uses the same in-memory Firestore fake as the dispatchAlerts tests.

import { runEscalationSweep } from './escalateStaleIncidents';
import type { Incident, User, FacilityType } from '@scr-mesh/types';

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

class FakeQueryResult {
  constructor(public docs: FakeDocRef[]) {}
  get empty() {
    return this.docs.length === 0;
  }
  get size() {
    return this.docs.length;
  }
}

class FakeQuery {
  constructor(
    public store: Map<string, DocData>,
    public filters: Array<(data: DocData) => boolean> = []
  ) {}
  where(field: string, op: string, value: any) {
    const next = new FakeQuery(this.store, [
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
    return next;
  }
  async get() {
    const out: FakeDocRef[] = [];
    for (const [id, data] of this.store.entries()) {
      if (this.filters.every((f) => f(data))) {
        const ref = new FakeDocRef(this.store, id);
        (ref as any).data = () => data;
        out.push(
          Object.assign(ref, {
            data: () => data,
            ref,
          }) as any
        );
      }
    }
    return new FakeQueryResult(
      out.map((r) =>
        Object.assign(r, {
          data: () => this.store.get(r.id),
          ref: r,
        })
      )
    );
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

// admin.firestore.FieldValue.arrayUnion is used inside the function — stub it
// by intercepting via jest.mock on firebase-admin.
jest.mock('firebase-admin', () => {
  const actual = jest.requireActual('firebase-admin');
  return {
    ...actual,
    firestore: Object.assign(() => ({}), {
      FieldValue: {
        arrayUnion: (...values: any[]) => ({ __arrayUnion: true, values }),
        serverTimestamp: () => new Date(),
      },
    }),
  };
});

function seedIncident(
  db: FakeDb,
  id: string,
  facilityType: FacilityType,
  severity: Incident['severity'],
  createdAtMs: number
) {
  db.seed('incidents', id, {
    facilityId: `${facilityType}_${id}`,
    facilityType,
    type: 'demo',
    severity,
    status: 'reported',
    reporterId: 'seeder',
    reporterRole: 'admin',
    location: { zone: 'Main', floor: '1' },
    description: 'test',
    assignedStaff: [],
    meshEventsFired: [],
    createdAt: new Date(createdAtMs),
  });
}

function seedAdmin(db: FakeDb, facilityId: string, adminId: string) {
  const user: User = {
    email: `${adminId}@example.com`,
    displayName: `Admin ${adminId}`,
    phoneNumber: '+10000000000',
    role: 'admin',
    designation: 'admin',
    facilityIds: [facilityId],
    zones: [],
    language: 'en',
    createdAt: new Date(),
  };
  db.seed('users', adminId, user as any);
}

describe('runEscalationSweep', () => {
  const NOW = 10_000_000;

  it.each(['hospital', 'hotel', 'school', 'college', 'factory'] as FacilityType[])(
    'promotes stale non-critical %s incident and re-fires admin alerts',
    async (facilityType) => {
      const db = new FakeDb();
      const id = `inc_${facilityType}`;
      const fourMinAgo = NOW - 4 * 60_000;
      seedIncident(db, id, facilityType, 'medium', fourMinAgo);
      seedAdmin(db, `${facilityType}_${id}`, `admin_${facilityType}`);

      const publishSpy = jest.fn(async () => 'mid_stub');
      const report = await runEscalationSweep({
        db: db as any,
        publishMeshEvent: publishSpy,
        now: () => NOW,
      });

      expect(report.promoted).toContain(id);
      expect(report.meshPublished).not.toContain(id);
      const updated = db.get('incidents', id)!;
      expect(updated.severity).toBe('high');
      expect(updated.escalationLevel).toBe(1);
      expect(report.alertsFired).toBe(1);
      expect(publishSpy).not.toHaveBeenCalled();
      expect(db.size('alerts')).toBe(1);
    }
  );

  it('publishes mesh event when critical incident stale > 5 min', async () => {
    const db = new FakeDb();
    const id = 'inc_critical';
    const sixMinAgo = NOW - 6 * 60_000;
    seedIncident(db, id, 'hospital', 'critical', sixMinAgo);

    const publishSpy = jest.fn(async (_payload: any) => 'mid_42');
    const report = await runEscalationSweep({
      db: db as any,
      publishMeshEvent: publishSpy,
      now: () => NOW,
    });

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy.mock.calls[0][0].eventType).toBe('REQUEST_EXTERNAL_EMERGENCY');
    expect(report.meshPublished).toContain(id);
    const updated = db.get('incidents', id)!;
    expect(updated.escalationLevel).toBe(1);
    expect(updated.meshEventsFired).toContain('mid_42');
  });

  it('leaves fresh incidents untouched', async () => {
    const db = new FakeDb();
    const id = 'inc_fresh';
    seedIncident(db, id, 'school', 'medium', NOW - 30_000);

    const publishSpy = jest.fn(async () => 'mid');
    const report = await runEscalationSweep({
      db: db as any,
      publishMeshEvent: publishSpy,
      now: () => NOW,
    });

    expect(report.promoted).toHaveLength(0);
    expect(publishSpy).not.toHaveBeenCalled();
    const stored = db.get('incidents', id)!;
    expect(stored.severity).toBe('medium');
  });

  it('skips already-escalated incidents', async () => {
    const db = new FakeDb();
    const id = 'inc_done';
    const fourMinAgo = NOW - 4 * 60_000;
    seedIncident(db, id, 'factory', 'high', fourMinAgo);
    const incident = db.get('incidents', id)!;
    incident.escalationLevel = 1;

    const report = await runEscalationSweep({
      db: db as any,
      now: () => NOW,
    });

    expect(report.promoted).toHaveLength(0);
    const stored = db.get('incidents', id)!;
    expect(stored.severity).toBe('high');
  });
});
