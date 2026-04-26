// Auth trigger: seed a default user document on first sign-up.
//
// Firestore becomes the source of truth for role/facilityIds; we mirror
// the role into a custom auth claim so security rules can branch on
// `request.auth.token.role` without a Firestore read.

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import type { User, UserRole, Language } from '@scr-mesh/types';

const DEFAULT_ROLE: UserRole = 'common';
const DEFAULT_LANGUAGE: Language = 'en';

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();

  const userDoc: User = {
    email: user.email ?? '',
    displayName: user.displayName ?? (user.email?.split('@')[0] ?? 'User'),
    phoneNumber: user.phoneNumber ?? '',
    role: DEFAULT_ROLE,
    designation: '',
    facilityIds: [],
    zones: [],
    language: DEFAULT_LANGUAGE,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as unknown as User['createdAt'],
  };

  await db.collection('users').doc(user.uid).set(userDoc);

  await admin.auth().setCustomUserClaims(user.uid, {
    role: DEFAULT_ROLE,
    facilityIds: [],
  });
});
