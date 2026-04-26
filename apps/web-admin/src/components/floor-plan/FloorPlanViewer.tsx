'use client';

// SVG-based floor plan viewer.
// Renders zones as labeled boxes, edges as lines, evacuation path in green,
// and blocked zones in red. No external canvas library required.

import { useMemo } from 'react';
import type { FloorZone, FloorEdge } from '@/lib/floorPlanGraphs';

const VW = 480;
const VH = 360;
const BOX_W = 84;
const BOX_H = 26;
const BOX_RX = 5;

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

interface ZoneColors {
  fill: string;
  stroke: string;
  text: string;
  strokeWidth: number;
}

function zoneColors(
  zone: FloorZone,
  isUser: boolean,
  isBlocked: boolean,
  isOnPath: boolean,
): ZoneColors {
  if (isUser)
    return { fill: '#312e81', stroke: '#818cf8', text: '#c7d2fe', strokeWidth: 2.5 };
  if (isBlocked)
    return { fill: '#7f1d1d', stroke: '#ef4444', text: '#fca5a5', strokeWidth: 2 };
  if (isOnPath)
    return { fill: '#14532d', stroke: '#22c55e', text: '#86efac', strokeWidth: 2 };
  if (zone.type === 'exit')
    return { fill: '#052e16', stroke: '#16a34a', text: '#4ade80', strokeWidth: 1.5 };
  if (zone.type === 'stairwell')
    return { fill: '#172554', stroke: '#3b82f6', text: '#93c5fd', strokeWidth: 1.5 };
  if (zone.hazardTags.includes('chemical'))
    return { fill: '#78350f', stroke: '#f59e0b', text: '#fcd34d', strokeWidth: 1.5 };
  if (zone.hazardTags.includes('fire'))
    return { fill: '#7c2d12', stroke: '#f97316', text: '#fdba74', strokeWidth: 1.5 };
  return { fill: '#1f2937', stroke: '#4b5563', text: '#d1d5db', strokeWidth: 1 };
}

// ---------------------------------------------------------------------------
// Geometry: midpoint for arrow (on the halfway line between two zone centers)
// ---------------------------------------------------------------------------

function arrowPoints(
  x1: number, y1: number,
  x2: number, y2: number,
): { mx: number; my: number; angle: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  return { mx, my, angle };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FloorPlanViewerProps {
  zones: FloorZone[];
  edges: FloorEdge[];
  userZoneId?: string;
  incidentZoneIds?: Set<string>;
  evacuationPath?: string[];
  className?: string;
}

export function FloorPlanViewer({
  zones,
  edges,
  userZoneId,
  incidentZoneIds = new Set(),
  evacuationPath = [],
  className = '',
}: FloorPlanViewerProps) {
  const zoneMap = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const pathSet = useMemo(() => new Set(evacuationPath), [evacuationPath]);

  // Consecutive pairs in the evacuation path (for drawing the green route)
  const pathPairs = useMemo<[string, string][]>(() => {
    const pairs: [string, string][] = [];
    for (let i = 0; i < evacuationPath.length - 1; i++) {
      pairs.push([evacuationPath[i], evacuationPath[i + 1]]);
    }
    return pairs;
  }, [evacuationPath]);

  // Set of path edge keys for fast dedup
  const pathEdgeKeys = useMemo(
    () => new Set(pathPairs.map(([a, b]) => `${a}|${b}`)),
    [pathPairs],
  );

  function isPathEdge(from: string, to: string) {
    return pathEdgeKeys.has(`${from}|${to}`) || pathEdgeKeys.has(`${to}|${from}`);
  }

  const exitZoneId = evacuationPath.at(-1);

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className={`w-full rounded-lg ${className}`}
      style={{ background: '#0f172a', maxHeight: 320 }}
      aria-label="Indoor floor plan evacuation map"
    >
      <defs>
        {/* Green arrowhead for evacuation path */}
        <marker id="fp-arrow" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
          <polygon points="0 0, 7 3, 0 6" fill="#22c55e" />
        </marker>
        {/* Pulse animation for user zone */}
        <style>{`
          @keyframes fp-pulse {
            0%   { opacity: 0.7; r: 16px; }
            100% { opacity: 0;   r: 32px; }
          }
          .fp-pulse { animation: fp-pulse 1.4s ease-out infinite; }
        `}</style>
      </defs>

      {/* ---------------------------------------------------------------- */}
      {/* Background grid (subtle)                                          */}
      {/* ---------------------------------------------------------------- */}
      <defs>
        <pattern id="fp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#fp-grid)" />

      {/* ---------------------------------------------------------------- */}
      {/* Regular edges (grey dashed)                                       */}
      {/* ---------------------------------------------------------------- */}
      {edges.map((e, i) => {
        const from = zoneMap.get(e.from);
        const to = zoneMap.get(e.to);
        if (!from || !to || isPathEdge(e.from, e.to)) return null;
        return (
          <line
            key={`edge-${i}`}
            x1={from.x} y1={from.y}
            x2={to.x} y2={to.y}
            stroke="#334155"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        );
      })}

      {/* ---------------------------------------------------------------- */}
      {/* Evacuation path edges (green, with arrowheads)                   */}
      {/* ---------------------------------------------------------------- */}
      {pathPairs.map(([fromId, toId], i) => {
        const from = zoneMap.get(fromId);
        const to = zoneMap.get(toId);
        if (!from || !to) return null;
        const { mx, my, angle } = arrowPoints(from.x, from.y, to.x, to.y);
        return (
          <g key={`path-edge-${i}`}>
            <line
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke="#22c55e"
              strokeWidth={3}
              strokeOpacity={0.9}
              markerEnd="url(#fp-arrow)"
            />
            {/* Direction arrow at midpoint */}
            <g transform={`translate(${mx},${my}) rotate(${angle})`}>
              <polygon points="-6,-4 6,0 -6,4" fill="#22c55e" opacity={0.7} />
            </g>
          </g>
        );
      })}

      {/* ---------------------------------------------------------------- */}
      {/* Zone boxes                                                         */}
      {/* ---------------------------------------------------------------- */}
      {zones.map((zone) => {
        const isUser = zone.id === userZoneId;
        const isBlocked = incidentZoneIds.has(zone.id) && !isUser;
        const isOnPath = pathSet.has(zone.id) && !isUser;
        const colors = zoneColors(zone, isUser, isBlocked, isOnPath);

        return (
          <g key={zone.id}>
            {/* Pulse ring for user's current zone */}
            {isUser && (
              <circle
                cx={zone.x}
                cy={zone.y}
                r={16}
                fill="none"
                stroke="#818cf8"
                strokeWidth={2}
                className="fp-pulse"
              />
            )}

            {/* Zone rectangle */}
            <rect
              x={zone.x - BOX_W / 2}
              y={zone.y - BOX_H / 2}
              width={BOX_W}
              height={BOX_H}
              rx={BOX_RX}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={colors.strokeWidth}
            />

            {/* Label */}
            <text
              x={zone.x}
              y={zone.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={colors.text}
              fontSize={9}
              fontWeight="600"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {zone.label}
            </text>

            {/* Exit tag */}
            {zone.type === 'exit' && (
              <text
                x={zone.x + BOX_W / 2 - 2}
                y={zone.y - BOX_H / 2 - 3}
                textAnchor="end"
                fill="#4ade80"
                fontSize={7}
                fontFamily="system-ui, sans-serif"
                fontWeight="700"
              >
                EXIT
              </text>
            )}

            {/* YOU indicator */}
            {isUser && (
              <text
                x={zone.x}
                y={zone.y - BOX_H / 2 - 5}
                textAnchor="middle"
                fill="#818cf8"
                fontSize={7.5}
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >
                YOU
              </text>
            )}

            {/* Hazard warning */}
            {isBlocked && (
              <text
                x={zone.x}
                y={zone.y - BOX_H / 2 - 5}
                textAnchor="middle"
                fill="#ef4444"
                fontSize={8}
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >
                BLOCKED
              </text>
            )}

            {/* Destination star */}
            {zone.id === exitZoneId && !isUser && (
              <text
                x={zone.x - BOX_W / 2 + 2}
                y={zone.y - BOX_H / 2 - 3}
                fill="#4ade80"
                fontSize={9}
                fontFamily="system-ui, sans-serif"
              >
                ★
              </text>
            )}
          </g>
        );
      })}

      {/* ---------------------------------------------------------------- */}
      {/* Legend                                                             */}
      {/* ---------------------------------------------------------------- */}
      <g transform="translate(8, 8)">
        <rect width={108} height={82} rx={4} fill="rgba(15,23,42,0.82)" />
        <text x={6} y={14} fill="#94a3b8" fontSize={7.5} fontWeight="700" fontFamily="system-ui, sans-serif">
          LEGEND
        </text>
        {[
          { color: '#818cf8', label: 'Your location' },
          { color: '#22c55e', label: 'Evacuation route' },
          { color: '#16a34a', label: 'Exit' },
          { color: '#ef4444', label: 'Blocked zone' },
          { color: '#f59e0b', label: 'Chemical hazard' },
          { color: '#f97316', label: 'Fire hazard' },
        ].map(({ color, label }, i) => (
          <g key={label} transform={`translate(6, ${24 + i * 11})`}>
            <rect width={8} height={8} rx={2} fill={color} />
            <text x={12} y={7} fill="#cbd5e1" fontSize={7} fontFamily="system-ui, sans-serif">
              {label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
