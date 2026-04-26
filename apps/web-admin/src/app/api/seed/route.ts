import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Reuse firebase client config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'scr-mesh-demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'scr-mesh-demo',
};

// Initialize App in Server Environment safely
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export async function GET(request: Request) {
  // Security Check: Only allow in development mode or with a matching secret key
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (process.env.NODE_ENV !== 'development' && secret !== 'hackathon2026') {
    return NextResponse.json({ error: 'Unauthorized. Seeding is protected.' }, { status: 403 });
  }

  try {
    // Authenticate the server-side process so security rules pass
    await signInAnonymously(auth);

    const seededData: Record<string, string[]> = {
      facilities: [],
      incidents: [],
      users: []
    };

    // 1. Facilities
    const facilities = [
      { id: 'city_gen_hosp', name: 'City General Hospital', type: 'hospital', location: { lat: 12.9716, lng: 77.5946 } },
      { id: 'grand_horizon', name: 'Grand Horizon Hotel',   type: 'hotel',    location: { lat: 12.9725, lng: 77.5960 } },
      { id: 'lincoln_high',  name: 'Lincoln High School',   type: 'school',   location: { lat: 12.9705, lng: 77.5955 } },
      { id: 'state_university', name: 'State University',   type: 'college',  location: { lat: 12.9700, lng: 77.5935 } },
      { id: 'apex_manufacturing', name: 'Apex Manufacturing', type: 'factory', location: { lat: 12.9728, lng: 77.5930 } }
    ];

    // Cleanup old typo or demo IDs
    const cleanupIds = ['state_unviersity', 'demo_hospital', 'Demo Hospital'];
    for (const cid of cleanupIds) {
      await deleteDoc(doc(db, 'facilities', cid)).catch(() => {});
    }

    for (const f of facilities) {
      await setDoc(doc(db, 'facilities', f.id), {
        name: f.name,
        type: f.type,
        location: f.location,
        createdAt: serverTimestamp()
      });
      seededData.facilities.push(f.id);

      // 2. Mock Active Incidents
      const incidentTypes: Record<string, string> = {
        hospital: 'patient_attack',
        hotel: 'fire',
        school: 'intruder',
        college: 'campus_unrest',
        factory: 'chemical_spill'
      };

      const iRef = doc(collection(db, 'incidents'));
      await setDoc(iRef, {
        facilityId: f.id,
        facilityType: f.type,
        type: incidentTypes[f.type] || 'fire',
        status: 'reported',
        severity: 'high',
        reporterId: 'seeder_bot',
        reporterRole: 'admin',
        description: `Automated seed incident for ${f.name} Demo`,
        location: { zone: 'Main Hall', floor: '1' },
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000)) // slight random past
      });
      seededData.incidents.push(iRef.id);

      // 3. Fake Users
      const uEmp = doc(collection(db, 'users'));
      await setDoc(uEmp, {
        role: 'employee',
        facilityIds: [f.id],
        activeFacilityId: f.id,
        name: `${f.type} Staff`,
        createdAt: serverTimestamp()
      });
      seededData.users.push(uEmp.id);
      
      const uCom = doc(collection(db, 'users'));
      await setDoc(uCom, {
        role: 'community',
        facilityIds: [f.id],
        activeFacilityId: f.id,
        name: `${f.type} Patron`,
        createdAt: serverTimestamp()
      });
      seededData.users.push(uCom.id);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database seeded successfully', 
      seeded: seededData 
    });

  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ error: error.message || 'Seeding failed' }, { status: 500 });
  }
}
