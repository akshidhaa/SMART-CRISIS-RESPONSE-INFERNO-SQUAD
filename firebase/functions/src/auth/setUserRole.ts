// Callable: an admin grants a role to another user, scoped to a facility.
//
// Guardrails:
//   - Caller must be authenticated.
//   - Caller must be an admin of the *target* facilityId (custom claim).
//     An admin of Hospital A cannot grant roles in Hotel B.
//   - Target facility must exist.
//   - Target role must be one of the 4 canonical roles.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import type { UserRole } from '@scr-mesh/types';

const VALID_ROLES: readonly UserRole[] = [
  'admin',
  'employee',
  'community',
  'common',
] as const;

interface SetUserRoleRequest {
  targetUserId: string;
  facilityId: string;
  role: UserRole;
  designation?: string;
}

interface AdminClaims {
  role?: UserRole;
  facilityIds?: string[];
}

export const setUserRole = onCall<SetUserRoleRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const { targetUserId, facilityId, role, designation } = request.data ?? {};
  if (!targetUserId || !facilityId || !role) {
    throw new HttpsError(
      'invalid-argument',
      'targetUserId, facilityId, and role are required.',
    );
  }
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', `Unknown role: ${role}`);
  }

  const callerClaims = request.auth.token as AdminClaims;
  const callerIsAdminOfFacility =
    callerClaims.role === 'admin' &&
    Array.isArray(callerClaims.facilityIds) &&
    callerClaims.facilityIds.includes(facilityId);

  if (!callerIsAdminOfFacility) {
    throw new HttpsError(
      'permission-denied',
      'Only an admin of this facility can assign roles within it.',
    );
  }

  const db = admin.firestore();
  const facilitySnap = await db.collection('facilities').doc(facilityId).get();
  if (!facilitySnap.exists) {
    throw new HttpsError('not-found', `Facility ${facilityId} does not exist.`);
  }

  const userRef = db.collection('users').doc(targetUserId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new HttpsError('not-found', `User ${targetUserId} does not exist.`);
  }

  const existing = userSnap.data() as { facilityIds?: string[] } | undefined;
  const existingFacilityIds = existing?.facilityIds ?? [];
  const nextFacilityIds = existingFacilityIds.includes(facilityId)
    ? existingFacilityIds
    : [...existingFacilityIds, facilityId];

  await userRef.update({
    role,
    facilityIds: nextFacilityIds,
    ...(designation ? { designation } : {}),
  });

  await admin.auth().setCustomUserClaims(targetUserId, {
    role,
    facilityIds: nextFacilityIds,
  });

  return { ok: true, targetUserId, facilityId, role };
});
