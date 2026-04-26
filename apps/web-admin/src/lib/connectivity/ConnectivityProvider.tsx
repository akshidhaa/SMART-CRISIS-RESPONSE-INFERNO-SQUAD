'use client';

// ConnectivityProvider — Phase 3.2 simulator.
//
// Exposes a single mode (wifi | ble-mesh | cellular) that other components
// read to decide:
//   - wifi     → live Firestore listeners.
//   - ble-mesh → listeners disabled, UI reads from local IndexedDB mirror.
//   - cellular → Firestore live; SMS banner shown. (dispatchAlerts already
//                sends SMS for critical severity.)
//
// The provider also runs a background Firestore->IDB sync on `meshRelay`
// whenever mode !== 'ble-mesh' so the store is warm when the user toggles
// to BLE during the demo.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { putAlert, type MeshAlertRecord } from './indexedDb';

export type ConnectivityMode = 'wifi' | 'ble-mesh' | 'cellular';

interface ConnectivityContextValue {
  mode: ConnectivityMode;
  isOnline: boolean;
  forceMode: (mode: ConnectivityMode) => void;
}

const STORAGE_KEY = 'scr-mesh.connectivity.mode';

const Ctx = createContext<ConnectivityContextValue | null>(null);

function readInitialMode(): ConnectivityMode {
  if (typeof window === 'undefined') return 'wifi';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'wifi' || raw === 'ble-mesh' || raw === 'cellular') return raw;
  return 'wifi';
}

function toMillis(ts: unknown): number {
  if (!ts) return Date.now();
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    const s = (ts as { seconds: number }).seconds;
    return s * 1000;
  }
  if (ts instanceof Date) return ts.getTime();
  return Date.now();
}

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const { user, currentFacilityId } = useAuth();
  const [mode, setMode] = useState<ConnectivityMode>('wifi');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const hydratedRef = useRef(false);

  // Hydrate persisted mode on mount.
  useEffect(() => {
    setMode(readInitialMode());
    hydratedRef.current = true;
  }, []);

  // Persist mode.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  // Browser online/offline.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onUp = () => setIsOnline(true);
    const onDown = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  // Background Firestore -> IndexedDB sync on meshRelay.
  // Runs in wifi and cellular modes only; in ble-mesh mode we pretend to be
  // Firestore-offline so we don't subscribe.
  useEffect(() => {
    if (mode === 'ble-mesh') return;
    if (!user || !currentFacilityId) return;

    const q = query(
      collection(db, 'meshRelay'),
      where('facilityId', '==', currentFacilityId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'removed') return;
          const data = change.doc.data();
          const rec: MeshAlertRecord = {
            id: change.doc.id,
            incidentId: data.incidentId,
            facilityId: data.facilityId,
            recipientId: data.recipientId ?? null,
            recipientRole: data.recipientRole,
            message: data.message ?? '',
            messageTranslations: data.messageTranslations,
            createdAtMs: toMillis(data.createdAt),
            relayedAtMs: toMillis(data.relayedAt),
          };
          void putAlert(rec).catch((err) =>
            console.warn('[connectivity] IDB write failed:', err),
          );
        });
      },
      (err) => {
        console.error('[connectivity] meshRelay sync error:', err);
      },
    );
    return unsub;
  }, [mode, user, currentFacilityId]);

  const forceMode = useCallback((next: ConnectivityMode) => {
    setMode(next);
  }, []);

  const value = useMemo<ConnectivityContextValue>(
    () => ({ mode, isOnline, forceMode }),
    [mode, isOnline, forceMode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Defensive: allow hook usage outside the provider (e.g. during SSR) by
    // returning a safe default rather than throwing.
    return { mode: 'wifi', isOnline: true, forceMode: () => {} };
  }
  return ctx;
}
