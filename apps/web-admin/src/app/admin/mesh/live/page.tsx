'use client';

// /admin/mesh/live — the "money shot" view. Full-screen Google Map +
// animated arcs + live event stream + time scrubber + heatmap toggle.

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Flame, FlameKindling, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMeshLiveData } from '@/components/mesh-live/useMeshLiveData';
import { MeshMap, ACCENT_HEX } from '@/components/mesh-live/MeshMap';
import { EventStreamPanel } from '@/components/mesh-live/EventStreamPanel';
import { TimeScrubber } from '@/components/mesh-live/TimeScrubber';
import type { ActiveArc, MeshEventRow } from '@/components/mesh-live/types';
import { runGrandFinale, type CascadeProgress } from '@/lib/demo/runCascade';
import { CreateIncidentModal } from '@/components/mesh-live/CreateIncidentModal';

interface ArcsOptions {
  cutoffMs: number | null;
  /** Now-reference: in live mode, Date.now(); in replay mode, the cutoff. */
  nowRef: number;
  /** How long each arc stays visible after its event fires, in ms. */
  arcLifetimeMs: number;
}

function buildArcs(
  events: MeshEventRow[],
  facilities: ReturnType<typeof useMeshLiveData>['facilities'],
  { cutoffMs, nowRef, arcLifetimeMs }: ArcsOptions,
): ActiveArc[] {
  const arcs: ActiveArc[] = [];
  const windowEnd = cutoffMs ?? nowRef;
  const windowStart = windowEnd - arcLifetimeMs;

  events.forEach((e) => {
    if (e.publishedAtMs > windowEnd) return;
    if (e.publishedAtMs < windowStart) return;
    const src = facilities[e.sourceFacilityId];
    if (!src?.position) return;
    const color = ACCENT_HEX[src.data.type];
    e.affectedFacilityIds.forEach((tgtId) => {
      const tgt = facilities[tgtId];
      if (!tgt?.position) return;
      arcs.push({
        key: `${e.id}__${tgtId}`,
        meshEventId: e.id,
        eventType: e.eventType,
        source: src.position!,
        target: tgt.position!,
        targetFacilityId: tgtId,
        color,
      });
    });
  });
  return arcs;
}

export default function MeshLivePage() {
  const { facilities, meshEvents, incidents, loading } = useMeshLiveData();
  const [cutoffMs, setCutoffMs] = useState<number | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [cascade, setCascade] = useState<CascadeProgress | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [zoneTarget, setZoneTarget] = useState<{ facilityId: string; facilityType: string; facilityName: string; zone: string } | null>(null);

  // Tick every second in live mode so arcs age off naturally.
  const [nowRef, setNowRef] = useState(() => Date.now());
  useEffect(() => {
    if (cutoffMs != null) return;
    const id = window.setInterval(() => setNowRef(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [cutoffMs]);

  // During cascade keep arcs alive long enough to see all hops; otherwise 15s.
  const arcLifetimeMs = cascade?.phase === 'running' ? 60_000 : 15_000;

  const handleRunCascade = useCallback(() => {
    if (cascade?.phase === 'running') return;
    setFitTrigger((t) => t + 1);
    setCascade({ phase: 'running', step: 'Initialising…', hopCount: 0, eventCount: 0, notificationCount: 0, elapsedMs: 0 });
    runGrandFinale((p) => setCascade(p));
  }, [cascade]);

  const arcs = useMemo(
    () => buildArcs(meshEvents, facilities, { cutoffMs, nowRef, arcLifetimeMs }),
    [meshEvents, facilities, cutoffMs, nowRef, arcLifetimeMs],
  );

  const [minMs, maxMs] = useMemo<[number | null, number | null]>(() => {
    if (meshEvents.length === 0) return [null, null];
    const first = meshEvents[0].publishedAtMs;
    const last = meshEvents[meshEvents.length - 1].publishedAtMs;
    return [first, last];
  }, [meshEvents]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background lg:left-60">
      {/* Header strip */}
      <header className="flex items-center justify-between border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <div>
          <h1 className="text-sm font-semibold">Live mesh</h1>
          <p className="text-[11px] text-muted-foreground">
            {Object.keys(facilities).length} facilities ·{' '}
            {meshEvents.length} mesh events (last 24h) · {arcs.length} active arcs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Demo cascade button */}
          <Button
            size="sm"
            variant={cascade?.phase === 'done' ? 'outline' : 'destructive'}
            disabled={cascade?.phase === 'running'}
            onClick={handleRunCascade}
            className="gap-1.5"
          >
            {cascade?.phase === 'running' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : cascade?.phase === 'done' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : cascade?.phase === 'error' ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {cascade?.phase === 'running'
              ? 'Running cascade…'
              : cascade?.phase === 'done'
              ? 'Cascade done'
              : cascade?.phase === 'error'
              ? 'Retry cascade'
              : 'Run demo cascade'}
          </Button>
          <Button
            size="sm"
            variant={showHeatmap ? 'default' : 'outline'}
            onClick={() => setShowHeatmap((s) => !s)}
          >
            {showHeatmap ? (
              <Flame className="mr-1 h-3.5 w-3.5" />
            ) : (
              <FlameKindling className="mr-1 h-3.5 w-3.5" />
            )}
            Heatmap {showHeatmap ? 'on' : 'off'}
          </Button>
        </div>
      </header>

      {/* Cascade progress bar */}
      {cascade && cascade.phase !== 'idle' && (
        <div className={`border-b px-4 py-1.5 text-[11px] ${
          cascade.phase === 'error'
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : cascade.phase === 'done'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : 'border-primary/20 bg-primary/5 text-primary'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <span className="truncate font-medium">{cascade.step}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {cascade.eventCount} events · hop {cascade.hopCount} · {cascade.notificationCount.toLocaleString()} notifs · {(cascade.elapsedMs / 1000).toFixed(1)}s
            </span>
          </div>
          {cascade.phase === 'running' && (
            <div className="mt-1 h-0.5 w-full overflow-hidden rounded bg-primary/20">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, (cascade.elapsedMs / 55000) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Map + side panel */}
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {loading && (
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded bg-background/80 px-3 py-1 text-xs text-muted-foreground">
              Loading facilities…
            </div>
          )}
          <MeshMap
            facilities={facilities}
            arcs={arcs}
            incidents={incidents}
            showHeatmap={showHeatmap}
            fitTrigger={fitTrigger}
            onZoneClick={setZoneTarget}
          />
        </div>
        <EventStreamPanel
          events={meshEvents}
          facilities={facilities}
          replayCutoffMs={cutoffMs}
        />
      </div>

      {/* Scrubber */}
      <TimeScrubber
        minMs={minMs}
        maxMs={maxMs}
        cutoffMs={cutoffMs}
        onChange={setCutoffMs}
      />

      {/* Zone click → Create Incident modal */}
      {zoneTarget && (
        <CreateIncidentModal
          {...zoneTarget}
          onClose={() => setZoneTarget(null)}
          onCreated={() => setZoneTarget(null)}
        />
      )}
    </div>
  );
}
