import { getApps, getApp, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'scr-mesh-demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'scr-mesh-demo',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'scr-mesh-demo.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '0',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? 'demo-app-id',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

const useEmulators =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

if (useEmulators && typeof window !== 'undefined') {
  // @ts-expect-error — avoid duplicate connect
  if (!globalThis.__scrPublicEmulatorsBound) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    // @ts-expect-error — see above
    globalThis.__scrPublicEmulatorsBound = true;
  }
}

// Persistence is disabled in dev to prevent "Unexpected state" crashes
// when switching between emulator and production or multiple tabs.
export { app };
