// Security-rules unit tests against the Firestore emulator.
//
// Each test instantiates a fresh test environment, seeds the documents it
// needs via the admin escape hatch (withSecurityRulesDisabled), then runs
// the real rule-gated operation through an authed context. The 8th test
// explicitly proves cross-facility isolation — an admin of Hospital A must
// not read users of Hotel B.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'scr-mesh-rules-test';
const RULES_PATH = resolve(__dirname, '../../firestore.rules');

let env: RulesTestEnvironment;

// ---- Fixture identifiers --------------------------------------------------
const HOSPITAL_A = 'facility-hospital-a';
const HOTEL_B = 'facility-hotel-b';

const UID_HOSP_ADMIN = 'uid-hosp-admin';
const UID_HOSP_EMPLOYEE = 'uid-hosp-employee';
const UID_HOSP_COMMON = 'uid-hosp-common';
const UID_HOTEL_ADMIN = 'uid-hotel-admin';
const UID_HOTEL_COMMON = 'uid-hotel-common';
const UID_STRANGER = 'uid-stranger';

function authed(uid: string, claims: Record<string, unknown>) {
  return env.authenticatedContext(uid, claims).firestore();
}

function adminClaims(role: string, facilityIds: string[]) {
  return { role, facilityIds };
}

// ---- Environment setup ----------------------------------------------------
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();

  // Seed baseline data bypassing rules.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await setDoc(doc(db, 'facilities', HOSPITAL_A), {
      name: 'Hospital A',
      type: 'hospital',
    });
    await setDoc(doc(db, 'facilities', HOTEL_B), {
      name: 'Hotel B',
      type: 'hotel',
    });

    await setDoc(doc(db, 'users', UID_HOSP_ADMIN), {
      email: 'admin@hospital-a.test',
      role: 'admin',
      facilityIds: [HOSPITAL_A],
    });
    await setDoc(doc(db, 'users', UID_HOSP_EMPLOYEE), {
      email: 'nurse@hospital-a.test',
      role: 'employee',
      facilityIds: [HOSPITAL_A],
    });
    await setDoc(doc(db, 'users', UID_HOSP_COMMON), {
      email: 'visitor@hospital-a.test',
      role: 'common',
      facilityIds: [HOSPITAL_A],
    });
    await setDoc(doc(db, 'users', UID_HOTEL_ADMIN), {
      email: 'admin@hotel-b.test',
      role: 'admin',
      facilityIds: [HOTEL_B],
    });
    await setDoc(doc(db, 'users', UID_HOTEL_COMMON), {
      email: 'guest@hotel-b.test',
      role: 'common',
      facilityIds: [HOTEL_B],
    });

    // One incident owned by each facility.
    await setDoc(doc(db, 'incidents', 'inc-hospA-1'), {
      facilityId: HOSPITAL_A,
      facilityType: 'hospital',
      type: 'code_blue',
      severity: 'high',
      status: 'reported',
      reporterId: UID_HOSP_EMPLOYEE,
      reporterRole: 'employee',
      location: { zone: 'ICU', floor: '3' },
      description: 'cardiac arrest',
      assignedStaff: [],
      meshEventsFired: [],
      createdAt: serverTimestamp(),
    });

    // An alert targeted at hospital-A employees.
    await setDoc(doc(db, 'alerts', 'alert-hospA-employees-1'), {
      incidentId: 'inc-hospA-1',
      facilityId: HOSPITAL_A,
      recipientRole: 'employee',
      message: 'Code Blue — ICU 3',
      messageTranslations: { en: '', hi: '', ta: '', te: '', mr: '', bn: '' },
      acknowledged: false,
      deliveredVia: ['push'],
      createdAt: serverTimestamp(),
    });

    // A mesh event sourced from Hospital A, targeting hotels.
    await setDoc(doc(db, 'meshEvents', 'mesh-1'), {
      sourceFacilityId: HOSPITAL_A,
      sourceFacilityType: 'hospital',
      sourceIncidentId: 'inc-hospA-1',
      eventType: 'PREPARE_TRAUMA_TEAMS',
      payload: {},
      targetFacilityTypes: ['hotel'],
      radiusKm: 5,
      affectedFacilityIds: [HOTEL_B],
      status: 'published',
      publishedAt: serverTimestamp(),
      expiresAt: serverTimestamp(),
    });
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SCR-Mesh Firestore security rules', () => {
  it('1. users: a signed-in user can read their own profile', async () => {
    const db = authed(UID_HOSP_COMMON, adminClaims('common', [HOSPITAL_A]));
    await assertSucceeds(getDoc(doc(db, 'users', UID_HOSP_COMMON)));
  });

  it('2. users: an unrelated user cannot read another user profile', async () => {
    const db = authed(UID_STRANGER, adminClaims('common', []));
    await assertFails(getDoc(doc(db, 'users', UID_HOSP_ADMIN)));
  });

  it('3. users: cross-facility isolation — Hospital A admin cannot read Hotel B users', async () => {
    const db = authed(UID_HOSP_ADMIN, adminClaims('admin', [HOSPITAL_A]));
    await assertFails(getDoc(doc(db, 'users', UID_HOTEL_COMMON)));
  });

  it('4. facilities: admin of that facility can update it; outsiders cannot', async () => {
    const adminDb = authed(UID_HOSP_ADMIN, adminClaims('admin', [HOSPITAL_A]));
    await assertSucceeds(
      updateDoc(doc(adminDb, 'facilities', HOSPITAL_A), { tier: 'tier-1' }),
    );

    const outsiderDb = authed(UID_HOTEL_ADMIN, adminClaims('admin', [HOTEL_B]));
    await assertFails(
      updateDoc(doc(outsiderDb, 'facilities', HOSPITAL_A), { tier: 'tier-2' }),
    );
  });

  it('5. incidents: Hotel B admin cannot read or update Hospital A incidents', async () => {
    const hotelAdmin = authed(UID_HOTEL_ADMIN, adminClaims('admin', [HOTEL_B]));
    await assertFails(getDoc(doc(hotelAdmin, 'incidents', 'inc-hospA-1')));
    await assertFails(
      updateDoc(doc(hotelAdmin, 'incidents', 'inc-hospA-1'), {
        status: 'closed',
      }),
    );

    const hospEmployee = authed(
      UID_HOSP_EMPLOYEE,
      adminClaims('employee', [HOSPITAL_A]),
    );
    await assertSucceeds(
      updateDoc(doc(hospEmployee, 'incidents', 'inc-hospA-1'), {
        status: 'acknowledged',
      }),
    );
  });

  it('6. alerts: only the intended recipient may read + acknowledge', async () => {
    const wrongRole = authed(
      UID_HOSP_COMMON,
      adminClaims('common', [HOSPITAL_A]),
    );
    await assertFails(
      getDoc(doc(wrongRole, 'alerts', 'alert-hospA-employees-1')),
    );

    const recipient = authed(
      UID_HOSP_EMPLOYEE,
      adminClaims('employee', [HOSPITAL_A]),
    );
    await assertSucceeds(
      getDoc(doc(recipient, 'alerts', 'alert-hospA-employees-1')),
    );
    await assertSucceeds(
      updateDoc(doc(recipient, 'alerts', 'alert-hospA-employees-1'), {
        acknowledged: true,
      }),
    );

    // Mutating any other field is rejected even for the recipient.
    await assertFails(
      updateDoc(doc(recipient, 'alerts', 'alert-hospA-employees-1'), {
        message: 'tampered',
      }),
    );
  });

  it('7. meshEvents: only admins whose facility is source or affected can read; clients cannot write', async () => {
    const hotelAdmin = authed(UID_HOTEL_ADMIN, adminClaims('admin', [HOTEL_B]));
    await assertSucceeds(getDoc(doc(hotelAdmin, 'meshEvents', 'mesh-1')));

    const hospAdmin = authed(UID_HOSP_ADMIN, adminClaims('admin', [HOSPITAL_A]));
    await assertSucceeds(getDoc(doc(hospAdmin, 'meshEvents', 'mesh-1')));

    const unrelated = authed(
      'uid-college-admin',
      adminClaims('admin', ['facility-college-x']),
    );
    await assertFails(getDoc(doc(unrelated, 'meshEvents', 'mesh-1')));

    // Client writes are always denied — Cloud Functions only.
    await assertFails(
      setDoc(doc(hospAdmin, 'meshEvents', 'mesh-2'), {
        sourceFacilityId: HOSPITAL_A,
        sourceFacilityType: 'hospital',
        sourceIncidentId: 'inc-hospA-1',
        eventType: 'TEST',
        payload: {},
        targetFacilityTypes: ['hotel'],
        radiusKm: 1,
        affectedFacilityIds: [HOTEL_B],
        status: 'published',
        publishedAt: serverTimestamp(),
        expiresAt: serverTimestamp(),
      }),
    );
  });

  it('8. zoneCheckIns: user writes own doc; admin reads their facility but not others', async () => {
    // Self check-in allowed.
    const selfDb = authed(
      UID_HOSP_EMPLOYEE,
      adminClaims('employee', [HOSPITAL_A]),
    );
    await assertSucceeds(
      setDoc(doc(selfDb, 'zoneCheckIns', 'ci-1'), {
        userId: UID_HOSP_EMPLOYEE,
        facilityId: HOSPITAL_A,
        zone: 'ICU',
        checkedInAt: serverTimestamp(),
      }),
    );

    // Spoofing another user's id is rejected.
    await assertFails(
      setDoc(doc(selfDb, 'zoneCheckIns', 'ci-spoof'), {
        userId: UID_HOSP_COMMON,
        facilityId: HOSPITAL_A,
        zone: 'ICU',
        checkedInAt: serverTimestamp(),
      }),
    );

    // Hospital admin reads check-ins in their facility.
    const hospAdmin = authed(UID_HOSP_ADMIN, adminClaims('admin', [HOSPITAL_A]));
    await assertSucceeds(getDoc(doc(hospAdmin, 'zoneCheckIns', 'ci-1')));

    // Hotel admin cannot — cross-facility isolation at the check-in level.
    const hotelAdmin = authed(UID_HOTEL_ADMIN, adminClaims('admin', [HOTEL_B]));
    await assertFails(getDoc(doc(hotelAdmin, 'zoneCheckIns', 'ci-1')));
  });
});
