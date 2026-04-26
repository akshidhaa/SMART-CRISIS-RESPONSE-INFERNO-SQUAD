'use client';

// Admin zone graph editor — SVG-based, click-to-connect interface.
// Loads the pre-built graph for the facility type as the default.
// Admins can toggle connections, set exits, and mark hazard tags.
// Saved to Firestore: facilityGraphs/{facilityId}

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FacilityType } from '@scr-mesh/types';
import {
  FLOOR_PLAN_GRAPHS,
  type FloorZone,
  type FloorEdge,
  type HazardTag,
} from '@/lib/floorPlanGraphs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const VW = 480;
const VH = 360;
const NODE_R = 14;

interface ZoneEditorProps {
  facilityId: string;
  facilityType: FacilityType;
}

type EditMode = 'select' | 'connect' | 'exit' | 'hazard';

// ---------------------------------------------------------------------------
// Helper: edge key (stable regardless of direction)
// ---------------------------------------------------------------------------
function edgeKey(a: string, b: string) {
  return [a, b].sort().join('||');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ZoneEditor({ facilityId, facilityType }: ZoneEditorProps) {
  const defaultGraph = FLOOR_PLAN_GRAPHS[facilityType];

  const [zones, setZones] = useState<FloorZone[]>(defaultGraph.zones);
  const [edges, setEdges] = useState<FloorEdge[]>(defaultGraph.edges);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<EditMode>('select');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const connectFirst = useRef<string | null>(null);

  // Load existing graph from Firestore on mount
  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'facilityGraphs', facilityId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.zones) setZones(data.zones as FloorZone[]);
          if (data.edges) setEdges(data.edges as FloorEdge[]);
        }
      } catch {
        // Fall through — use pre-built default
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [facilityId]);

  // When facility type changes, reset to new default
  useEffect(() => {
    const g = FLOOR_PLAN_GRAPHS[facilityType];
    setZones(g.zones);
    setEdges(g.edges);
    setSelected(null);
    connectFirst.current = null;
  }, [facilityType]);

  // ---------------------------------------------------------------------------
  // Zone interaction
  // ---------------------------------------------------------------------------

  function handleZoneClick(zoneId: string) {
    if (mode === 'select') {
      setSelected(selected === zoneId ? null : zoneId);
      return;
    }

    if (mode === 'connect') {
      if (!connectFirst.current) {
        // First click — select source
        connectFirst.current = zoneId;
        setSelected(zoneId);
        return;
      }
      if (connectFirst.current === zoneId) {
        // Clicked same zone — cancel
        connectFirst.current = null;
        setSelected(null);
        return;
      }
      // Second click — toggle edge
      const a = connectFirst.current;
      const b = zoneId;
      const key = edgeKey(a, b);
      const exists = edges.some((e) => edgeKey(e.from, e.to) === key);
      setEdges(
        exists
          ? edges.filter((e) => edgeKey(e.from, e.to) !== key)
          : [...edges, { from: a, to: b, weight: 1 }],
      );
      connectFirst.current = null;
      setSelected(null);
      return;
    }

    if (mode === 'exit') {
      setZones((prev) =>
        prev.map((z) =>
          z.id === zoneId
            ? { ...z, type: z.type === 'exit' ? 'zone' : 'exit' }
            : z,
        ),
      );
      return;
    }

    if (mode === 'hazard') {
      setZones((prev) =>
        prev.map((z) => {
          if (z.id !== zoneId) return z;
          // Cycle: none → chemical → fire → none
          const current = z.hazardTags;
          let next: HazardTag[];
          if (current.includes('chemical')) {
            next = ['fire'];
          } else if (current.includes('fire')) {
            next = [];
          } else {
            next = ['chemical'];
          }
          return { ...z, hazardTags: next };
        }),
      );
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // Zone colors
  // ---------------------------------------------------------------------------

  function nodeColor(zone: FloorZone): { fill: string; stroke: string } {
    const isSel = selected === zone.id || connectFirst.current === zone.id;
    if (isSel) return { fill: '#4f46e5', stroke: '#a5b4fc' };
    if (zone.type === 'exit') return { fill: '#14532d', stroke: '#22c55e' };
    if (zone.hazardTags.includes('chemical')) return { fill: '#78350f', stroke: '#f59e0b' };
    if (zone.hazardTags.includes('fire')) return { fill: '#7c2d12', stroke: '#f97316' };
    if (zone.type === 'stairwell') return { fill: '#172554', stroke: '#3b82f6' };
    return { fill: '#1e293b', stroke: '#475569' };
  }

  // ---------------------------------------------------------------------------
  // Save to Firestore
  // ---------------------------------------------------------------------------

  async function handleSave() {
    setSaving(true);
    try {
      await setDoc(doc(db, 'facilityGraphs', facilityId), {
        facilityType,
        zones,
        edges,
        updatedAt: serverTimestamp(),
      });
      setSavedAt(Date.now());
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    const g = FLOOR_PLAN_GRAPHS[facilityType];
    setZones(g.zones);
    setEdges(g.edges);
    setSelected(null);
    connectFirst.current = null;
  }

  // ---------------------------------------------------------------------------
  // Selected zone info
  // ---------------------------------------------------------------------------

  const selectedZone = zones.find((z) => z.id === selected);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">Loading zone graph…</p>
    );
  }

  const modeButtons: { key: EditMode; label: string; hint: string }[] = [
    { key: 'select', label: 'Select', hint: 'Click a zone to inspect it' },
    { key: 'connect', label: 'Connect', hint: 'Click two zones to toggle a connection' },
    { key: 'exit',    label: 'Mark Exit', hint: 'Click a zone to toggle as exit' },
    { key: 'hazard',  label: 'Hazard', hint: 'Click a zone to cycle chemical → fire → none' },
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {modeButtons.map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={mode === key ? 'default' : 'outline'}
            onClick={() => {
              setMode(key);
              setSelected(null);
              connectFirst.current = null;
            }}
          >
            {label}
          </Button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">
          {modeButtons.find((m) => m.key === mode)?.hint}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset to defaults
          </Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save graph'}
          </Button>
        </div>
      </div>

      {/* Selected zone info */}
      {selectedZone && mode === 'select' && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <span className="font-semibold">{selectedZone.label}</span>
          <Badge variant="outline">{selectedZone.type}</Badge>
          {selectedZone.hazardTags.map((t) => (
            <Badge key={t} variant="outline" className="border-amber-500/30 text-amber-400">
              {t}
            </Badge>
          ))}
          <span className="ml-auto text-muted-foreground">
            Connected to:{' '}
            {edges
              .filter((e) => e.from === selectedZone.id || e.to === selectedZone.id)
              .map((e) => (e.from === selectedZone.id ? e.to : e.from))
              .join(', ') || '—'}
          </span>
        </div>
      )}

      {/* Connect-mode instruction */}
      {mode === 'connect' && connectFirst.current && (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary">
          Source: <strong>{connectFirst.current}</strong> — click another zone to add / remove
          the connection
        </div>
      )}

      {/* SVG editor canvas */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full cursor-pointer rounded-lg border"
        style={{ background: '#0f172a', maxHeight: 340 }}
        onClick={() => {
          if (mode === 'select') setSelected(null);
        }}
      >
        {/* Grid */}
        <defs>
          <pattern id="ze-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={VW} height={VH} fill="url(#ze-grid)" />

        {/* Edges */}
        {edges.map((e, i) => {
          const from = zones.find((z) => z.id === e.from);
          const to = zones.find((z) => z.id === e.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke="#334155"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          );
        })}

        {/* Zone nodes */}
        {zones.map((zone) => {
          const { fill, stroke } = nodeColor(zone);
          const isActive = selected === zone.id || connectFirst.current === zone.id;
          return (
            <g
              key={zone.id}
              onClick={(ev) => { ev.stopPropagation(); handleZoneClick(zone.id); }}
              style={{ cursor: 'pointer' }}
            >
              {/* Hit area */}
              <circle cx={zone.x} cy={zone.y} r={NODE_R + 8} fill="transparent" />
              {/* Node */}
              <circle
                cx={zone.x}
                cy={zone.y}
                r={NODE_R}
                fill={fill}
                stroke={stroke}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              {/* Label below node */}
              <text
                x={zone.x}
                y={zone.y + NODE_R + 11}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize={8.5}
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                {zone.label}
              </text>
              {/* Type icon inside node */}
              <text
                x={zone.x}
                y={zone.y + 4}
                textAnchor="middle"
                fill={stroke}
                fontSize={10}
                fontFamily="system-ui, sans-serif"
              >
                {zone.type === 'exit' ? '↗' : zone.type === 'stairwell' ? '⬆' : zone.type === 'elevator' ? 'E' : zone.hazardTags.includes('chemical') ? '⚗' : zone.hazardTags.includes('fire') ? '🔥' : '○'}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        {[
          { color: 'bg-indigo-500', label: 'Selected' },
          { color: 'bg-emerald-800', label: 'Exit' },
          { color: 'bg-amber-900', label: 'Chemical hazard' },
          { color: 'bg-red-900', label: 'Fire hazard' },
          { color: 'bg-blue-900', label: 'Stairwell' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {savedAt && (
        <p className="text-xs text-muted-foreground">
          Saved {new Date(savedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
