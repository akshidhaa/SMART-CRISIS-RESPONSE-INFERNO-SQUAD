// Browser-side grand finale cascade runner.
// Writes mesh events + incidents to Firestore in timed sequence so the
// /admin/mesh/live dashboard animates arcs in real-time as events publish.

import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type CascadePhase =
  | 'idle'
  | 'running'
  | 'done'
  | 'error';

export interface CascadeProgress {
  phase: CascadePhase;
  step: string;
  hopCount: number;
  eventCount: number;
  notificationCount: number;
  elapsedMs: number;
  error?: string;
}

type ProgressCallback = (p: CascadeProgress) => void;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function createIncident(params: {
  facilityId: string;
  facilityType: string;
  type: string;
  severity: string;
  zone: string;
  description: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'incidents'), {
    ...params,
    status: 'reported',
    reporterId: 'demo_cascade',
    reporterRole: 'admin',
    location: { zone: params.zone, floor: '1' },
    assignedStaff: [],
    meshEventsFired: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

async function publishMeshEvent(params: {
  sourceFacilityId: string;
  sourceFacilityType: string;
  sourceIncidentId: string;
  eventType: string;
  payload: Record<string, unknown>;
  targetFacilityTypes: string[];
  radiusKm: number;
  affectedFacilityIds: string[];
}): Promise<string> {
  const now = new Date();
  const ref = await addDoc(collection(db, 'meshEvents'), {
    ...params,
    status: 'published',
    publishedAt: now,
    expiresAt: new Date(now.getTime() + 3_600_000),
  });
  return ref.id;
}

// ─── Grand Finale: Factory Fire → Hospital → Hotel (3 hops, all 5 facilities) ──

export async function runGrandFinale(onProgress: ProgressCallback): Promise<void> {
  const startMs = Date.now();
  let hopCount = 0;
  let eventCount = 0;
  let notificationCount = 0;

  function report(step: string, notifs = 0) {
    notificationCount += notifs;
    onProgress({
      phase: 'running',
      step,
      hopCount,
      eventCount,
      notificationCount,
      elapsedMs: Date.now() - startMs,
    });
  }

  try {
    // ── T+0: Factory fire ─────────────────────────────────────────────────
    report('Apex Manufacturing: FIRE detected — Floor 1 + Floor 2 engulfed');
    const factoryIncidentId = await createIncident({
      facilityId: 'apex_manufacturing',
      facilityType: 'factory',
      type: 'fire',
      severity: 'critical',
      zone: 'Floor 1',
      description:
        'Electrical fire on Floor 1 spread to Floor 2. Chemical Store at risk. 42 workers evacuating.',
    });
    await sleep(2000);

    // ── T+4s HOP 0→1: Factory → Hospital ─────────────────────────────────
    hopCount = 1;
    report('HOP 0→1 — Factory → Hospital: PREPARE_BURN_UNIT', 12);
    const evt1 = await publishMeshEvent({
      sourceFacilityId: 'apex_manufacturing',
      sourceFacilityType: 'factory',
      sourceIncidentId: factoryIncidentId,
      eventType: 'PREPARE_BURN_UNIT',
      payload: { workerCount: 42, expectedBurns: 8, detail: 'Stage burn ICU + 3 decon stations at ER.' },
      targetFacilityTypes: ['hospital'],
      radiusKm: 5,
      affectedFacilityIds: ['city_gen_hosp'],
    });
    eventCount++;
    await sleep(2500);

    // ── T+7s HOP 0→1: Factory → School ───────────────────────────────────
    report('HOP 0→1 — Factory → School: SHELTER_IN_PLACE', 362);
    const evt2 = await publishMeshEvent({
      sourceFacilityId: 'apex_manufacturing',
      sourceFacilityType: 'factory',
      sourceIncidentId: factoryIncidentId,
      eventType: 'SHELTER_IN_PLACE',
      payload: { smokeType: 'acrid / solvent', windDir: 'NE', detail: 'Close all windows. Do NOT evacuate outdoors.' },
      targetFacilityTypes: ['school'],
      radiusKm: 3,
      affectedFacilityIds: ['lincoln_high'],
    });
    eventCount++;
    await sleep(2500);

    // ── T+10s HOP 0→1: Factory → College ─────────────────────────────────
    report('HOP 0→1 — Factory → College: EVACUATE_DOWNWIND', 120);
    const evt3 = await publishMeshEvent({
      sourceFacilityId: 'apex_manufacturing',
      sourceFacilityType: 'factory',
      sourceIncidentId: factoryIncidentId,
      eventType: 'EVACUATE_DOWNWIND',
      payload: { affectedBlocks: ['Hostel B', 'Lab'], evacuateTo: 'Sports Ground (upwind)' },
      targetFacilityTypes: ['college'],
      radiusKm: 5,
      affectedFacilityIds: ['state_university'],
    });
    eventCount++;
    await sleep(2500);

    // ── T+13s HOP 0→1: Factory → Hotel ───────────────────────────────────
    report('HOP 0→1 — Factory → Hotel: EVACUATE_WINDWARD_SIDE', 47);
    const evt4 = await publishMeshEvent({
      sourceFacilityId: 'apex_manufacturing',
      sourceFacilityType: 'factory',
      sourceIncidentId: factoryIncidentId,
      eventType: 'EVACUATE_WINDWARD_SIDE',
      payload: { windwardFace: 'NE', evacuateFloors: [2, 3], safeZone: 'Lobby / Parking' },
      targetFacilityTypes: ['hotel'],
      radiusKm: 5,
      affectedFacilityIds: ['grand_horizon'],
    });
    eventCount++;
    await sleep(3000);

    // ── T+16s: Hospital activates mass casualty ───────────────────────────
    report('City General Hospital activates MASS CASUALTY PROTOCOL');
    const hospitalIncidentId = await createIncident({
      facilityId: 'city_gen_hosp',
      facilityType: 'hospital',
      type: 'mass_casualty',
      severity: 'critical',
      zone: 'ER',
      description:
        'Mass casualty from Apex Manufacturing fire. 23 burn + smoke inhalation patients incoming.',
    });
    await sleep(2000);

    // ── T+20s HOP 1→2: Hospital → Hotel ──────────────────────────────────
    hopCount = 2;
    report('HOP 1→2 — Hospital → Hotel: PREPARE_FAMILY_ACCOMMODATION', 3);
    const evt5 = await publishMeshEvent({
      sourceFacilityId: 'city_gen_hosp',
      sourceFacilityType: 'hospital',
      sourceIncidentId: hospitalIncidentId,
      eventType: 'PREPARE_FAMILY_ACCOMMODATION',
      payload: { patientCount: 23, expectedFamilyMembers: 55, detail: 'Reserve ground-floor corridor rooms.' },
      targetFacilityTypes: ['hotel'],
      radiusKm: 5,
      affectedFacilityIds: ['grand_horizon'],
    });
    eventCount++;
    await sleep(2500);

    // ── T+23s HOP 1→2: Hospital → College + School ───────────────────────
    report('HOP 1→2 — Hospital → College + School: BLOOD_DONATION_NEEDED', 288);
    const evt6 = await publishMeshEvent({
      sourceFacilityId: 'city_gen_hosp',
      sourceFacilityType: 'hospital',
      sourceIncidentId: hospitalIncidentId,
      eventType: 'BLOOD_DONATION_NEEDED',
      payload: { bloodType: 'O-negative', unitsNeeded: 40, urgencyHours: 2 },
      targetFacilityTypes: ['college', 'school'],
      radiusKm: 10,
      affectedFacilityIds: ['state_university', 'lincoln_high'],
    });
    eventCount++;
    await sleep(3000);

    // ── T+28s: Hotel upper-floor smoke evacuation ─────────────────────────
    report('Grand Horizon Hotel: UPPER FLOOR EVACUATION initiated');
    const hotelIncidentId = await createIncident({
      facilityId: 'grand_horizon',
      facilityType: 'hotel',
      type: 'fire',
      severity: 'medium',
      zone: 'Floor 3',
      description: 'Smoke ingress on Floor 3 (NE face). Precautionary evacuation of 47 guests.',
    });
    await sleep(2000);

    // ── T+30s HOP 2→3: Hotel → Factory + School + College ─────────────────
    hopCount = 3;
    report('HOP 2→3 — Hotel → Factory + School + College: TRAFFIC_DIVERSION', 12);
    const evt7 = await publishMeshEvent({
      sourceFacilityId: 'grand_horizon',
      sourceFacilityType: 'hotel',
      sourceIncidentId: hotelIncidentId,
      eventType: 'TRAFFIC_DIVERSION',
      payload: { closedRoads: ['Main St', 'Park Ave', 'Elm Blvd'], detourRoute: 'Riverside Dr → Industrial Bypass' },
      targetFacilityTypes: ['factory', 'school', 'college'],
      radiusKm: 3,
      affectedFacilityIds: ['apex_manufacturing', 'lincoln_high', 'state_university'],
    });
    eventCount++;
    await sleep(2500);

    // ── T+40s: Acknowledge all incidents ─────────────────────────────────
    report('Acknowledging all incidents across 5 facilities…');
    await Promise.all([
      updateDoc(doc(db, 'incidents', factoryIncidentId), { status: 'acknowledged', acknowledgedAt: new Date() }),
      updateDoc(doc(db, 'incidents', hospitalIncidentId), { status: 'acknowledged', acknowledgedAt: new Date() }),
      updateDoc(doc(db, 'incidents', hotelIncidentId), { status: 'acknowledged', acknowledgedAt: new Date() }),
    ]);
    await sleep(2000);

    // ── T+45s: Acknowledge all mesh events ───────────────────────────────
    report('Acknowledging all 7 mesh events…');
    await Promise.all(
      [evt1, evt2, evt3, evt4, evt5, evt6, evt7].map((id) =>
        updateDoc(doc(db, 'meshEvents', id), { status: 'acknowledged' }),
      ),
    );
    await sleep(1000);

    // Done
    onProgress({
      phase: 'done',
      step: 'Cascade complete — all 5 facilities coordinated',
      hopCount: 3,
      eventCount,
      notificationCount,
      elapsedMs: Date.now() - startMs,
    });
  } catch (err) {
    onProgress({
      phase: 'error',
      step: 'Cascade failed',
      hopCount,
      eventCount,
      notificationCount,
      elapsedMs: Date.now() - startMs,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
