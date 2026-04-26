'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FacilityNode, MeshEventRow, IncidentRow } from '@scr-mesh/types';

export function useCommunityData() {
  const [facilities, setFacilities] = useState<Record<string, FacilityNode>>({});
  const [alerts, setAlerts] = useState<MeshEventRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Facilities
    const unsubFac = onSnapshot(collection(db, 'facilities'), (snap) => {
      const next: Record<string, FacilityNode> = {};
      snap.forEach((doc) => {
        next[doc.id] = { id: doc.id, data: doc.data(), position: doc.data().location } as FacilityNode;
      });
      setFacilities(next);
      setLoading(false);
    });

    // 2. Recent Alerts (last 10)
    const qAlerts = query(
      collection(db, 'mesh_events'),
      orderBy('publishedAtMs', 'desc'),
      limit(10)
    );
    const unsubAlerts = onSnapshot(qAlerts, (snap) => {
      const next: MeshEventRow[] = [];
      snap.forEach((doc) => next.push({ id: doc.id, ...doc.data() } as MeshEventRow));
      setAlerts(next);
    });

    // 3. Active Incidents
    const qIncidents = query(
      collection(db, 'incidents'),
      orderBy('reportedAtMs', 'desc'),
      limit(20)
    );
    const unsubIncidents = onSnapshot(qIncidents, (snap) => {
      const next: IncidentRow[] = [];
      snap.forEach((doc) => next.push({ id: doc.id, ...doc.data() } as IncidentRow));
      setIncidents(next);
    });

    return () => {
      unsubFac();
      unsubAlerts();
      unsubIncidents();
    };
  }, []);

  return { facilities, alerts, incidents, loading };
}
