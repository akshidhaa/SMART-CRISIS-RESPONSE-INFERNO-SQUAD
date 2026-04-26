'use client';

// Radial SVG of facilities in the mesh. The current facility sits in the
// center; everyone else is laid out around it. Color + icon come from
// FACILITY_THEME so the diagram instantly reads "what types are nearby".

import { Factory, GraduationCap, HeartPulse, Hotel, School } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FACILITY_THEME } from '@scr-mesh/constants';
import type { Facility, FacilityType } from '@scr-mesh/types';

const ICONS: Record<FacilityType, LucideIcon> = {
  hospital: HeartPulse,
  hotel: Hotel,
  school: School,
  college: GraduationCap,
  factory: Factory,
};

interface FacilityNode {
  id: string;
  name: string;
  type: FacilityType;
  /** true if there's an active mesh event between this node and the center. */
  active: boolean;
}

interface Props {
  center: { name: string; type: FacilityType } | null;
  others: FacilityNode[];
}

export function ConnectedFacilities({ center, others }: Props) {
  if (!center) return <p className="text-sm text-muted-foreground">No facility selected.</p>;

  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = 130;
  const CenterIcon = ICONS[center.type];

  if (others.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground">
        Mesh radius is empty — no other facilities connected yet.
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[360px] w-[360px]">
      {/* radius ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeDasharray="4 4" />

      {/* connection lines */}
      {others.map((n, i) => {
        const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return (
          <line
            key={`line-${n.id}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="currentColor"
            strokeOpacity={n.active ? 0.6 : 0.15}
            strokeWidth={n.active ? 2 : 1}
          />
        );
      })}

      {/* center node */}
      <g>
        <circle cx={cx} cy={cy} r={28} className="fill-primary" />
        <foreignObject x={cx - 12} y={cy - 12} width={24} height={24}>
          <div className="flex h-6 w-6 items-center justify-center text-primary-foreground">
            <CenterIcon size={20} />
          </div>
        </foreignObject>
        <text x={cx} y={cy + 46} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
          {center.name}
        </text>
      </g>

      {/* satellites */}
      {others.map((n, i) => {
        const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const Icon = ICONS[n.type];
        const accentBg = FACILITY_THEME[n.type].accentClass;
        return (
          <g key={n.id}>
            <foreignObject x={x - 22} y={y - 22} width={44} height={44}>
              <div className={`flex h-11 w-11 items-center justify-center rounded-full shadow ${accentBg}`}>
                <Icon size={20} />
              </div>
            </foreignObject>
            <text x={x} y={y + 36} textAnchor="middle" className="fill-foreground text-[10px]">
              {n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
