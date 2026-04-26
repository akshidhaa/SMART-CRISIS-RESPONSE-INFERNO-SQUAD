// Single Firebase app instance + exported singletons for the client.
//
// NEXT_PUBLIC_* env vars are baked at build time; missing values fall back
// to placeholders so local dev + the emulator suite still boots. Production
// deployments must supply real values via the hosting provider's secrets.

import { getApps, getApp, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  enableIndexedDbPersistence,
  type Firestore,
} from 'firebase/firestore';
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from 'firebase/functions';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'scr-mesh-demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'scr-mesh-demo',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'scr-mesh-demo.appspot.com',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '0',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? 'demo-app-id',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app);

// Emulator bindings MUST run before any other Firestore call (including
// enableIndexedDbPersistence), otherwise connectFirestoreEmulator throws
// "Firestore has already been started" and blanks the page.
const useEmulators =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

if (
  useEmulators &&
  // @ts-expect-error — marker prevents duplicate connects on fast refresh
  !globalThis.__scrMeshEmulatorsBound
) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  // @ts-expect-error — see above
  globalThis.__scrMeshEmulatorsBound = true;
}

// IndexedDB persistence must NOT be enabled against the emulator — it
// conflicts with connectFirestoreEmulator and isn't needed for local dev.
if (typeof window !== 'undefined' && !useEmulators) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open; persistence disabled.');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser does not support IndexedDB persistence.');
    }
  });
}

export { app };
