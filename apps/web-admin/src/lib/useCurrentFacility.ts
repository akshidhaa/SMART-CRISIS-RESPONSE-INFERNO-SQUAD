'use client';

// Resolves the current facility's Firestore document — used by the admin
// shell to drive theming + display the facility name in the topbar. Returns
// null while loading or when no facility is selected.

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Facility } from '@scr-mesh/types';

import { db } from './firebase';
import { useAuth } from './auth';

export interface CurrentFacility {
  id: string;
  data: Facility;
}

export function useCurrentFacility(): { facility: CurrentFacility | null; loading: boolean } {
  const { currentFacilityId } = useAuth();
  const [facility, setFacility] = useState<CurrentFacility | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(currentFacilityId));

  useEffect(() => {
    if (!currentFacilityId) {
      setFacility(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, 'facilities', currentFacilityId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setFacility({ id: snap.id, data: snap.data() as Facility });
        } else {
          setFacility(null);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [currentFacilityId]);

  return { facility, loading };
}
