'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2, AlertCircle } from 'lucide-react';

export default function QREntryPage({ params }: { params: { zoneId: string } }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleQREntry() {
      try {
        const zoneId = params.zoneId;
        
        // 1. Authenticate Anonymously
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;

        // 2. We'll simulate looking up the zoneId to get facilityId.
        // For the demo, we assume the zoneId maps to our demo facility.
        // In prod: const zoneDoc = await getDoc(doc(db, 'zones', zoneId));
        // For prototyping, let's hardcode to the first facility we find, since we only have one demo facility in testing context.
        
        // Fetch demo facility (or the first facility in DB) so we know where to assign them
        const { collection, query, limit, getDocs } = await import('firebase/firestore');
        const facilitiesQuery = query(collection(db, 'facilities'), limit(1));
        const facilitiesSnapshot = await getDocs(facilitiesQuery);
        
        if (facilitiesSnapshot.empty) {
          throw new Error('No facilities registered in the system. Check database setup.');
        }

        const targetFacilityId = facilitiesSnapshot.docs[0].id;
        const targetFacilityType = facilitiesSnapshot.docs[0].data().type || 'hotel';

        // 3. Write a transient `users/{uid}` document
        await setDoc(doc(db, 'users', user.uid), {
          role: 'community',
          isAnonymous: true,
          facilityIds: [targetFacilityId],
          activeFacilityId: targetFacilityId,
          zones: [zoneId], // Locked to the scanned zone
          lastSeenAt: new Date()
        }, { merge: true });

        // Storage context for community module
        if (typeof window !== 'undefined') {
          localStorage.setItem('scrmesh_currentFacilityId', targetFacilityId);
        }

        // 4. Send them directly to the community home
        router.replace('/community/home');
        
      } catch (err: any) {
        console.error('QR Entry Error:', err);
        setError(err.message || 'Failed to authenticate QR session.');
      }
    }

    handleQREntry();
  }, [params.zoneId, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center text-sm space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">Invalid QR Code</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
        <div className="relative bg-background p-4 rounded-full border border-border shadow-2xl">
           <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Initializing Mesh Link...</h2>
        <p className="text-muted-foreground text-sm mt-2">Authenticating you securely into this zone.</p>
      </div>
    </div>
  );
}
