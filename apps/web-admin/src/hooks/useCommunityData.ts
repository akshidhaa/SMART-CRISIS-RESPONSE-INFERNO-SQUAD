'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FacilityNode, MeshEvent, Incident, MeshEventRow, IncidentRow } from '@scr-mesh/types';

function tsToMs(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'object' && 'seconds' in (value as Record<string, unknown>)) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }
  if (typeof value === 'number') return value;
  return 0;
}

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
      snap.forEach((doc) => {
        const data = doc.data() as MeshEvent;
        next.push({
          id: doc.id,
          ...data,
          publishedAtMs: tsToMs(data.publishedAt),
        });
      });
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
      snap.forEach((doc) => {
        const data = doc.data() as Incident;
        next.push({
          id: doc.id,
          ...data,
          createdAtMs: tsToMs(data.createdAt),
          reportedAtMs: data.reportedAtMs ?? tsToMs(data.createdAt),
        });
      });
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
