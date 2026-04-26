/**
 * SCR-Mesh Phase 5.1 — Multi-Facility Demo Scenarios
 *
 * Usage (tsx loads env automatically via --env-file):
 *   tsx --env-file apps/web-admin/.env.local scripts/trigger-demo-scenarios.ts
 *   tsx --env-file apps/web-admin/.env.local scripts/trigger-demo-scenarios.ts --scenario=1
 *   tsx --env-file apps/web-admin/.env.local scripts/trigger-demo-scenarios.ts --scenario=2
 *   tsx --env-file apps/web-admin/.env.local scripts/trigger-demo-scenarios.ts --scenario=3
 *   tsx --env-file apps/web-admin/.env.local scripts/trigger-demo-scenarios.ts --scenario=4
 *   tsx --env-file apps/web-admin/.env.local scripts/trigger-demo-scenarios.ts --scenario=5
 *   tsx --env-file apps/web-admin/.env.local scripts/trigger-demo-scenarios.ts --scenario=finale
 *
 * Env vars required (from apps/web-admin/.env.local):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// ─── ANSI colours ────────────────────────────────────────────────────────────
const R = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const GRAY = '\x1b[90m';
const BG_RED = '\x1b[41m';
const BG_YELLOW = '\x1b[43m';

const FACILITY_COLOR: Record<string, string> = {
  hospital: RED,
  hotel: YELLOW,
  school: BLUE,
  college: MAGENTA,
  factory: CYAN,
};

// ─── Firebase init ────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'scr-mesh-dev.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'scr-mesh-dev',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let _startMs = Date.now();
function ts(): string {
  const elapsed = ((Date.now() - _startMs) / 1000).toFixed(1);
  return `${GRAY}[T+${elapsed.padStart(5)}s]${R}`;
}

function banner(title: string, color: string = BOLD) {
  const line = '═'.repeat(60);
  console.log(`\n${color}${line}`);
  console.log(`  ${title}`);
  console.log(`${line}${R}\n`);
}

function log(msg: string) {
  console.log(`${ts()} ${msg}`);
}

function logHop(from: string, to: string, hopNum: string, eventType: string, detail: string) {
  const arrow = `${BOLD}${GREEN}──▶${R}`;
  console.log(
    `${ts()} ${BOLD}[HOP ${hopNum}]${R} ${from} ${arrow} ${to}`,
  );
  console.log(`         ${CYAN}${eventType}${R}  ${DIM}${detail}${R}`);
}

function logNotifications(facility: string, count: number, role: string) {
  log(
    `${GREEN}✉  ${count} notification${count !== 1 ? 's' : ''} dispatched${R} → ${FACILITY_COLOR[facility] ?? ''}${facility}${R} [${role}]`,
  );
}

function logIncident(facilityId: string, type: string, severity: string, zone: string) {
  const sevColor = severity === 'critical' ? RED : severity === 'high' ? YELLOW : BLUE;
  log(
    `${BG_RED}${WHITE} INCIDENT ${R} ${FACILITY_COLOR[facilityId] ?? ''}${facilityId}${R} → ` +
      `${BOLD}${type}${R}  ${sevColor}[${severity.toUpperCase()}]${R}  zone: ${zone}`,
  );
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
  hopOffsetMs?: number;
}): Promise<string> {
  const { hopOffsetMs = 0, ...rest } = params;
  const publishedAt = new Date(Date.now() + hopOffsetMs);
  const ref = await addDoc(collection(db, 'meshEvents'), {
    ...rest,
    status: 'published',
    publishedAt,
    expiresAt: new Date(publishedAt.getTime() + 3_600_000),
  });
  return ref.id;
}

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

// ─── Facility registry ────────────────────────────────────────────────────────

const FACILITIES = {
  city_gen_hosp: { name: 'City General Hospital', type: 'hospital', color: RED },
  grand_horizon: { name: 'Grand Horizon Hotel', type: 'hotel', color: YELLOW },
  lincoln_high: { name: 'Lincoln High School', type: 'school', color: BLUE },
  state_university: { name: 'State University', type: 'college', color: MAGENTA },
  apex_manufacturing: { name: 'Apex Manufacturing', type: 'factory', color: CYAN },
} as const;

type FacilityKey = keyof typeof FACILITIES;

function fname(id: FacilityKey | string): string {
  const f = FACILITIES[id as FacilityKey];
  return f ? `${f.color}${f.name}${R}` : id;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 1 — Hospital: Mass Casualty Incoming
// ═══════════════════════════════════════════════════════════════════════════════

async function scenario1_hospital() {
  _startMs = Date.now();
  banner(`SCENARIO 1  Hospital — Mass Casualty Incoming`, `${RED}${BOLD}`);

  log(`${fname('city_gen_hosp')} reports ${BOLD}MASS CASUALTY INCOMING${R} — multi-vehicle pile-up on Highway 1`);
  await sleep(1000);

  const incidentId = await createIncident({
    facilityId: 'city_gen_hosp',
    facilityType: 'hospital',
    type: 'mass_casualty',
    severity: 'critical',
    zone: 'ER',
    description: 'Multi-vehicle collision — 23 casualties incoming. Trauma bays at capacity.',
  });
  logIncident('city_gen_hosp', 'mass_casualty', 'critical', 'ER');
  await sleep(2000);

  // Hop 0→1: hospital → hotel (family accommodation)
  logHop(fname('city_gen_hosp'), fname('grand_horizon'), '0→1', 'PREPARE_FAMILY_ACCOMMODATION',
    '23 patient families need rooms — reserve floors 1–2');
  await publishMeshEvent({
    sourceFacilityId: 'city_gen_hosp',
    sourceFacilityType: 'hospital',
    sourceIncidentId: incidentId,
    eventType: 'PREPARE_FAMILY_ACCOMMODATION',
    payload: { patientCount: 23, detail: 'Multi-vehicle collision. Reserve ground-floor family rooms.' },
    targetFacilityTypes: ['hotel'],
    radiusKm: 5,
    affectedFacilityIds: ['grand_horizon'],
  });
  logNotifications('grand_horizon', 3, 'front_desk + manager');
  await sleep(2500);

  // Hop 0→1: hospital → school + college + factory (blood donation)
  logHop(fname('city_gen_hosp'), `${fname('lincoln_high')} + ${fname('state_university')} + ${fname('apex_manufacturing')}`,
    '0→1', 'BLOOD_DONATION_NEEDED', 'O-negative critical — community appeal');
  await publishMeshEvent({
    sourceFacilityId: 'city_gen_hosp',
    sourceFacilityType: 'hospital',
    sourceIncidentId: incidentId,
    eventType: 'BLOOD_DONATION_NEEDED',
    payload: { bloodType: 'O-negative', unitsNeeded: 40, detail: 'Community blood drive requested urgently.' },
    targetFacilityTypes: ['school', 'college', 'factory'],
    radiusKm: 10,
    affectedFacilityIds: ['lincoln_high', 'state_university', 'apex_manufacturing'],
  });
  logNotifications('lincoln_high', 8, 'teachers + office');
  logNotifications('state_university', 22, 'staff + faculty');
  logNotifications('apex_manufacturing', 5, 'supervisors');
  await sleep(2500);

  // Hop 1→2 (secondary): Hotel notifies guests
  logHop(fname('grand_horizon'), '45 hotel guests', '1→2', 'INTERNAL_GUEST_ADVISORY',
    'Consolidate to lower floors — family check-in in progress');
  logNotifications('grand_horizon', 45, 'guests via in_app');
  await sleep(2000);

  log(`${GREEN}${BOLD}✓ Scenario 1 complete${R} | Elapsed: ${((Date.now() - _startMs) / 1000).toFixed(1)}s`);
  log(`  Mesh events fired: 2 | Hops: 2 | Notifications: 83`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 2 — Hotel: Kitchen Fire + Upper-Floor Evacuation
// ═══════════════════════════════════════════════════════════════════════════════

async function scenario2_hotel() {
  _startMs = Date.now();
  banner(`SCENARIO 2  Hotel — Kitchen Fire`, `${YELLOW}${BOLD}`);

  log(`${fname('grand_horizon')} reports ${BOLD}FIRE${R} — Kitchen, Floor 3. Sprinklers active.`);
  await sleep(1000);

  const incidentId = await createIncident({
    facilityId: 'grand_horizon',
    facilityType: 'hotel',
    type: 'fire',
    severity: 'critical',
    zone: 'Kitchen',
    description: 'Grease fire in kitchen — spread to Floor 3 corridor. 120 guests on upper floors.',
  });
  logIncident('grand_horizon', 'fire', 'critical', 'Kitchen / Floor 3');
  await sleep(2000);

  // Hop 0→1: hotel → hospital (trauma teams)
  logHop(fname('grand_horizon'), fname('city_gen_hosp'), '0→1', 'PREPARE_TRAUMA_TEAMS',
    'Smoke inhalation + burns expected — 120 guests on upper floors');
  await publishMeshEvent({
    sourceFacilityId: 'grand_horizon',
    sourceFacilityType: 'hotel',
    sourceIncidentId: incidentId,
    eventType: 'PREPARE_TRAUMA_TEAMS',
    payload: { estimatedCasualties: 12, detail: 'Smoke inhalation + possible burns. ETA 8 min.' },
    targetFacilityTypes: ['hospital'],
    radiusKm: 5,
    affectedFacilityIds: ['city_gen_hosp'],
  });
  logNotifications('city_gen_hosp', 12, 'trauma staff paged');
  await sleep(2500);

  // Hop 0→1: hotel → school + factory (traffic diversion)
  logHop(fname('grand_horizon'), `${fname('lincoln_high')} + ${fname('apex_manufacturing')}`,
    '0→1', 'TRAFFIC_DIVERSION', 'Main St blocked by fire trucks — reroute expected');
  await publishMeshEvent({
    sourceFacilityId: 'grand_horizon',
    sourceFacilityType: 'hotel',
    sourceIncidentId: incidentId,
    eventType: 'TRAFFIC_DIVERSION',
    payload: { blockedStreets: ['Main St', 'Elm Ave'], detail: 'Perimeter set — expect 45 min closure.' },
    targetFacilityTypes: ['school', 'factory'],
    radiusKm: 3,
    affectedFacilityIds: ['lincoln_high', 'apex_manufacturing'],
  });
  logNotifications('lincoln_high', 4, 'bus coordinators');
  logNotifications('apex_manufacturing', 3, 'delivery supervisors');
  await sleep(2500);

  // Hop 1→2: Hospital activates trauma bays
  logHop(fname('city_gen_hosp'), 'Trauma Bay A + B', '1→2', 'INTERNAL_TRAUMA_ACTIVATION',
    '4 bays opened, 3 surgeons on standby');
  logNotifications('city_gen_hosp', 8, 'ER + surgical staff');
  await sleep(2000);

  // Hop 1→2: Factory reroutes vehicles
  logHop(fname('apex_manufacturing'), 'Logistics fleet', '1→2', 'INTERNAL_REROUTE',
    '3 delivery vehicles rerouted via Riverside Dr');
  logNotifications('apex_manufacturing', 3, 'drivers');
  await sleep(1500);

  log(`${GREEN}${BOLD}✓ Scenario 2 complete${R} | Elapsed: ${((Date.now() - _startMs) / 1000).toFixed(1)}s`);
  log(`  Mesh events fired: 2 | Hops: 2 | Notifications: 30`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 3 — School: Lockdown + Perimeter Securing
// ═══════════════════════════════════════════════════════════════════════════════

async function scenario3_school() {
  _startMs = Date.now();
  banner(`SCENARIO 3  School — Active Threat Lockdown`, `${BLUE}${BOLD}`);

  log(`${fname('lincoln_high')} initiates ${BOLD}LOCKDOWN${R} — active threat reported near Assembly Hall`);
  await sleep(1000);

  const incidentId = await createIncident({
    facilityId: 'lincoln_high',
    facilityType: 'school',
    type: 'lockdown',
    severity: 'critical',
    zone: 'Assembly Hall',
    description: 'Armed individual reported near Assembly Hall. 340 students + 22 staff in lockdown.',
  });
  logIncident('lincoln_high', 'lockdown', 'critical', 'Assembly Hall');
  await sleep(2000);

  // Hop 0→1: school → college + hospital + hotel (lockdown nearby)
  logHop(fname('lincoln_high'),
    `${fname('state_university')} + ${fname('city_gen_hosp')} + ${fname('grand_horizon')}`,
    '0→1', 'LOCKDOWN_NEARBY', 'Active threat — restrict entry/exit immediately');
  await publishMeshEvent({
    sourceFacilityId: 'lincoln_high',
    sourceFacilityType: 'school',
    sourceIncidentId: incidentId,
    eventType: 'LOCKDOWN_NEARBY',
    payload: { threatType: 'armed_individual', detail: 'Lock all perimeter gates. Police en route.' },
    targetFacilityTypes: ['college', 'hospital', 'hotel'],
    radiusKm: 3,
    affectedFacilityIds: ['state_university', 'city_gen_hosp', 'grand_horizon'],
  });
  logNotifications('state_university', 30, 'security + wardens');
  logNotifications('city_gen_hosp', 6, 'security staff');
  logNotifications('grand_horizon', 4, 'front desk + security');
  await sleep(2500);

  // Hop 0→1: school → factory (secure perimeter)
  logHop(fname('lincoln_high'), fname('apex_manufacturing'), '0→1', 'SECURE_PERIMETER',
    'Restrict gate access — possible threat movement toward industrial area');
  await publishMeshEvent({
    sourceFacilityId: 'lincoln_high',
    sourceFacilityType: 'school',
    sourceIncidentId: incidentId,
    eventType: 'SECURE_PERIMETER',
    payload: { detail: 'Restrict all non-essential vehicle entry. ID check mandatory.' },
    targetFacilityTypes: ['factory'],
    radiusKm: 2,
    affectedFacilityIds: ['apex_manufacturing'],
  });
  logNotifications('apex_manufacturing', 5, 'gate security');
  await sleep(2500);

  // Hop 1→2 (secondary): College locks hostel gates
  logHop(fname('state_university'), '6 hostel blocks', '1→2', 'INTERNAL_HOSTEL_LOCKDOWN',
    'Hostel A + B sealed — 280 students sheltering in place');
  logNotifications('state_university', 125, 'students via push notification');
  await sleep(2000);

  log(`${GREEN}${BOLD}✓ Scenario 3 complete${R} | Elapsed: ${((Date.now() - _startMs) / 1000).toFixed(1)}s`);
  log(`  Mesh events fired: 2 | Hops: 2 | Notifications: 170`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 4 — College: Lab Explosion + Chemical Exposure Response
// ═══════════════════════════════════════════════════════════════════════════════

async function scenario4_college() {
  _startMs = Date.now();
  banner(`SCENARIO 4  College — Lab Explosion`, `${MAGENTA}${BOLD}`);

  log(`${fname('state_university')} reports ${BOLD}LAB EXPLOSION${R} — Chemical Lab, 3 students injured, gas leak active`);
  await sleep(1000);

  const incidentId = await createIncident({
    facilityId: 'state_university',
    facilityType: 'college',
    type: 'fire',
    severity: 'high',
    zone: 'Lab',
    description: 'Gas explosion in Chemical Lab. 3 students with burns. Solvent fire spreading.',
  });
  logIncident('state_university', 'fire', 'high', 'Lab (chemical)');
  await sleep(2000);

  // Hop 0→1: college → hospital (burn unit + trauma)
  logHop(fname('state_university'), fname('city_gen_hosp'), '0→1',
    'PREPARE_BURN_UNIT + PREPARE_TRAUMA_TEAMS',
    '3 burn casualties incoming — solvent fire involvement');
  await publishMeshEvent({
    sourceFacilityId: 'state_university',
    sourceFacilityType: 'college',
    sourceIncidentId: incidentId,
    eventType: 'PREPARE_BURN_UNIT',
    payload: { casualties: 3, burnsPercent: '15–40%', chemicalExposure: true, detail: 'Solvent burns + inhalation.' },
    targetFacilityTypes: ['hospital'],
    radiusKm: 5,
    affectedFacilityIds: ['city_gen_hosp'],
  });
  logNotifications('city_gen_hosp', 8, 'burn specialists + ER');
  await sleep(2500);

  // Hop 0→1: college → hotel + school (evacuate downwind)
  logHop(fname('state_university'), `${fname('grand_horizon')} + ${fname('lincoln_high')}`,
    '0→1', 'EVACUATE_DOWNWIND', 'Chemical smoke plume — evacuate windward face');
  await publishMeshEvent({
    sourceFacilityId: 'state_university',
    sourceFacilityType: 'college',
    sourceIncidentId: incidentId,
    eventType: 'EVACUATE_WINDWARD_SIDE',
    payload: { windDirection: 'SW', evacuateFloors: ['2', '3'], detail: 'Solvent vapour drifting NE. Clear windward rooms.' },
    targetFacilityTypes: ['hotel', 'school'],
    radiusKm: 4,
    affectedFacilityIds: ['grand_horizon', 'lincoln_high'],
  });
  logNotifications('grand_horizon', 36, 'guests on floors 2–3');
  logNotifications('lincoln_high', 12, 'classes in north wing');
  await sleep(2500);

  // Hop 1→2: Hospital burn protocol activated
  logHop(fname('city_gen_hosp'), 'Burn ICU (Bed 1–4)', '1→2', 'INTERNAL_BURN_PROTOCOL',
    '4 burn beds prepped — skin graft surgeon en route');
  logNotifications('city_gen_hosp', 8, 'surgical + ICU staff');
  await sleep(2000);

  // Hop 1→2: Hotel room evacuation
  logHop(fname('grand_horizon'), 'Rooms 201–336', '1→2', 'INTERNAL_ROOM_EVACUATION',
    '36 guests escorted to lobby — precautionary air quality measure');
  logNotifications('grand_horizon', 36, 'guests via room phone + app');
  await sleep(1500);

  log(`${GREEN}${BOLD}✓ Scenario 4 complete${R} | Elapsed: ${((Date.now() - _startMs) / 1000).toFixed(1)}s`);
  log(`  Mesh events fired: 2 | Hops: 2 | Notifications: 100`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 5 — Factory: Chemical Spill + Downwind Community Alert
// ═══════════════════════════════════════════════════════════════════════════════

async function scenario5_factory() {
  _startMs = Date.now();
  banner(`SCENARIO 5  Factory — Chemical Spill (Chlorine)`, `${CYAN}${BOLD}`);

  log(`${fname('apex_manufacturing')} reports ${BOLD}CHEMICAL SPILL${R} — Chemical Store, chlorine gas release`);
  await sleep(1000);

  const incidentId = await createIncident({
    facilityId: 'apex_manufacturing',
    facilityType: 'factory',
    type: 'chemical_spill',
    severity: 'critical',
    zone: 'Chemical Store',
    description: 'Chlorine tank ruptured. Toxic plume forming. Wind speed 18 km/h NE. Area evacuated.',
  });
  logIncident('apex_manufacturing', 'chemical_spill', 'critical', 'Chemical Store');
  await sleep(2000);

  // Hop 0→1: factory → school (shelter in place — 600m downwind)
  logHop(fname('apex_manufacturing'), fname('lincoln_high'), '0→1', 'SHELTER_IN_PLACE',
    '600m downwind — seal HVAC, shelter in classrooms immediately');
  await publishMeshEvent({
    sourceFacilityId: 'apex_manufacturing',
    sourceFacilityType: 'factory',
    sourceIncidentId: incidentId,
    eventType: 'SHELTER_IN_PLACE',
    payload: { chemical: 'Chlorine', plumePpm: 4.2, windDir: 'NE', detail: 'Seal all windows. Do not evacuate outdoors.' },
    targetFacilityTypes: ['school'],
    radiusKm: 2,
    affectedFacilityIds: ['lincoln_high'],
  });
  logNotifications('lincoln_high', 22, 'teachers via push + PA system');
  await sleep(2000);

  // Hop 0→1: factory → hospital (HAZMAT protocol)
  logHop(fname('apex_manufacturing'), fname('city_gen_hosp'), '0→1',
    'PREPARE_CHEMICAL_EXPOSURE_PROTOCOL',
    'Chlorine — decontamination tents + respiratory ER standby');
  await publishMeshEvent({
    sourceFacilityId: 'apex_manufacturing',
    sourceFacilityType: 'factory',
    sourceIncidentId: incidentId,
    eventType: 'PREPARE_CHEMICAL_EXPOSURE_PROTOCOL',
    payload: { agent: 'Chlorine (Cl₂)', estimatedExposed: 45, antidote: 'Sodium Thiosulfate', detail: 'Stage decon outside ER.' },
    targetFacilityTypes: ['hospital'],
    radiusKm: 5,
    affectedFacilityIds: ['city_gen_hosp'],
  });
  logNotifications('city_gen_hosp', 15, 'HAZMAT + ER staff');
  await sleep(2500);

  // Hop 0→1: factory → college + hotel (evacuate downwind)
  logHop(fname('apex_manufacturing'),
    `${fname('state_university')} + ${fname('grand_horizon')}`,
    '0→1', 'EVACUATE_DOWNWIND', 'Plume accelerating — 2km radius evacuate now');
  await publishMeshEvent({
    sourceFacilityId: 'apex_manufacturing',
    sourceFacilityType: 'factory',
    sourceIncidentId: incidentId,
    eventType: 'EVACUATE_DOWNWIND',
    payload: { chemical: 'Chlorine', radiusKm: 2, windSpeed: '18 km/h NE', detail: 'Immediate evacuation via south corridor only.' },
    targetFacilityTypes: ['college', 'hotel'],
    radiusKm: 5,
    affectedFacilityIds: ['state_university', 'grand_horizon'],
  });
  logNotifications('state_university', 180, 'students + staff via push');
  logNotifications('grand_horizon', 78, 'all guests + staff');
  await sleep(2500);

  // Hop 1→2: Hospital deploys decon tents
  logHop(fname('city_gen_hosp'), 'ER Forecourt', '1→2', 'INTERNAL_DECON_SETUP',
    '2 decontamination tents erected — 15 HAZMAT-trained nurses on-site');
  logNotifications('city_gen_hosp', 15, 'hazmat + respiratory team');
  await sleep(2000);

  log(`${GREEN}${BOLD}✓ Scenario 5 complete${R} | Elapsed: ${((Date.now() - _startMs) / 1000).toFixed(1)}s`);
  log(`  Mesh events fired: 3 | Hops: 2 | Notifications: 310`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GRAND FINALE — Community Cascade
//  Factory Fire → Hospital Mass Casualty → Hotel Upper-Floor Evacuation
//  Target: ≤ 60 seconds simulated time, 7 mesh events, 3 hops, all 5 facilities
// ═══════════════════════════════════════════════════════════════════════════════

async function scenarioFinale() {
  _startMs = Date.now();

  const divider = `${BOLD}${'▓'.repeat(62)}${R}`;
  console.log(`\n${divider}`);
  console.log(`${BG_RED}${WHITE}${BOLD}                                                              ${R}`);
  console.log(`${BG_RED}${WHITE}${BOLD}   ★  SCR-MESH  COMMUNITY CASCADE  GRAND FINALE  ★           ${R}`);
  console.log(`${BG_RED}${WHITE}${BOLD}   Factory Fire → Hospital → Hotel  (3 hops, <60 s)          ${R}`);
  console.log(`${BG_RED}${WHITE}${BOLD}                                                              ${R}`);
  console.log(`${divider}\n`);

  log(`${BOLD}Pair with ${CYAN}http://localhost:3000/admin/mesh/live${R}${BOLD} for the visual cascade.${R}`);
  log(`${GRAY}Events will appear as animated arcs in real-time as this script runs.${R}`);
  await sleep(2000);

  // ── T+0: Factory fire ignites ────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}── T+0s  APEX MANUFACTURING — FIRE ───────────────────────────────${R}`);
  log(`${fname('apex_manufacturing')} ${BOLD}${RED}FIRE DETECTED${R} — Floor 1 + Floor 2 engulfed. Control Room isolated.`);
  log(`${DIM}Thermal sensor triggered at junction box B7. Suppression system offline.${R}`);
  await sleep(1500);

  const factoryIncidentId = await createIncident({
    facilityId: 'apex_manufacturing',
    facilityType: 'factory',
    type: 'fire',
    severity: 'critical',
    zone: 'Floor 1',
    description:
      'Electrical fire on Floor 1 spread to Floor 2. Chemical Store at risk. 42 workers evacuating via Loading Dock.',
  });
  logIncident('apex_manufacturing', 'fire', 'critical', 'Floor 1 + Floor 2');
  await sleep(2000);

  // ── T+4s: HOP 0→1  Factory → Hospital ───────────────────────────────────
  console.log(`\n${RED}${BOLD}── T+4s  HOP 0→1 ─────────────────────────────────────────────────${R}`);
  logHop(fname('apex_manufacturing'), fname('city_gen_hosp'), '0→1',
    'PREPARE_BURN_UNIT + PREPARE_TRAUMA_TEAMS',
    '42 workers evacuating — burns + smoke inhalation expected');
  const evt1 = await publishMeshEvent({
    sourceFacilityId: 'apex_manufacturing',
    sourceFacilityType: 'factory',
    sourceIncidentId: factoryIncidentId,
    eventType: 'PREPARE_BURN_UNIT',
    payload: {
      workerCount: 42,
      expectedBurns: 8,
      chemicalRisk: 'solvent fumes',
      detail: 'Stage burn ICU + 3 decon stations at ER forecourt.',
    },
    targetFacilityTypes: ['hospital'],
    radiusKm: 5,
    affectedFacilityIds: ['city_gen_hosp'],
  });
  logNotifications('city_gen_hosp', 12, 'burn ICU + ER staff');
  await sleep(2500);

  // ── T+7s: HOP 0→1  Factory → School ─────────────────────────────────────
  console.log(`\n${BLUE}${BOLD}── T+7s  HOP 0→1 ─────────────────────────────────────────────────${R}`);
  logHop(fname('apex_manufacturing'), fname('lincoln_high'), '0→1',
    'SHELTER_IN_PLACE', 'Toxic smoke advisory — seal HVAC, 340 students stay inside');
  const evt2 = await publishMeshEvent({
    sourceFacilityId: 'apex_manufacturing',
    sourceFacilityType: 'factory',
    sourceIncidentId: factoryIncidentId,
    eventType: 'SHELTER_IN_PLACE',
    payload: {
      smokeType: 'acrid / solvent',
      windDir: 'NE',
      detail: 'Close all windows. Do NOT evacuate to Playground — wind is from SW.',
    },
    targetFacilityTypes: ['school'],
    radiusKm: 3,
    affectedFacilityIds: ['lincoln_high'],
  });
  logNotifications('lincoln_high', 22, 'all teachers via SMS + app push');
  logNotifications('lincoln_high', 340, 'students via parent alert broadcast');
  await sleep(2500);

  // ── T+10s: HOP 0→1  Factory → College ───────────────────────────────────
  console.log(`\n${MAGENTA}${BOLD}── T+10s  HOP 0→1 ────────────────────────────────────────────────${R}`);
  logHop(fname('apex_manufacturing'), fname('state_university'), '0→1',
    'EVACUATE_DOWNWIND', 'Plume moving NE — evacuate Hostel B + Sports Ground side');
  const evt3 = await publishMeshEvent({
    sourceFacilityId: 'apex_manufacturing',
    sourceFacilityType: 'factory',
    sourceIncidentId: factoryIncidentId,
    eventType: 'EVACUATE_DOWNWIND',
    payload: {
      affectedBlocks: ['Hostel B', 'Lab'],
      evacuateTo: 'Sports Ground (upwind)',
      detail: 'Use south exit only. Lecture Hall staff coordinate.',
    },
    targetFacilityTypes: ['college'],
    radiusKm: 5,
    affectedFacilityIds: ['state_university'],
  });
  logNotifications('state_university', 120, 'students in Hostel B + Lab');
  await sleep(2500);

  // ── T+13s: HOP 0→1  Factory → Hotel ─────────────────────────────────────
  console.log(`\n${YELLOW}${BOLD}── T+13s  HOP 0→1 ────────────────────────────────────────────────${R}`);
  logHop(fname('apex_manufacturing'), fname('grand_horizon'), '0→1',
    'EVACUATE_WINDWARD_SIDE', 'Evacuate rooms on NE face — smoke advisory for floors 2–3');
  const evt4 = await publishMeshEvent({
    sourceFacilityId: 'apex_manufacturing',
    sourceFacilityType: 'factory',
    sourceIncidentId: factoryIncidentId,
    eventType: 'EVACUATE_WINDWARD_SIDE',
    payload: {
      windwardFace: 'NE',
      evacuateFloors: [2, 3],
      safeZone: 'Lobby / Parking',
      detail: 'Move guests to lobby. Ensure HVAC intake sealed.',
    },
    targetFacilityTypes: ['hotel'],
    radiusKm: 5,
    affectedFacilityIds: ['grand_horizon'],
  });
  logNotifications('grand_horizon', 47, 'guests on floors 2–3 (NE face)');
  await sleep(3000);

  // ── T+16s: Hospital activates mass casualty ──────────────────────────────
  console.log(`\n${RED}${BOLD}── T+16s  CITY GENERAL HOSPITAL — MASS CASUALTY ACTIVATION ──────${R}`);
  log(`${fname('city_gen_hosp')} activates ${BOLD}MASS CASUALTY PROTOCOL${R}`);
  log(`${DIM}Burn ICU: 6 beds prepared. ER standing by. 3 surgical teams scrubbing in.${R}`);
  await sleep(1500);

  const hospitalIncidentId = await createIncident({
    facilityId: 'city_gen_hosp',
    facilityType: 'hospital',
    type: 'mass_casualty',
    severity: 'critical',
    zone: 'ER',
    description:
      'Mass casualty from Apex Manufacturing fire. 23 burn + smoke inhalation patients incoming. MCI protocol active.',
  });
  logIncident('city_gen_hosp', 'mass_casualty', 'critical', 'ER');
  await sleep(2000);

  // ── T+20s: HOP 1→2  Hospital → Hotel ────────────────────────────────────
  console.log(`\n${YELLOW}${BOLD}── T+20s  HOP 1→2 ────────────────────────────────────────────────${R}`);
  logHop(fname('city_gen_hosp'), fname('grand_horizon'), '1→2',
    'PREPARE_FAMILY_ACCOMMODATION', '23 patient families need immediate accommodation');
  const evt5 = await publishMeshEvent({
    sourceFacilityId: 'city_gen_hosp',
    sourceFacilityType: 'hospital',
    sourceIncidentId: hospitalIncidentId,
    eventType: 'PREPARE_FAMILY_ACCOMMODATION',
    payload: {
      patientCount: 23,
      expectedFamilyMembers: 55,
      detail: 'Reserve ground-floor corridor rooms. Families arriving within 30 min.',
    },
    targetFacilityTypes: ['hotel'],
    radiusKm: 5,
    affectedFacilityIds: ['grand_horizon'],
  });
  logNotifications('grand_horizon', 3, 'duty manager + front desk');
  await sleep(2500);

  // ── T+23s: HOP 1→2  Hospital → College + School (blood drive) ───────────
  console.log(`\n${MAGENTA}${BOLD}── T+23s  HOP 1→2 ────────────────────────────────────────────────${R}`);
  logHop(fname('city_gen_hosp'),
    `${fname('state_university')} + ${fname('lincoln_high')}`,
    '1→2', 'BLOOD_DONATION_NEEDED', 'O-negative critical — 40 units required in 2 hours');
  const evt6 = await publishMeshEvent({
    sourceFacilityId: 'city_gen_hosp',
    sourceFacilityType: 'hospital',
    sourceIncidentId: hospitalIncidentId,
    eventType: 'BLOOD_DONATION_NEEDED',
    payload: {
      bloodType: 'O-negative',
      unitsNeeded: 40,
      urgencyHours: 2,
      detail: 'Multiple surgeries scheduled. Community blood drive urgent.',
    },
    targetFacilityTypes: ['college', 'school'],
    radiusKm: 10,
    affectedFacilityIds: ['state_university', 'lincoln_high'],
  });
  logNotifications('state_university', 280, 'all students via push + email');
  logNotifications('lincoln_high', 8, 'senior students + office staff');
  await sleep(3000);

  // ── T+28s: Hotel upper-floor smoke evacuation ────────────────────────────
  console.log(`\n${YELLOW}${BOLD}── T+28s  GRAND HORIZON HOTEL — UPPER FLOOR EVACUATION ──────────${R}`);
  log(`${fname('grand_horizon')} initiates ${BOLD}UPPER FLOOR EVACUATION${R} — smoke detected on Floor 3 corridor`);
  log(`${DIM}Fire Marshal activating. 47 guests on NE face descending via emergency stairwells.${R}`);
  await sleep(1500);

  const hotelIncidentId = await createIncident({
    facilityId: 'grand_horizon',
    facilityType: 'hotel',
    type: 'fire',
    severity: 'medium',
    zone: 'Floor 3',
    description:
      'Smoke ingress on Floor 3 (NE face) from Apex Manufacturing fire plume. Precautionary evacuation of 47 guests.',
  });
  logIncident('grand_horizon', 'smoke_advisory', 'medium', 'Floor 2 + Floor 3');
  await sleep(2000);

  // ── T+30s: HOP 2→3  Hotel → Factory + School + College ──────────────────
  console.log(`\n${BOLD}── T+30s  HOP 2→3 ────────────────────────────────────────────────${R}`);
  logHop(fname('grand_horizon'),
    `${fname('apex_manufacturing')} + ${fname('lincoln_high')} + ${fname('state_university')}`,
    '2→3', 'TRAFFIC_DIVERSION',
    'Hotel perimeter sealed — 3 approach roads closed, reroute all traffic');
  const evt7 = await publishMeshEvent({
    sourceFacilityId: 'grand_horizon',
    sourceFacilityType: 'hotel',
    sourceIncidentId: hotelIncidentId,
    eventType: 'TRAFFIC_DIVERSION',
    payload: {
      closedRoads: ['Main St', 'Park Ave', 'Elm Blvd'],
      detourRoute: 'Riverside Dr → Industrial Bypass',
      detail: 'Emergency services need clear access. Reroute all deliveries.',
    },
    targetFacilityTypes: ['factory', 'school', 'college'],
    radiusKm: 3,
    affectedFacilityIds: ['apex_manufacturing', 'lincoln_high', 'state_university'],
  });
  logNotifications('apex_manufacturing', 5, 'logistics + gate security');
  logNotifications('lincoln_high', 4, 'bus coordinators');
  logNotifications('state_university', 3, 'transport office');
  await sleep(3000);

  // ── T+35s: Notification summary ──────────────────────────────────────────
  console.log(`\n${GREEN}${BOLD}── T+35s  NOTIFICATIONS DISPATCHED ───────────────────────────────${R}`);
  const notifTable = [
    { facility: 'Apex Manufacturing', role: 'operators + safety', count: 42 },
    { facility: 'City General Hospital', role: 'ER + burn ICU + surgical', count: 12 },
    { facility: 'Grand Horizon Hotel', role: 'guests + staff', count: 50 },
    { facility: 'Lincoln High School', role: 'teachers + students + parents', count: 374 },
    { facility: 'State University', role: 'students + staff', count: 403 },
  ];
  let totalNotifs = 0;
  for (const row of notifTable) {
    totalNotifs += row.count;
    log(
      `  ${GREEN}✉  ${row.count.toString().padStart(4)} notifications${R}  →  ${row.facility}  ${DIM}[${row.role}]${R}`,
    );
  }
  await sleep(2000);

  // ── T+40s: Incidents acknowledged ────────────────────────────────────────
  console.log(`\n${BOLD}── T+40s  ALL INCIDENTS ACKNOWLEDGED ─────────────────────────────${R}`);
  const incidentIds = [factoryIncidentId, hospitalIncidentId, hotelIncidentId];
  for (const id of incidentIds) {
    await updateDoc(doc(db, 'incidents', id), {
      status: 'acknowledged',
      acknowledgedAt: new Date(),
    });
  }
  log(`${GREEN}✓${R} ${incidentIds.length} incidents acknowledged across factory + hospital + hotel`);
  await sleep(2000);

  // ── T+45s: Mesh events marked received ───────────────────────────────────
  console.log(`\n${BOLD}── T+45s  MESH EVENTS RECEIVED & ACKNOWLEDGED ────────────────────${R}`);
  const evtIds = [evt1, evt2, evt3, evt4, evt5, evt6, evt7];
  for (const id of evtIds) {
    await updateDoc(doc(db, 'meshEvents', id), { status: 'acknowledged' });
  }
  log(`${GREEN}✓${R} ${evtIds.length} mesh events acknowledged across all 5 facilities`);
  await sleep(2000);

  // ── T+50s: Playbooks assigned ─────────────────────────────────────────────
  console.log(`\n${BOLD}── T+50s  PLAYBOOKS AUTO-ASSIGNED ────────────────────────────────${R}`);
  const playbooks = [
    { facility: 'apex_manufacturing', playbook: 'chemical_fire_response' },
    { facility: 'city_gen_hosp', playbook: 'mass_casualty_response' },
    { facility: 'grand_horizon', playbook: 'smoke_evacuation_protocol' },
  ];
  for (const { facility, playbook } of playbooks) {
    log(`  ${BOLD}${FACILITY_COLOR[facility] ?? ''}${FACILITIES[facility as FacilityKey]?.name ?? facility}${R} → playbook: ${CYAN}${playbook}${R}`);
  }
  await sleep(2000);

  // ── T+55s: CASCADE COMPLETE ───────────────────────────────────────────────
  const elapsed = ((Date.now() - _startMs) / 1000).toFixed(1);
  console.log(`\n${divider}`);
  console.log(`${BG_YELLOW}${BOLD}                                                              ${R}`);
  console.log(`${BG_YELLOW}${BOLD}   ✅  CASCADE COMPLETE — All 5 Facilities Coordinated        ${R}`);
  console.log(`${BG_YELLOW}${BOLD}                                                              ${R}`);
  console.log(`${divider}\n`);

  console.log(`  ${BOLD}Mesh events fired:${R}    7 events across 3 hops`);
  console.log(`  ${BOLD}Facilities involved:${R}  5 / 5  (factory → hospital → hotel → school → college)`);
  console.log(`  ${BOLD}Total notifications:${R}  ${totalNotifs.toLocaleString()} users across all facilities`);
  console.log(`  ${BOLD}Incidents created:${R}    3 (critical ×2, medium ×1)`);
  console.log(`  ${BOLD}Coordination time:${R}    ${elapsed}s elapsed  (target: ≤ 60 s)`);
  console.log(`  ${BOLD}Max hop depth:${R}        3 (factory → hospital → hotel → neighbors)`);
  console.log();
  console.log(`  ${GRAY}Mesh event IDs:${R}`);
  evtIds.forEach((id, i) => console.log(`    ${GRAY}Hop ${Math.floor(i / 3) > 0 ? Math.floor(i / 3) + '→' + (Math.floor(i / 3) + 1) : '0→1'}  ${id}${R}`));
  console.log();
  console.log(`  ${CYAN}Live map: http://localhost:3000/admin/mesh/live${R}`);
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main entrypoint
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const arg = process.argv.find((a: string) => a.startsWith('--scenario='));
  const selected = arg ? arg.split('=')[1] : 'all';

  console.log(`\n${BOLD}SCR-Mesh Phase 5.1 — Multi-Facility Demo Scenarios${R}`);
  console.log(`${GRAY}Project: ${firebaseConfig.projectId}${R}\n`);

  try {
    await signInAnonymously(auth);
    log(`${GREEN}Authenticated${R} (anonymous) to Firebase project: ${CYAN}${firebaseConfig.projectId}${R}`);
  } catch (e) {
    console.error(`${RED}Auth failed:${R}`, e);
    process.exit(1);
  }

  await sleep(500);

  try {
    if (selected === 'all') {
      await scenario1_hospital();
      await sleep(1500);
      await scenario2_hotel();
      await sleep(1500);
      await scenario3_school();
      await sleep(1500);
      await scenario4_college();
      await sleep(1500);
      await scenario5_factory();
      await sleep(1500);
      await scenarioFinale();
    } else if (selected === '1') {
      await scenario1_hospital();
    } else if (selected === '2') {
      await scenario2_hotel();
    } else if (selected === '3') {
      await scenario3_school();
    } else if (selected === '4') {
      await scenario4_college();
    } else if (selected === '5') {
      await scenario5_factory();
    } else if (selected === 'finale') {
      await scenarioFinale();
    } else {
      console.error(`${RED}Unknown scenario: ${selected}. Use 1–5 or finale.${R}`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`\n${RED}${BOLD}Fatal error:${R}`, e);
    process.exit(1);
  }

  console.log(`\n${GRAY}Socket flush…${R}`);
  setTimeout(() => process.exit(0), 3000);
}

main();
