import { initializeApp } from './apps/web-admin/node_modules/firebase/app/dist/index.esm.js';
import { getFirestore, doc, setDoc, collection, serverTimestamp } from './apps/web-admin/node_modules/firebase/firestore/dist/index.esm.js';
import { getAuth, signInWithEmailAndPassword } from './apps/web-admin/node_modules/firebase/auth/dist/index.esm.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env.local manually
const envFile = readFileSync(join(__dirname, 'apps/web-admin/.env.local'), 'utf8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
);

const firebaseConfig = {
  apiKey:            env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('Using Firebase Project:', firebaseConfig.projectId);

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);
