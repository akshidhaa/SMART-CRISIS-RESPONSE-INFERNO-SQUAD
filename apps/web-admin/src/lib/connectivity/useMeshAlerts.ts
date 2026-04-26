'use client';

// useMeshAlerts — returns the current user's alerts via either Firestore
// (wifi/cellular) or the local IndexedDB mesh-sim store (ble-mesh).
//
// In BLE-mesh mode it polls IndexedDB every 500ms, per the Phase 3.2 spec.

import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import type { Alert } from '@scr-mesh/types';
import { listAlertsForRecipient } from './indexedDb';
import { useConnectivity } from './ConnectivityProvider';

export interface LiveMeshAlert extends Alert {
  id: string;
  transport: 'wifi' | 'ble-mesh' | 'cellular';
}

const POLL_MS = 500;

export function useMeshAlerts(): LiveMeshAlert[] {
  const { user } = useAuth();
  const { mode } = useConnectivity();
  const [alerts, setAlerts] = useState<LiveMeshAlert[]>([]);

  // Firestore path (wifi / cellular).
  useEffect(() => {
    if (!user) return;
    if (mode === 'ble-mesh') return;
    const q = query(
      collection(db, 'alerts'),
      where('recipientId', '==', user.uid),
      where('acknowledged', '==', false),
      orderBy('createdAt', 'desc'),
      limit(10),
    );
    const unsub = onSnapshot(q, (snap) => {
      const next: LiveMeshAlert[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Alert),
        transport: mode,
      }));
      setAlerts(next);
    });
    return unsub;
  }, [user, mode]);

  // IndexedDB path (ble-mesh).
  useEffect(() => {
    if (mode !== 'ble-mesh') return;
    if (!user) return;
    let cancelled = false;

    const read = async () => {
      try {
        const rows = await listAlertsForRecipient(user.uid);
        if (cancelled) return;
        const mapped: LiveMeshAlert[] = rows.slice(0, 10).map((r) => ({
          id: r.id,
          incidentId: r.incidentId,
          facilityId: r.facilityId,
          recipientRole: (r.recipientRole as Alert['recipientRole']) ?? 'employee',
          recipientId: r.recipientId ?? undefined,
          message: r.message,
          messageTranslations: (r.messageTranslations ?? {}) as Alert['messageTranslations'],
          acknowledged: false,
          deliveredVia: [],
          createdAt: { seconds: Math.floor(r.createdAtMs / 1000), nanoseconds: 0 } as Alert['createdAt'],
          transport: 'ble-mesh',
        }));
        setAlerts(mapped);
      } catch (err) {
        console.warn('[useMeshAlerts] IDB read failed:', err);
      }
    };

    void read();
    const interval = window.setInterval(read, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [mode, user]);

  return alerts;
}
