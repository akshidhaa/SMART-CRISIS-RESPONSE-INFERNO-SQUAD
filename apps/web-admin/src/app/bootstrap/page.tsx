'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, getDocs, limit, query } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { User as AuthUser } from 'firebase/auth';

export default function BootstrapPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setStatus('Not logged in. Please log in first.');
        setLoading(false);
      } else {
        setStatus(`Logged in as UID: ${currentUser.uid}. Ready to bootstrap profile.`);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const bootstrapProfile = async () => {
    if (!user) return;
    setStatus('Bootstrapping...');
    setLoading(true);

    try {
      // 1. Check if facilities exist to associate the user with.
      let assignedFacilityIds: string[] = [];
      const facilitiesRef = collection(db, 'facilities');
      // Remove the limit(1) to get ALL seeded facilities
      const querySnapshot = await getDocs(query(facilitiesRef));
      
      if (!querySnapshot.empty) {
        assignedFacilityIds = querySnapshot.docs.map(doc => doc.id);
        setStatus(`Found ${assignedFacilityIds.length} facilities.`);
      } else {
        setStatus('No facility found, creating a new Demo Facility...');
        const newFacilityRef = doc(collection(db, 'facilities'));
        assignedFacilityIds = [newFacilityRef.id];
        
        await setDoc(newFacilityRef, {
          name: 'Demo Hospital',
          type: 'hospital',
          tier: 'tertiary',
          address: '123 Mesh Ave, City',
          location: { lat: 12.9716, lng: 77.5946 },
          floorPlans: [],
          designations: [],
          subscribedMeshRadiusKm: 5,
          meshCapabilities: {
            canPublish: [],
            canReceive: []
          },
          createdAt: serverTimestamp()
        });
        setStatus(`Created new default facility: ${assignedFacilityIds[0]}`);
      }

      // 2. Create or update the user document
      const userRef = doc(db, 'users', user.uid);
      
      const payload = {
        email: user.email || '',
        displayName: user.displayName || 'Admin Bootstrap',
        phoneNumber: user.phoneNumber || '',
        role: 'admin',
        designation: 'System Administrator',
        facilityIds: assignedFacilityIds, // Grant all facilities
        zones: [],
        language: 'en',
        createdAt: serverTimestamp(),
      };

      await setDoc(userRef, payload, { merge: true });
      
      setStatus('Success! User document and facility created/updated.');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin'); // Force redirect directly to /admin
      }, 2000);

    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const seedDemoData = async () => {
    if (!user) return;
    setStatus('Injecting Demo Mesh Data (Please do not close page)...');
    setLoading(true);

    try {
      // 1. Facilities
      const facilities = [
        { id: 'city_gen_hosp',      name: 'City General Hospital', type: 'hospital', location: { lat: 12.9716, lng: 77.5946 } },
        { id: 'grand_horizon',      name: 'Grand Horizon Hotel',   type: 'hotel',    location: { lat: 12.9725, lng: 77.5960 } },
        { id: 'lincoln_high',       name: 'Lincoln High School',   type: 'school',   location: { lat: 12.9705, lng: 77.5955 } },
        { id: 'state_university',   name: 'State University',      type: 'college',  location: { lat: 12.9700, lng: 77.5935 } },
        { id: 'apex_manufacturing', name: 'Apex Manufacturing',    type: 'factory',  location: { lat: 12.9728, lng: 77.5930 } }
      ];

      // Cleanup old typo or demo IDs
      const cleanupIds = ['state_unviersity', 'demo_hospital', 'Demo Hospital'];
      for (const cid of cleanupIds) {
        await deleteDoc(doc(db, 'facilities', cid)).catch(() => {});
      }

      for (const f of facilities) {
        setStatus(`Injecting: ${f.name}`);
        await setDoc(doc(db, 'facilities', f.id), {
          name: f.name,
          type: f.type,
          location: f.location,
          createdAt: serverTimestamp()
        });

        // 2. Mock Incidents — only hospital + factory are active (red on map);
        //    hotel, school, college are resolved (green on map).
        const INCIDENT_META: Record<string, { type: string; severity: string; zone: string; status: string }> = {
          hospital: { type: 'mass_casualty',   severity: 'critical', zone: 'ER',          status: 'reported'  },
          factory:  { type: 'chemical_spill',  severity: 'critical', zone: 'Floor 1',     status: 'in_progress' },
          hotel:    { type: 'evacuation_drill', severity: 'low',     zone: 'Lobby',       status: 'resolved'  },
          school:   { type: 'fire',            severity: 'high',     zone: 'Classrooms',  status: 'resolved'  },
          college:  { type: 'lockdown',        severity: 'high',     zone: 'Lecture Hall', status: 'resolved' },
        };

        const meta = INCIDENT_META[f.type] ?? { type: 'fire', severity: 'medium', zone: 'Main Hall', status: 'resolved' };
        const iRef = doc(collection(db, 'incidents'));
        await setDoc(iRef, {
          facilityId: f.id,
          facilityType: f.type,
          type: meta.type,
          status: meta.status,
          severity: meta.severity,
          reporterId: 'seeder_bot',
          reporterRole: 'admin',
          description: `Seed incident for ${f.name}`,
          location: { zone: meta.zone, floor: '1' },
          assignedStaff: [],
          meshEventsFired: [],
          createdAt: serverTimestamp()
        });
      }

      setStatus('Success! Demo data injected into Firebase. Please click "Create Admin Profile" to sync permissions.');
    } catch (e: any) {
      console.error(e);
      setStatus(`Seeder Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-white">Bootstrap Profile</h1>
        
        <div className="mb-6 rounded-md bg-zinc-950 p-4 text-sm font-mono text-zinc-400">
          {status}
        </div>

        {user && (
           <div className="space-y-3">
            <button
              onClick={seedDemoData}
              disabled={loading}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-3 font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : '1. Inject Demo Mesh Data'}
            </button>
            <button
              onClick={bootstrapProfile}
              disabled={loading}
              className="w-full rounded-md bg-white px-4 py-3 font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading ? 'Processing...' : '2. Bind Profile & Enter Admin'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
