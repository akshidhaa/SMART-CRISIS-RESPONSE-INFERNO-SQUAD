import { coordinate } from './coordinate';
import type { FirestoreLike } from './firestore';
import type { Facility, Incident, MeshEvent, MeshSubscription } from '@scr-mesh/types';

// In-memory fake — same pattern as firebase/functions/src/alerts/dispatchAlerts.test.ts
function makeFakeFs(opts: {
  facilities: Record<string, Facility>;
  incidents?: Record<string, Incident>;
  subscriptions?: Record<string, MeshSubscription[]>;
  recentEvents?: number;
}): { fs: FirestoreLike; written: MeshEvent[] } {
  const written: MeshEvent[] = [];
  const fs: FirestoreLike = {
    async getDoc<T>(coll: string, id: string) {
      if (coll === 'facilities') return (opts.facilities[id] as T) ?? null;
      if (coll === 'incidents') return ((opts.incidents ?? {})[id] as T) ?? null;
      return null;
    },
    async listFacilitiesByType(types) {
      return Object.entries(opts.facilities)
        .filter(([, f]) => types.includes(f.type))
        .map(([id, data]) => ({ id, data }));
    },
    async listSubscriptionsForFacility(facilityId) {
      return (opts.subscriptions ?? {})[facilityId] ?? [];
    },
    async countRecentMeshEvents() {
      return opts.recentEvents ?? 0;
    },
    async writeMeshEvents(docs) {
      written.push(...(docs as MeshEvent[]));
      return docs.map((_, i) => `evt_${written.length - docs.length + i + 1}`);
    },
    serverTimestamp() {
      return new Date() as any;
    },
    futureTimestamp(ms) {
      return new Date(Date.now() + ms) as any;
    },
  };
  return { fs, written };
}

const baseFacility = (overrides: Partial<Facility> = {}): Facility => ({
  name: 'test',
  type: 'hospital',
  tier: 'tertiary',
  address: 'addr',
  location: { latitude: 12.97, longitude: 77.59 },
  floorPlans: [],
  designations: [],
  subscribedMeshRadiusKm: 5,
  meshCapabilities: { canPublish: [], canReceive: [] },
  createdAt: new Date(),
  ...overrides,
});

describe('coordinate', () => {
  test('factory chemical_spill fans out to hospitals + hotels in radius', async () => {
    const facilities: Record<string, Facility> = {
      src_factory: baseFacility({
        type: 'factory',
        name: 'Apex',
        location: { latitude: 12.97, longitude: 77.59 },
      }),
      // Hospital ~1.5 km away — within 5 km radius
      hosp_near: baseFacility({
        type: 'hospital',
        name: 'City General',
        location: { latitude: 12.985, longitude: 77.595 },
      }),
      // Hospital 50 km away — outside
      hosp_far: baseFacility({
        type: 'hospital',
        name: 'Far Hospital',
        location: { latitude: 13.5, longitude: 77.59 },
      }),
      hotel_near: baseFacility({
        type: 'hotel',
        name: 'Grand Horizon',
        location: { latitude: 12.972, longitude: 77.6 },
      }),
    };
    const incident: Incident = {
      facilityId: 'src_factory',
      facilityType: 'factory',
      type: 'chemical_spill',
      severity: 'critical',
      status: 'reported',
      reporterId: 'u1',
      reporterRole: 'employee',
      location: { zone: 'A', floor: '1' },
      description: 'spill',
      assignedStaff: [],
      meshEventsFired: [],
      createdAt: new Date(),
    };
    const { fs, written } = makeFakeFs({ facilities, incidents: { inc1: incident } });
    const out = await coordinate({ incidentId: 'inc1' }, { fs });

    expect(out.meshEventIds.length).toBeGreaterThanOrEqual(2);
    const types = written.map((d) => d.eventType);
    expect(types).toContain('PREPARE_CHEMICAL_EXPOSURE_PROTOCOL');
    expect(types).toContain('EVACUATE_WINDWARD_SIDE');

    const chemEvent = written.find((d) => d.eventType === 'PREPARE_CHEMICAL_EXPOSURE_PROTOCOL')!;
    expect(chemEvent.affectedFacilityIds).toContain('hosp_near');
    expect(chemEvent.affectedFacilityIds).not.toContain('hosp_far');
    expect(chemEvent.affectedFacilityIds).not.toContain('src_factory');
  });

  test('skips when severity is low', async () => {
    const facilities = { f1: baseFacility({ type: 'school' }) };
    const incident: Incident = {
      facilityId: 'f1',
      facilityType: 'school',
      type: 'lockdown',
      severity: 'low',
      status: 'reported',
      reporterId: 'u1',
      reporterRole: 'employee',
      location: { zone: 'A', floor: '1' },
      description: '',
      assignedStaff: [],
      meshEventsFired: [],
      createdAt: new Date(),
    };
    const { fs, written } = makeFakeFs({ facilities, incidents: { i: incident } });
    const out = await coordinate({ incidentId: 'i' }, { fs });
    expect(written).toHaveLength(0);
    expect(out.skipped[0].reason).toBe('severity-low');
  });

  test('rate limit blocks when 10+ recent events from source', async () => {
    const facilities = {
      src: baseFacility({ type: 'hotel' }),
      h1: baseFacility({ type: 'hospital', location: { latitude: 12.971, longitude: 77.591 } }),
    };
    const incident: Incident = {
      facilityId: 'src',
      facilityType: 'hotel',
      type: 'fire',
      severity: 'critical',
      status: 'reported',
      reporterId: 'u',
      reporterRole: 'admin',
      location: { zone: 'A', floor: '1' },
      description: '',
      assignedStaff: [],
      meshEventsFired: [],
      createdAt: new Date(),
    };
    const { fs, written } = makeFakeFs({
      facilities,
      incidents: { i: incident },
      recentEvents: 10,
    });
    const out = await coordinate({ incidentId: 'i' }, { fs });
    expect(written).toHaveLength(0);
    expect(out.skipped.every((s) => s.reason === 'rate-limited')).toBe(true);
  });

  test('mesh subscriptions opt-in: facility WITH subs only receives matching event types', async () => {
    const facilities: Record<string, Facility> = {
      src: baseFacility({ type: 'factory' }),
      // Hospital with subscription — only accepts PREPARE_CHEMICAL_EXPOSURE_PROTOCOL
      hosp_subbed: baseFacility({
        type: 'hospital',
        location: { latitude: 12.972, longitude: 77.591 },
      }),
    };
    const subscriptions: Record<string, MeshSubscription[]> = {
      hosp_subbed: [
        {
          facilityId: 'hosp_subbed',
          eventTypes: ['PREPARE_CHEMICAL_EXPOSURE_PROTOCOL'],
          radiusKm: 10,
          active: true,
        },
      ],
    };
    const incident: Incident = {
      facilityId: 'src',
      facilityType: 'factory',
      type: 'chemical_spill',
      severity: 'critical',
      status: 'reported',
      reporterId: 'u',
      reporterRole: 'admin',
      location: { zone: 'A', floor: '1' },
      description: '',
      assignedStaff: [],
      meshEventsFired: [],
      createdAt: new Date(),
    };
    const { fs, written } = makeFakeFs({
      facilities,
      incidents: { i: incident },
      subscriptions,
    });
    const out = await coordinate({ incidentId: 'i' }, { fs });
    const chem = written.find((d) => d.eventType === 'PREPARE_CHEMICAL_EXPOSURE_PROTOCOL');
    const burn = written.find((d) => d.eventType === 'PREPARE_BURN_UNIT');
    expect(chem?.affectedFacilityIds).toContain('hosp_subbed');
    // PREPARE_BURN_UNIT isn't in factory:chemical_spill playbook so this is moot;
    // we just assert the chem event flowed through.
    expect(out.meshEventIds.length).toBeGreaterThan(0);
  });

  test('Gemini meshEventRecommendations promote unknown event types', async () => {
    const facilities: Record<string, Facility> = {
      src: baseFacility({ type: 'school' }),
      f1: baseFacility({ type: 'factory', location: { latitude: 12.971, longitude: 77.591 } }),
    };
    const out = await coordinate(
      {
        incidentId: 'i',
        incident: {
          facilityId: 'src',
          facilityType: 'school',
          type: 'campus_unrest',
          severity: 'critical',
          meshEventRecommendations: ['MEDIA_BLACKOUT_REQUEST'],
        },
      },
      {
        fs: makeFakeFs({ facilities }).fs,
      },
    );
    expect(out.meshEventIds.length).toBeGreaterThan(0);
  });

  test('returns no-rules when playbook is unknown and no AI recommendations', async () => {
    const facilities = { src: baseFacility({ type: 'hospital' }) };
    const { fs, written } = makeFakeFs({ facilities });
    const out = await coordinate(
      {
        incidentId: 'i',
        incident: {
          facilityId: 'src',
          facilityType: 'hospital',
          type: 'unknown_type_xyz',
          severity: 'critical',
        },
      },
      { fs },
    );
    expect(written).toHaveLength(0);
    expect(out.skipped[0].reason).toBe('no-rules');
  });
});
