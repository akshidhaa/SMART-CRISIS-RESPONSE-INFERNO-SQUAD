'use client';

// Aggregates the live data feeds the mesh-live page needs:
//  - All facilities (across the admin's managed facilityIds + every facility
//    that participates as source/target of recent mesh events).
//  - meshEvents in the last 24h (powers the arcs + scrubber + stream).
//  - incidents in the last 24h (powers the pulsing-marker indicator).
//
// Data is held in memory; no pagination needed for hackathon scale.

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import type { Facility, FacilityType, Incident, MeshEvent } from '@scr-mesh/types';
import type { FacilityNode, IncidentRow, MeshEventRow } from './types';

const HISTORY_HOURS = 24;

// ─── Demo facility definitions ───────────────────────────────────────────────
// Tight Bengaluru cluster — all within ~400 m of each other.
// Written to Firestore automatically if the collection is empty so the live
// map always has something to show without requiring a manual seed step.
const DEMO_ROWS: {
  id: string; name: string; type: FacilityType; lat: number; lng: number;
}[] = [
  { id: 'city_gen_hosp',      name: 'City General Hospital', type: 'hospital', lat: 12.9716, lng: 77.5946 },
  { id: 'grand_horizon',      name: 'Grand Horizon Hotel',   type: 'hotel',    lat: 12.9725, lng: 77.5960 },
  { id: 'lincoln_high',       name: 'Lincoln High School',   type: 'school',   lat: 12.9705, lng: 77.5955 },
  { id: 'state_university',   name: 'State University',      type: 'college',  lat: 12.9700, lng: 77.5935 },
  { id: 'apex_manufacturing', name: 'Apex Manufacturing',    type: 'factory',  lat: 12.9728, lng: 77.5930 },
];

function buildFallbackNode(r: typeof DEMO_ROWS[number]): FacilityNode {
  return {
    id: r.id,
    data: {
      name: r.name,
      type: r.type,
      tier: 'standard',
      address: '',
      location: { latitude: r.lat, longitude: r.lng },
      floorPlans: [],
      designations: [],
      subscribedMeshRadiusKm: 10,
      meshCapabilities: {
        canPublish: ['fire', 'medical', 'evacuation'],
        canReceive: ['fire', 'medical', 'evacuation'],
      },
      createdAt: new Date(),
    } as Facility,
    position: { lat: r.lat, lng: r.lng },
  };
}

const FALLBACK_FACILITIES: Record<string, FacilityNode> = Object.fromEntries(
  DEMO_ROWS.map((r) => [r.id, buildFallbackNode(r)]),
);

// Writes the 5 demo facilities to Firestore. Called in the background when
// the collection is found empty so subsequent page loads fetch from Firestore.
async function autoSeedFacilities(): Promise<void> {
  await Promise.all(
    DEMO_ROWS.map((r) =>
      setDoc(doc(db, 'facilities', r.id), {
        name: r.name,
        type: r.type,
        tier: 'standard',
        address: '',
        location: { lat: r.lat, lng: r.lng },
        floorPlans: [],
        designations: [],
        subscribedMeshRadiusKm: 10,
        meshCapabilities: {
          canPublish: ['fire', 'medical', 'evacuation'],
          canReceive: ['fire', 'medical', 'evacuation'],
        },
        createdAt: serverTimestamp(),
      }),
    ),
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsToMs(ts: unknown): number {
  if (!ts) return 0;
  if (ts instanceof Timestamp) return ts.toMillis();
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return (ts as { seconds: number }).seconds * 1000;
  }
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

function normalizeLocation(loc: unknown): { lat: number; lng: number } | null {
  if (!loc || typeof loc !== 'object') return null;
  const anyLoc = loc as Record<string, unknown>;
  if (typeof anyLoc.lat === 'number' && typeof anyLoc.lng === 'number') {
    return { lat: anyLoc.lat, lng: anyLoc.lng };
  }
  if (typeof anyLoc.latitude === 'number' && typeof anyLoc.longitude === 'number') {
    return { lat: anyLoc.latitude as number, lng: anyLoc.longitude as number };
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface MeshLiveData {
  facilities: Record<string, FacilityNode>;
  meshEvents: MeshEventRow[];
  incidents: IncidentRow[];
  loading: boolean;
}

export function useMeshLiveData(): MeshLiveData {
  const { facilityIds } = useAuth();
  const [facilities, setFacilities] = useState<Record<string, FacilityNode>>({});
  const [meshEvents, setMeshEvents] = useState<MeshEventRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to ALL facilities. If the collection is empty (seed not yet run),
  // immediately show the hardcoded fallback positions AND write them to Firestore
  // in the background — the next snapshot callback will then re-render from DB.
  useEffect(() => {
    let seeding = false;
    const unsub = onSnapshot(collection(db, 'facilities'), (snap) => {
      if (snap.empty && !seeding) {
        // Instant fallback so the map isn't blank while Firestore writes happen
        setFacilities(FALLBACK_FACILITIES);
        setLoading(false);
        seeding = true;
        autoSeedFacilities().catch((err) =>
          console.warn('[useMeshLiveData] auto-seed failed:', err),
        );
        return;
      }

      const next: Record<string, FacilityNode> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as Facility;
        const position = normalizeLocation(data.location);
        next[d.id] = {
          id: d.id,
          data,
          // If Firestore doc has no parseable position, fall back to hardcoded
          position: position ?? (FALLBACK_FACILITIES[d.id]?.position ?? null),
        };
      });
      setFacilities(next);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Mesh events: pull last HISTORY_HOURS — used for both live + scrubber.
  useEffect(() => {
    const cutoff = Timestamp.fromMillis(Date.now() - HISTORY_HOURS * 3600_000);
    const q = query(collection(db, 'meshEvents'), where('publishedAt', '>=', cutoff));
    const unsub = onSnapshot(q, (snap) => {
      const rows: MeshEventRow[] = snap.docs.map((d) => {
        const data = d.data() as MeshEvent;
        return { id: d.id, ...data, publishedAtMs: tsToMs(data.publishedAt) };
      });
      rows.sort((a, b) => a.publishedAtMs - b.publishedAtMs);
      setMeshEvents(rows);
    });
    return unsub;
  }, []);

  // Subscribe to ALL incidents — no facilityId filter so cascade incidents
  // appear immediately regardless of whether the user profile has loaded.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'incidents'), (snap) => {
      const rows: IncidentRow[] = snap.docs.map((d) => {
        const data = d.data() as Incident;
        return { id: d.id, ...data, createdAtMs: tsToMs(data.createdAt) };
      });
      setIncidents(rows);
    });
    return unsub;
  }, []);

  // Hydrate any facility referenced by mesh events but missing from the
  // initial facilities snapshot (cross-tenant rendering safety net).
  useEffect(() => {
    const missing = new Set<string>();
    meshEvents.forEach((e) => {
      if (!facilities[e.sourceFacilityId]) missing.add(e.sourceFacilityId);
      e.affectedFacilityIds.forEach((fid) => {
        if (!facilities[fid]) missing.add(fid);
      });
    });
    if (missing.size === 0) return;
    const unsubs = Array.from(missing).map((fid) =>
      onSnapshot(doc(db, 'facilities', fid), (snap) => {
        if (!snap.exists()) {
          // Missing from Firestore — use fallback if we have one
          if (FALLBACK_FACILITIES[fid]) {
            setFacilities((prev) => ({ ...prev, [fid]: FALLBACK_FACILITIES[fid] }));
          }
          return;
        }
        const data = snap.data() as Facility;
        setFacilities((prev) => ({
          ...prev,
          [fid]: {
            id: fid,
            data,
            position: normalizeLocation(data.location) ?? (FALLBACK_FACILITIES[fid]?.position ?? null),
          },
        }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [meshEvents, facilities]);

  // Suppress the unused facilityIds lint warning — kept for future per-tenant
  // filtering when the admin manages a subset of facilities.
  void facilityIds;

  return { facilities, meshEvents, incidents, loading };
}
