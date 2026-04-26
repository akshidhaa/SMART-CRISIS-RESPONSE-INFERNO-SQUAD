import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// Automatically loaded by tsx using --env-file or inline dotenv if needed, 
// but we will pass explicit credentials if env is missing to be safe.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "scr-mesh-dev.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "scr-mesh-dev",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function seed() {
  console.log("Connecting to Firebase Project:", firebaseConfig.projectId);
  try {
    await signInAnonymously(auth);
    console.log("Authenticated.");

    const facilities = [
      { id: 'city_gen_hosp',      name: 'City General Hospital', type: 'hospital', tier: 'tertiary',  location: { lat: 12.9716, lng: 77.5946 } },
      { id: 'grand_horizon',      name: 'Grand Horizon Hotel',   type: 'hotel',    tier: 'standard',  location: { lat: 12.9750, lng: 77.6000 } },
      { id: 'lincoln_high',       name: 'Lincoln High School',   type: 'school',   tier: 'standard',  location: { lat: 12.9680, lng: 77.6020 } },
      { id: 'state_university',   name: 'State University',      type: 'college',  tier: 'standard',  location: { lat: 12.9650, lng: 77.5900 } },
      { id: 'apex_manufacturing', name: 'Apex Manufacturing',    type: 'factory',  tier: 'standard',  location: { lat: 12.9780, lng: 77.5850 } },
    ];

    for (const f of facilities) {
      console.log(`Overwriting/fixing facility: ${f.name} (${f.id})`);
      await setDoc(doc(db, 'facilities', f.id), {
        name: f.name,
        type: f.type,
        tier: f.tier,
        location: f.location,
        createdAt: serverTimestamp()
      });
      // Mock an incident for it
      const incidentTypes: Record<string, string> = { hospital: 'patient_attack', hotel: 'fire', school: 'intruder', college: 'campus_unrest', factory: 'chemical_spill' };
      const iRef = doc(collection(db, 'incidents'));
      await setDoc(iRef, {
        facilityId: f.id, facilityType: f.type, type: incidentTypes[f.type] || 'fire', status: 'reported', severity: 'high', reporterId: 'seeder_bot', reporterRole: 'admin', description: `Automated seed incident for ${f.name} Demo`, location: { zone: 'Main Hall', floor: '1' }, createdAt: serverTimestamp()
      });
    }

    console.log("Seeding complete! Force quitting in 3 seconds to allow socket flush...");
    setTimeout(() => process.exit(0), 3000);
  } catch (error) {
    console.error("Fatal Error Seeding:", error);
    process.exit(1);
  }
}

seed();
