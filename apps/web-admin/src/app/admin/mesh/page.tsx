'use client';

// FLAGSHIP page. Four tabs:
//   1. Inbox        — events targeting this facility
//   2. Outbox       — events this facility published
//   3. Connected    — radial diagram of facilities in mesh
//   4. Subscription — which event types to receive + radius
//
// Mesh events themselves are written by the gemini-orchestrator service —
// the admin UI is read + acknowledge / dismiss only.

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import { FACILITY_THEME, MESH_EVENT_TYPES } from '@scr-mesh/constants';
import type { Facility, FacilityType, MeshEvent, MeshSubscription } from '@scr-mesh/types';
import { ConnectedFacilities } from './ConnectedFacilities';

interface FacilityLite {
  id: string;
  name: string;
  type: FacilityType;
}

export default function MeshPage() {
  const { currentFacilityId } = useAuth();
  const { facility } = useCurrentFacility();
  const [inbox, setInbox] = useState<(MeshEvent & { id: string })[]>([]);
  const [outbox, setOutbox] = useState<(MeshEvent & { id: string })[]>([]);
  const [subscription, setSubscription] = useState<(MeshSubscription & { id: string }) | null>(null);
  const [allFacilities, setAllFacilities] = useState<FacilityLite[]>([]);

  // Inbox
  useEffect(() => {
    if (!currentFacilityId) return;
    const q = query(
      collection(db, 'meshEvents'),
      where('affectedFacilityIds', 'array-contains', currentFacilityId),
    );
    return onSnapshot(q, (snap) =>
      setInbox(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MeshEvent) }))),
    );
  }, [currentFacilityId]);

  // Outbox
  useEffect(() => {
    if (!currentFacilityId) return;
    const q = query(
      collection(db, 'meshEvents'),
      where('sourceFacilityId', '==', currentFacilityId),
    );
    return onSnapshot(q, (snap) =>
      setOutbox(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MeshEvent) }))),
    );
  }, [currentFacilityId]);

  // Subscription doc (id == facilityId for simplicity)
  useEffect(() => {
    if (!currentFacilityId) return;
    const q = query(
      collection(db, 'meshSubscriptions'),
      where('facilityId', '==', currentFacilityId),
    );
    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        setSubscription(null);
        return;
      }
      const d = snap.docs[0];
      setSubscription({ id: d.id, ...(d.data() as MeshSubscription) });
    });
  }, [currentFacilityId]);

  // One-shot read of facilities for the radial diagram. We refresh on
  // mount + facility change rather than streaming — facilities change
  // rarely and a live subscription would be wasteful.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snap = await getDocs(collection(db, 'facilities'));
      if (cancelled) return;
      setAllFacilities(
        snap.docs.map((d) => {
          const data = d.data() as Facility;
          return { id: d.id, name: data.name, type: data.type };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [currentFacilityId]);

  const others = useMemo(() => {
    if (!currentFacilityId) return [];
    const activeIds = new Set(
      inbox.filter((e) => e.status === 'published').flatMap((e) => [e.sourceFacilityId]),
    );
    outbox
      .filter((e) => e.status === 'published')
      .forEach((e) => e.affectedFacilityIds.forEach((id) => activeIds.add(id)));
    return allFacilities
      .filter((f) => f.id !== currentFacilityId)
      .map((f) => ({ ...f, active: activeIds.has(f.id) }));
  }, [allFacilities, currentFacilityId, inbox, outbox]);

  async function ackInbound(eventId: string) {
    await updateDoc(doc(db, 'meshEvents', eventId), { status: 'acknowledged' });
  }

  async function saveSubscription(updates: Partial<MeshSubscription>) {
    if (!currentFacilityId) return;
    if (subscription) {
      await updateDoc(doc(db, 'meshSubscriptions', subscription.id), updates);
    } else {
      const id = `sub-${currentFacilityId}`;
      const fresh: MeshSubscription = {
        facilityId: currentFacilityId,
        eventTypes: updates.eventTypes ?? [],
        radiusKm: updates.radiusKm ?? 5,
        active: updates.active ?? true,
      };
      await setDoc(doc(db, 'meshSubscriptions', id), fresh);
    }
  }

  function toggleEventType(value: string) {
    const current = subscription?.eventTypes ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    saveSubscription({ eventTypes: next });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mesh</h1>
        <p className="text-sm text-muted-foreground">
          Cross-facility coordination for {facility?.data.name ?? 'this facility'}.
        </p>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox ({inbox.filter((e) => e.status === 'published').length})</TabsTrigger>
          <TabsTrigger value="outbox">Outbox ({outbox.length})</TabsTrigger>
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <EventList
            events={inbox}
            emptyText="No incoming mesh events."
            kind="inbox"
            onAck={ackInbound}
          />
        </TabsContent>

        <TabsContent value="outbox">
          <EventList events={outbox} emptyText="This facility hasn't published any mesh events." kind="outbox" />
        </TabsContent>

        <TabsContent value="connected">
          <Card>
            <CardHeader><CardTitle>Connected facilities</CardTitle></CardHeader>
            <CardContent className="text-foreground">
              <ConnectedFacilities
                center={facility ? { name: facility.data.name, type: facility.data.type } : null}
                others={others}
              />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Solid lines indicate an active mesh event involving that facility.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader><CardTitle>Subscription</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="active" className="shrink-0">Active</Label>
                <Switch
                  id="active"
                  checked={subscription?.active ?? true}
                  onCheckedChange={(v) => saveSubscription({ active: v })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="radius" className="shrink-0">Radius (km)</Label>
                <Input
                  id="radius"
                  type="number"
                  min={0}
                  max={50}
                  className="w-24"
                  value={subscription?.radiusKm ?? 5}
                  onChange={(e) => saveSubscription({ radiusKm: Number(e.target.value) })}
                />
              </div>
              <Separator />
              <div>
                <Label className="mb-2 block">Event types to receive</Label>
                <div className="grid grid-cols-1 gap-2">
                  {MESH_EVENT_TYPES.map((evt) => {
                    const checked = subscription?.eventTypes?.includes(evt.value) ?? false;
                    return (
                      <label
                        key={evt.value}
                        className="flex items-start gap-3 rounded-md border p-3 text-sm"
                      >
                        <Switch checked={checked} onCheckedChange={() => toggleEventType(evt.value)} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{evt.label}</span>
                            <Badge variant="outline" className="text-xs">{evt.value}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{evt.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventList({
  events,
  emptyText,
  kind,
  onAck,
}: {
  events: (MeshEvent & { id: string })[];
  emptyText: string;
  kind: 'inbox' | 'outbox';
  onAck?: (id: string) => void;
}) {
  const sorted = [...events].sort((a, b) => toMillis(b.publishedAt) - toMillis(a.publishedAt));
  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">{emptyText}</CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {sorted.map((e) => {
            const sourceTheme = FACILITY_THEME[e.sourceFacilityType];
            return (
              <li key={e.id} className="grid grid-cols-12 items-start gap-3 p-4">
                <div className="col-span-9 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={sourceTheme.accentClass}>{sourceTheme.label}</Badge>
                    <span className="text-sm font-semibold">{e.eventType}</span>
                    <Badge variant="outline">{e.status}</Badge>
                    <span className="text-xs text-muted-foreground">radius {e.radiusKm}km</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {kind === 'inbox' ? 'From' : 'To'}{' '}
                    {kind === 'inbox' ? e.sourceFacilityId : e.affectedFacilityIds.join(', ')}
                    {' · '}targeting {e.targetFacilityTypes.join(', ')}
                  </p>
                </div>
                <div className="col-span-2 text-right text-xs text-muted-foreground">
                  {formatRelative(e.publishedAt)}
                </div>
                <div className="col-span-1 text-right">
                  {kind === 'inbox' && e.status === 'published' && onAck && (
                    <Button size="sm" variant="outline" onClick={() => onAck(e.id)}>
                      Ack
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function toMillis(t: MeshEvent['publishedAt']): number {
  if (!t) return 0;
  if (t instanceof Date) return t.getTime();
  if ('seconds' in t) return t.seconds * 1000;
  return 0;
}

function formatRelative(t: MeshEvent['publishedAt']): string {
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
