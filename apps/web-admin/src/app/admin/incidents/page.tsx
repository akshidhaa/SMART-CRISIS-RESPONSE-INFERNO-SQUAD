'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import {
  INCIDENT_TYPES_BY_FACILITY,
  SEVERITY_BADGE_CLASS,
  STATUS_BADGE_CLASS,
  ZONE_PRESETS,
} from '@scr-mesh/constants';
import type { Incident, IncidentSeverity, IncidentStatus } from '@scr-mesh/types';

const ALL_STATUSES: (IncidentStatus | 'all')[] = [
  'all', 'reported', 'acknowledged', 'in_progress', 'resolved', 'closed',
];
const ALL_SEVERITIES = ['all', 'low', 'medium', 'high', 'critical'] as const;

const NEXT_STATUS: Record<IncidentStatus, IncidentStatus | null> = {
  reported: 'acknowledged',
  acknowledged: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
  closed: null,
};

interface CreateForm {
  type: string;
  severity: IncidentSeverity;
  zone: string;
  floor: string;
  description: string;
}

const BLANK_FORM: CreateForm = {
  type: '',
  severity: 'medium',
  zone: '',
  floor: '1',
  description: '',
};

export default function IncidentsPage() {
  const { currentFacilityId, user, role } = useAuth();
  const uid = user?.uid;
  const { facility } = useCurrentFacility();

  const [incidents, setIncidents] = useState<(Incident & { id: string })[]>([]);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<(typeof ALL_SEVERITIES)[number]>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentFacilityId) return;
    const q = query(
      collection(db, 'incidents'),
      where('facilityId', '==', currentFacilityId),
    );
    return onSnapshot(q, (snap) =>
      setIncidents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Incident) }))),
    );
  }, [currentFacilityId]);

  const incidentTypes = facility ? INCIDENT_TYPES_BY_FACILITY[facility.data.type] : [];

  const zones = useMemo(() => {
    const zonePresets = facility ? ZONE_PRESETS[facility.data.type] : [];
    const set = new Set<string>(zonePresets);
    incidents.forEach((i) => set.add(i.location.zone));
    return Array.from(set).sort();
  }, [incidents, facility]);

  const filtered = incidents
    .filter((i) => statusFilter === 'all' || i.status === statusFilter)
    .filter((i) => severityFilter === 'all' || i.severity === severityFilter)
    .filter((i) => typeFilter === 'all' || i.type === typeFilter)
    .filter((i) => zoneFilter === 'all' || i.location.zone === zoneFilter)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

  function handleTypeChange(value: string) {
    const typeOption = incidentTypes.find((t) => t.value === value);
    setForm((f) => ({
      ...f,
      type: value,
      severity: typeOption ? typeOption.defaultSeverity : f.severity,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentFacilityId || !facility || !uid) return;
    if (!form.type || !form.zone) {
      setCreateError('Type and zone are required.');
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      await addDoc(collection(db, 'incidents'), {
        facilityId: currentFacilityId,
        facilityType: facility.data.type,
        type: form.type,
        severity: form.severity,
        status: 'reported' as IncidentStatus,
        reporterId: uid,
        reporterRole: role ?? 'admin',
        location: { zone: form.zone, floor: form.floor },
        description: form.description.trim(),
        assignedStaff: [],
        meshEventsFired: [],
        createdAt: serverTimestamp() as unknown as Incident['createdAt'],
      });
      setForm(BLANK_FORM);
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create incident.');
    } finally {
      setSubmitting(false);
    }
  }

  async function advanceStatus(incident: Incident & { id: string }) {
    const next = NEXT_STATUS[incident.status];
    if (!next) return;
    const patch: Partial<Incident> = { status: next };
    if (next === 'acknowledged') patch.acknowledgedAt = new Date();
    if (next === 'resolved') patch.resolvedAt = new Date();
    await updateDoc(doc(db, 'incidents', incident.id), patch);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
          <p className="text-sm text-muted-foreground">
            Live feed for {facility?.data.name ?? 'this facility'}.
          </p>
        </div>
        <Button onClick={() => { setShowCreate((s) => !s); setCreateError(null); }}>
          {showCreate ? 'Cancel' : '+ Report Incident'}
        </Button>
      </div>

      {showCreate && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Report a new incident</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-1 block">Incident type *</Label>
                <Select
                  value={form.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  required
                >
                  <option value="">— select type —</option>
                  {incidentTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label className="mb-1 block">Severity</Label>
                <Select
                  value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as IncidentSeverity }))}
                >
                  {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label className="mb-1 block">Zone *</Label>
                <Select
                  value={form.zone}
                  onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                  required
                >
                  <option value="">— select zone —</option>
                  {zones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label className="mb-1 block">Floor / Level</Label>
                <Input
                  value={form.floor}
                  onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                  placeholder="e.g. G, 1, 2, Basement"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="mb-1 block">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of the situation…"
                  rows={3}
                />
              </div>

              {createError && (
                <p className="sm:col-span-2 text-sm text-destructive">{createError}</p>
              )}

              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowCreate(false); setForm(BLANK_FORM); }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Reporting…' : 'Report incident'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="mb-1 block">Status</Label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | 'all')}
              >
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Severity</Label>
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as (typeof ALL_SEVERITIES)[number])}
              >
                {ALL_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Type</Label>
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">all</option>
                {incidentTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Zone</Label>
              <Select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
                <option value="all">all</option>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} incident{filtered.length === 1 ? '' : 's'}</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incidents match the current filters.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((i) => {
                const next = NEXT_STATUS[i.status];
                return (
                  <li key={i.id} className="grid grid-cols-12 items-start gap-3 py-3">
                    <div className="col-span-7 min-w-0 sm:col-span-8">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {incidentTypes.find((t) => t.value === i.type)?.label ?? i.type}
                        </span>
                        <Badge variant="outline" className={SEVERITY_BADGE_CLASS[i.severity]}>
                          {i.severity}
                        </Badge>
                        <Badge variant="outline" className={STATUS_BADGE_CLASS[i.status] ?? ''}>
                          {i.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {i.location.zone} · floor {i.location.floor}
                        </span>
                      </div>
                      {i.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {i.description}
                        </p>
                      )}
                    </div>
                    <div className="col-span-3 text-right text-xs text-muted-foreground sm:col-span-2">
                      {formatRelative(i.createdAt)}
                    </div>
                    <div className="col-span-2 text-right">
                      {next && (
                        <Button size="sm" variant="outline" onClick={() => advanceStatus(i)}>
                          Mark {next.replace('_', ' ')}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
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