'use client';

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  Building2,
  Network,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import {
  FACILITY_THEME,
  SEVERITY_BADGE_CLASS,
  STATUS_BADGE_CLASS,
} from '@scr-mesh/constants';
import { cn } from '@/lib/utils';
import type { Facility, Incident, MeshEvent, ZoneCheckIn } from '@scr-mesh/types';

const ACTIVE_STATUSES = ['reported', 'acknowledged', 'in_progress'] as const;

export default function OverviewPage() {
  const { currentFacilityId, facilityIds, setCurrentFacilityId } = useAuth();
  const { facility } = useCurrentFacility();

  // ── All facilities the admin manages ──────────────────────────────────
  const [facilities, setFacilities] = useState<Record<string, Facility>>({});

  useEffect(() => {
    if (facilityIds.length === 0) return;
    const unsubs = facilityIds.map((fid) =>
      onSnapshot(doc(db, 'facilities', fid), (snap) => {
        if (snap.exists()) {
          setFacilities((prev) => ({ ...prev, [snap.id]: snap.data() as Facility }));
        }
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [facilityIds]);

  // ── Incidents across ALL admin facilities (single `in` query) ─────────
  const [allIncidents, setAllIncidents] = useState<(Incident & { id: string })[]>([]);

  useEffect(() => {
    if (facilityIds.length === 0) return;
    const q = query(
      collection(db, 'incidents'),
      where('facilityId', 'in', facilityIds),
    );
    return onSnapshot(q, (snap) =>
      setAllIncidents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Incident) }))),
    );
  }, [facilityIds]);

  // ── Current facility specific data ────────────────────────────────────
  const [checkIns, setCheckIns] = useState<(ZoneCheckIn & { id: string })[]>([]);
  const [meshIn, setMeshIn] = useState<(MeshEvent & { id: string })[]>([]);

  useEffect(() => {
    if (!currentFacilityId) return;
    const q = query(
      collection(db, 'zoneCheckIns'),
      where('facilityId', '==', currentFacilityId),
    );
    return onSnapshot(q, (snap) =>
      setCheckIns(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ZoneCheckIn) }))),
    );
  }, [currentFacilityId]);

  useEffect(() => {
    if (!currentFacilityId) return;
    const q = query(
      collection(db, 'meshEvents'),
      where('affectedFacilityIds', 'array-contains', currentFacilityId),
    );
    return onSnapshot(q, (snap) =>
      setMeshIn(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MeshEvent) }))),
    );
  }, [currentFacilityId]);

  // ── Derived stats for currently-selected facility ─────────────────────
  const currentIncidents = allIncidents.filter((i) => i.facilityId === currentFacilityId);
  const activeIncidents = currentIncidents.filter((i) =>
    ACTIVE_STATUSES.includes(i.status as (typeof ACTIVE_STATUSES)[number]),
  );
  const activeCheckIns = checkIns.filter((c) => !c.checkedOutAt);
  const zonesCovered = new Set(activeCheckIns.map((c) => c.zone)).size;
  const incomingMesh = meshIn.filter((m) => m.status === 'published').length;

  const stats: { value: number; label: string; icon: LucideIcon; hint: string }[] = [
    { value: activeIncidents.length, label: 'Active incidents', icon: AlertTriangle, hint: 'reported · acknowledged · in progress' },
    { value: activeCheckIns.length, label: 'Staff on site', icon: Users, hint: 'open zone check-ins' },
    { value: zonesCovered, label: 'Zones covered', icon: Activity, hint: 'distinct zones with people present' },
    { value: incomingMesh, label: 'Incoming mesh events', icon: Network, hint: 'published events targeting this facility' },
  ];

  const recent = [...activeIncidents]
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 5);

  const theme = facility ? FACILITY_THEME[facility.data.type] : null;

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          All facilities at a glance — click a card to view its statistics
        </p>
      </div>

      {/* ── Facility selector cards ─────────────────────────────────────── */}
      {(() => {
        const seen = new Set<string>();
        const filteredIds = facilityIds.filter((fid) => {
          const fac = facilities[fid];
          if (!fac) return true;
          if (seen.has(fac.name)) return false;
          if (fac.name === 'Demo Hospital' || fac.name === 'demo_hospital') return false;
          seen.add(fac.name);
          return true;
        });

        if (filteredIds.length <= 1) return null;

        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {filteredIds.map((fid) => {
              const fac = facilities[fid];
              const facTheme = fac ? FACILITY_THEME[fac.type] : null;
              const incidentCount = allIncidents.filter(
                (i) =>
                  i.facilityId === fid &&
                  ACTIVE_STATUSES.includes(i.status as (typeof ACTIVE_STATUSES)[number]),
              ).length;
              const isSelected = fid === currentFacilityId;

              return (
                <Card
                  key={fid}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    isSelected && 'ring-2 ring-primary shadow-md',
                  )}
                  onClick={() => setCurrentFacilityId(fid)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-medium truncate">
                        {fac?.name ?? fid}
                      </CardTitle>
                      {facTheme && (
                        <Badge className={cn(facTheme.accentClass, 'shrink-0')} variant="outline">
                          {facTheme.short}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-bold">{incidentCount}</span>
                      <span className="text-xs text-muted-foreground">active</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* ── Selected facility header ────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">
          {facility?.data.name ?? 'Loading…'}
        </h2>
        {theme && <Badge className={theme.accentClass}>{theme.label}</Badge>}
      </div>

      {/* ── KPI cards for selected facility ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Recent incidents for selected facility ──────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Recent active incidents</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active incidents. All clear.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{i.type}</span>
                      <Badge variant="outline" className={SEVERITY_BADGE_CLASS[i.severity]}>
                        {i.severity}
                      </Badge>
                      <Badge variant="outline" className={STATUS_BADGE_CLASS[i.status] ?? ''}>
                        {i.status}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.location.zone} · floor {i.location.floor} · {i.description}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                    {formatRelative(i.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function toMillis(t: Incident['createdAt']): number {
  if (!t) return 0;
  if (t instanceof Date) return t.getTime();
  if ('seconds' in t) return t.seconds * 1000;
  return 0;
}

function formatRelative(t: Incident['createdAt']): string {
  const ms = toMillis(t);
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
