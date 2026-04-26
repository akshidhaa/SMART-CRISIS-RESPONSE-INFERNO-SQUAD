// Run with: npx tsx seed.ts YOUR_PASSWORD  (from inside apps/web-admin)
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Parse .env.local manually — no dotenv needed
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const envRaw = readFileSync(resolve(__dirname, '.env.local'), 'utf8');
const env: Record<string, string> = {};
for (const line of envRaw.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
}

const firebaseConfig = {
  apiKey:            env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('Project:', firebaseConfig.projectId);

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

const EMAIL    = 'gsaikalyan2@gmail.com';
const PASSWORD = process.argv[2];

if (!PASSWORD) {
  console.error('Usage: npx tsx seed.ts YOUR_PASSWORD');
  process.exit(1);
}

const FACILITIES = [
  { id: 'city_gen_hosp',      name: 'City General Hospital', type: 'hospital', tier: 'standard', address: '1 Hospital Rd',    lat: 12.9728, lng: 77.5938 },
  { id: 'grand_horizon',      name: 'Grand Horizon Hotel',   type: 'hotel',    tier: 'premium',  address: '2 Hotel Ave',       lat: 12.9735, lng: 77.5958 },
  { id: 'lincoln_high',       name: 'Lincoln High School',   type: 'school',   tier: 'standard', address: '3 School St',       lat: 12.9718, lng: 77.5962 },
  { id: 'state_university',   name: 'State University',      type: 'college',  tier: 'standard', address: '4 University Blvd', lat: 12.9704, lng: 77.5950 },
  { id: 'apex_manufacturing', name: 'Apex Manufacturing',    type: 'factory',  tier: 'basic',    address: '5 Industrial Way',  lat: 12.9710, lng: 77.5928 },
];

const INCIDENT_TYPES: Record<string, string> = {
  hospital: 'code_blue',
  hotel:    'fire',
  school:   'lockdown',
  college:  'medical',
  factory:  'chemical_spill',
};

// Two cameras per facility with facility-appropriate `enabledDetectors`.
// Used by services/ai-detection (Phase 2.2): the /detect endpoint looks up
// cameras/{cameraId}, reads enabledDetectors, and runs exactly those
// plugins against the incoming frame.
const CAMERAS: Record<string, { zone: string; floor: string; enabledDetectors: string[] }[]> = {
  hospital: [
    { zone: 'Main Entrance', floor: '1', enabledDetectors: ['weapon', 'intruder_after_hours'] },
    { zone: 'ER Waiting',    floor: '1', enabledDetectors: ['weapon', 'crowd_surge', 'fire'] },
  ],
  hotel: [
    { zone: 'Lobby',          floor: 'G', enabledDetectors: ['weapon', 'crowd_surge', 'intruder_after_hours'] },
    { zone: 'Parking Garage', floor: 'B1', enabledDetectors: ['weapon', 'intruder_after_hours', 'fire'] },
  ],
  school: [
    { zone: 'Main Hall', floor: '1', enabledDetectors: ['weapon', 'crowd_surge', 'intruder_after_hours'] },
    { zone: 'Gymnasium', floor: '1', enabledDetectors: ['weapon', 'crowd_surge', 'fire'] },
  ],
  college: [
    { zone: 'Quad',                 floor: 'Outdoor', enabledDetectors: ['crowd_surge', 'weapon', 'intruder_after_hours'] },
    { zone: 'Chem Lab 3',           floor: '2',       enabledDetectors: ['fire', 'chemical_spill_visual', 'intruder_after_hours'] },
  ],
  factory: [
    { zone: 'Assembly Line 3', floor: '1', enabledDetectors: ['ppe_violation', 'fire', 'intruder_after_hours'] },
    { zone: 'Chem Storage',    floor: '1', enabledDetectors: ['chemical_spill_visual', 'ppe_violation', 'fire'] },
  ],
};

async function seed() {
  console.log('Signing in...');
  await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
  console.log('Signed in.\n');

  for (const f of FACILITIES) {
    await setDoc(doc(db, 'facilities', f.id), {
      name:    f.name,
      type:    f.type,
      tier:    f.tier,
      address: f.address,
      location: { latitude: f.lat, longitude: f.lng },
      meshCapabilities: {
        canPublish: ['fire', 'medical', 'evacuation'],
        canReceive: ['fire', 'medical', 'evacuation'],
      },
      subscribedMeshRadiusKm: 10,
      floorPlans:   [],
      designations: [],
      createdAt: serverTimestamp(),
    });
    console.log(`✓ facility: ${f.id} (${f.type})`);

    const iRef = doc(collection(db, 'incidents'));
    await setDoc(iRef, {
      facilityId:      f.id,
      facilityType:    f.type,
      type:            INCIDENT_TYPES[f.type] ?? 'fire',
      status:          'reported',
      severity:        'high',
      reporterId:      'seeder_bot',
      reporterRole:    'admin',
      description:     `Demo incident at ${f.name}`,
      location:        { zone: 'Main Hall', floor: '1' },
      assignedStaff:   [],
      meshEventsFired: [],
      createdAt: serverTimestamp(),
    });
    console.log(`✓ incident: ${f.type} at ${f.id}`);

    const cams = CAMERAS[f.type] ?? [];
    for (let i = 0; i < cams.length; i++) {
      const c = cams[i];
      const cameraId = `${f.id}_cam_${String(i + 1).padStart(2, '0')}`;
      await setDoc(doc(db, 'cameras', cameraId), {
        facilityId:       f.id,
        facilityType:     f.type,
        zone:             c.zone,
        floor:            c.floor,
        streamUrl:        `rtsp://mock-stream/${f.id}/${cameraId}`,
        enabledDetectors: c.enabledDetectors,
        active:           true,
        createdAt:        serverTimestamp(),
      });
      console.log(`✓ camera:   ${cameraId} [${c.enabledDetectors.join(', ')}]`);
    }
    console.log();
  }

  console.log('Seed complete.');
  await new Promise(r => setTimeout(r, 2000));
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
