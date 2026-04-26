'use client';

import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import { useAuth } from '@/lib/auth';
import { ZoneEditor } from '@/components/floor-plan/ZoneEditor';
import {
  FACILITY_THEME,
  FACILITY_TYPES,
  MESH_EVENT_TYPES,
  ZONE_PRESETS,
} from '@scr-mesh/constants';
import type { Facility, FacilityType, FloorPlan, MeshCapabilities } from '@scr-mesh/types';

export default function FacilityPage() {
  const { facility, loading } = useCurrentFacility();
  const { currentFacilityId } = useAuth();
  const [draft, setDraft] = useState<Facility | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (facility) setDraft(facility.data);
  }, [facility]);

  if (loading || !facility || !draft) {
    return <p className="text-sm text-muted-foreground">Loading facility…</p>;
  }

  function patch<K extends keyof Facility>(key: K, value: Facility[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function patchMesh(next: Partial<MeshCapabilities>) {
    setDraft((prev) =>
      prev ? { ...prev, meshCapabilities: { ...prev.meshCapabilities, ...next } } : prev,
    );
  }

  function toggleMeshEvent(field: 'canPublish' | 'canReceive', eventType: string) {
    if (!draft) return;
    const current = draft.meshCapabilities?.[field] ?? [];
    const next = current.includes(eventType)
      ? current.filter((v) => v !== eventType)
      : [...current, eventType];
    patchMesh({ [field]: next } as Partial<MeshCapabilities>);
  }

  function addFloor() {
    if (!draft) return;
    const newFloor: FloorPlan = {
      floorId: `floor-${Date.now()}`,
      name: `Floor ${(draft.floorPlans?.length ?? 0) + 1}`,
      zones: [],
    };
    patch('floorPlans', [...(draft.floorPlans ?? []), newFloor]);
  }

  function updateFloor(floorId: string, name: string, zonesCsv: string) {
    if (!draft) return;
    patch(
      'floorPlans',
      (draft.floorPlans ?? []).map((f) =>
        f.floorId === floorId
          ? { ...f, name, zones: zonesCsv.split(',').map((z) => z.trim()).filter(Boolean) }
          : f,
      ),
    );
  }

  function removeFloor(floorId: string) {
    if (!draft) return;
    patch('floorPlans', (draft.floorPlans ?? []).filter((f) => f.floorId !== floorId));
  }

  async function save() {
    if (!facility || !draft) return;
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'facilities', facility.id), {
        name: draft.name,
        type: draft.type,
        tier: draft.tier,
        address: draft.address,
        floorPlans: draft.floorPlans ?? [],
        subscribedMeshRadiusKm: draft.subscribedMeshRadiusKm ?? 5,
        meshCapabilities: draft.meshCapabilities ?? { canPublish: [], canReceive: [] },
      });
      setSavedAt(Date.now());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function applyZonePresets() {
    if (!draft) return;
    const presets = ZONE_PRESETS[draft.type];
    const next: FloorPlan[] = [
      {
        floorId: 'floor-default',
        name: 'Main Floor',
        zones: presets,
      },
    ];
    patch('floorPlans', next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facility</h1>
        <p className="text-sm text-muted-foreground">Configure {draft.name}.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name" className="mb-1 block">Name</Label>
            <Input id="name" value={draft.name ?? ''} onChange={(e) => patch('name', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="type" className="mb-1 block">Facility type</Label>
            <Select id="type" value={draft.type} onChange={(e) => patch('type', e.target.value as FacilityType)}>
              {FACILITY_TYPES.map((t) => (
                <option key={t} value={t}>{FACILITY_THEME[t].label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tier" className="mb-1 block">Tier</Label>
            <Input id="tier" value={draft.tier ?? ''} onChange={(e) => patch('tier', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="address" className="mb-1 block">Address</Label>
            <Input id="address" value={draft.address ?? ''} onChange={(e) => patch('address', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Floor plans &amp; zones</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={applyZonePresets}>
              Apply presets for {FACILITY_THEME[draft.type].label}
            </Button>
            <Button size="sm" onClick={addFloor}>Add floor</Button>
          </div>
        </CardHeader>
        <CardContent>
          {(draft.floorPlans ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No floors yet. Add one or apply presets.</p>
          ) : (
            <ul className="space-y-3">
              {(draft.floorPlans ?? []).map((f) => (
                <li key={f.floorId} className="grid grid-cols-1 items-center gap-3 rounded-md border p-3 md:grid-cols-12">
                  <Input
                    className="md:col-span-3"
                    value={f.name}
                    onChange={(e) => updateFloor(f.floorId, e.target.value, f.zones.join(', '))}
                  />
                  <Input
                    className="md:col-span-8"
                    placeholder="Zone names, comma-separated"
                    value={f.zones.join(', ')}
                    onChange={(e) => updateFloor(f.floorId, f.name, e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="md:col-span-1"
                    onClick={() => removeFloor(f.floorId)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mesh capabilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="radius" className="shrink-0">Subscribe radius (km)</Label>
            <Input
              id="radius"
              type="number"
              min={0}
              max={50}
              className="w-24"
              value={draft.subscribedMeshRadiusKm ?? 5}
              onChange={(e) => patch('subscribedMeshRadiusKm', Number(e.target.value))}
            />
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-2">
            {MESH_EVENT_TYPES.map((evt) => {
              const canPub = draft.meshCapabilities?.canPublish?.includes(evt.value) ?? false;
              const canRcv = draft.meshCapabilities?.canReceive?.includes(evt.value) ?? false;
              return (
                <div key={evt.value} className="flex items-start gap-3 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{evt.label}</span>
                      <Badge variant="outline" className="text-xs">{evt.value}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{evt.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={canPub} onCheckedChange={() => toggleMeshEvent('canPublish', evt.value)} />
                      Publish
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={canRcv} onCheckedChange={() => toggleMeshEvent('canReceive', evt.value)} />
                      Receive
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Indoor zone navigation graph editor */}
      {currentFacilityId && (
        <Card>
          <CardHeader>
            <CardTitle>Indoor Navigation Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Define zone connections for indoor evacuation pathfinding. Use{' '}
              <strong>Connect mode</strong> to draw edges between zones,{' '}
              <strong>Mark Exit</strong> to designate emergency exits, and{' '}
              <strong>Hazard</strong> to flag chemical or fire risk zones.
            </p>
            <ZoneEditor
              facilityId={currentFacilityId}
              facilityType={draft.type}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {error && <span className="text-destructive">{error}</span>}
          {!error && savedAt && <span>Saved {new Date(savedAt).toLocaleTimeString()}.</span>}
        </div>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </div>
  );
}
