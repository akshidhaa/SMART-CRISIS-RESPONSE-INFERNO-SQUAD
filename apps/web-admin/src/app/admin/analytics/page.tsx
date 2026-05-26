'use client';

// Analytics. Lightweight in-house bar charts — pulling in recharts/visx is
// overkill for four small charts. Numbers are computed client-side from
// onSnapshot streams so the dashboard is always fresh.

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import type { Incident, MeshEvent } from '@scr-mesh/types';

const HISTORY_DAYS = 14;

type AnalyticsIncidentRow = Incident & {
  id: string;
  createdAtMs: number;
  reportedAtMs: number;
};

type AnalyticsMeshEventRow = MeshEvent & {
  id: string;
  publishedAtMs: number;
};

export default function AnalyticsPage() {
  const { currentFacilityId } = useAuth();
  const [incidents, setIncidents] = useState<AnalyticsIncidentRow[]>([]);
  const [meshIn, setMeshIn] = useState<AnalyticsMeshEventRow[]>([]);
  const [meshOut, setMeshOut] = useState<AnalyticsMeshEventRow[]>([]);

  useEffect(() => {
    if (!currentFacilityId) return;
    return onSnapshot(
      query(collection(db, 'incidents'), where('facilityId', '==', currentFacilityId)),
      (snap) => setIncidents(snap.docs.map((d) => {
        const data = d.data() as Incident;
        return {
          id: d.id,
          ...data,
          createdAtMs: toMillis(data.createdAt),
          reportedAtMs: data.reportedAtMs ?? toMillis(data.createdAt),
        };
      })),
    );
  }, [currentFacilityId]);

  useEffect(() => {
    if (!currentFacilityId) return;
    return onSnapshot(
      query(collection(db, 'meshEvents'), where('affectedFacilityIds', 'array-contains', currentFacilityId)),
      (snap) => setMeshIn(snap.docs.map((d) => {
        const data = d.data() as MeshEvent;
        return { id: d.id, ...data, publishedAtMs: toMillis(data.publishedAt) };
      })),
    );
  }, [currentFacilityId]);

  useEffect(() => {
    if (!currentFacilityId) return;
    return onSnapshot(
      query(collection(db, 'meshEvents'), where('sourceFacilityId', '==', currentFacilityId)),
      (snap) => setMeshOut(snap.docs.map((d) => {
        const data = d.data() as MeshEvent;
        return { id: d.id, ...data, publishedAtMs: toMillis(data.publishedAt) };
      })),
    );
  }, [currentFacilityId]);

  // Aggregations
  const incidentHistory = useMemo(
    () => bucketByDay(incidents.map((i) => i.createdAtMs), HISTORY_DAYS),
    [incidents],
  );

  const meshHistory = useMemo(
    () => ({
      received: bucketByDay(meshIn.map((m) => m.publishedAtMs), HISTORY_DAYS),
      published: bucketByDay(meshOut.map((m) => m.publishedAtMs), HISTORY_DAYS),
    }),
    [meshIn, meshOut],
  );

  const mta = useMemo(() => {
    const deltas = incidents
      .map((i) => {
        const a = toMillis(i.acknowledgedAt);
        const c = toMillis(i.createdAt);
        return a > 0 && c > 0 ? a - c : null;
      })
      .filter((x): x is number => x !== null);
    return deltas.length ? Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length / 1000) : null;
  }, [incidents]);

  const mtr = useMemo(() => {
    const deltas = incidents
      .map((i) => {
        const r = toMillis(i.resolvedAt);
        const c = toMillis(i.createdAt);
        return r > 0 && c > 0 ? r - c : null;
      })
      .filter((x): x is number => x !== null);
    return deltas.length ? Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length / 1000) : null;
  }, [incidents]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Last {HISTORY_DAYS} days · live.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total incidents" value={incidents.length} />
        <Stat label="MTA" value={mta != null ? formatDuration(mta) : '—'} hint="mean time to acknowledge" />
        <Stat label="MTR" value={mtr != null ? formatDuration(mtr) : '—'} hint="mean time to resolve" />
        <Stat label="Mesh events" value={meshIn.length + meshOut.length} hint={`${meshOut.length} out · ${meshIn.length} in`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident history</CardTitle>
          <CardDescription>Daily incident count for the last {HISTORY_DAYS} days</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={incidentHistory} colorClass="bg-primary" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mesh event contribution</CardTitle>
          <CardDescription>Published (this facility) vs Received (from neighbors)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Published</div>
            <BarChart data={meshHistory.published} colorClass="bg-emerald-500" />
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Received</div>
            <BarChart data={meshHistory.received} colorClass="bg-blue-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function BarChart({ data, colorClass }: { data: { day: string; count: number }[]; colorClass: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((d) => {
        const h = (d.count / max) * 100;
        return (
          <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div
              className={`w-full rounded-t ${colorClass} transition-all`}
              style={{ height: `${Math.max(2, h)}%` }}
              title={`${d.day}: ${d.count}`}
            />
            <span className="text-[9px] text-muted-foreground">{d.day.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

function toMillis(t: Incident['createdAt'] | undefined): number {
  if (!t) return 0;
  if (t instanceof Date) return t.getTime();
  if ('seconds' in t) return t.seconds * 1000;
  return 0;
}

function bucketByDay(timestamps: number[], days: number): { day: string; count: number }[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    buckets.set(formatDay(d), 0);
  }

  for (const ts of timestamps) {
    if (!ts) continue;
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    const key = formatDay(d);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([day, count]) => ({ day, count }));
}

function formatDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${seconds % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
