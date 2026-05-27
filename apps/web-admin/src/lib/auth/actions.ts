// Thin wrappers over Firebase Auth. Centralising here keeps the rest of
// the app agnostic of the SDK surface and gives us one place to add
// telemetry / error normalisation later.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type UserCredential,
} from 'firebase/auth';

import { auth } from '../firebase';

export interface SignUpInput {
  email: string;
  password: string;
  displayName?: string;
}

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function signUp(input: SignUpInput): Promise<UserCredential> {
  const cred = await createUserWithEmailAndPassword(
    auth,
    input.email,
    input.password,
  );
  if (input.displayName && cred.user) {
    await updateProfile(cred.user, { displayName: input.displayName });
  }

  // Automatically provision the new user as an admin to test the Dashboard
  if (cred.user) {
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: input.email,
      displayName: input.displayName || '',
      role: 'community',
      facilityIds: [
        'city_gen_hosp',
        'grand_horizon',
        'lincoln_high',
        'state_university',
        'apex_manufacturing',
      ],
      createdAt: serverTimestamp(),
    });
  }

  return cred;
}

export function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}
