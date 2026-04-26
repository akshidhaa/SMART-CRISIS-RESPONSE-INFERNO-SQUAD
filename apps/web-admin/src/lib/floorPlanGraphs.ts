// Pre-built zone graphs for all 5 facility types.
// Zone labels match ZONE_PRESETS from @scr-mesh/constants exactly, so
// incident.location.zone and QR check-in zone names resolve directly.
//
// Coordinate system: 480×360 SVG viewBox.
// x: 0 = left, 480 = right  |  y: 0 = top, 360 = bottom

import type { FacilityType } from '@scr-mesh/types';

export type ZoneNodeType = 'zone' | 'exit' | 'stairwell' | 'elevator';
export type HazardTag = 'chemical' | 'fire' | 'restricted';

export interface FloorZone {
  id: string;        // Matches ZONE_PRESETS value exactly (used for incident linking)
  label: string;     // Display label (same as id here)
  type: ZoneNodeType;
  hazardTags: HazardTag[];
  x: number;         // Center x in the 480×360 viewBox
  y: number;         // Center y in the 480×360 viewBox
}

export interface FloorEdge {
  from: string;  // zone id
  to: string;    // zone id
  weight: number; // 1=normal, 2=stairs/outdoor (slower)
}

export interface FacilityFloorGraph {
  zones: FloorZone[];
  edges: FloorEdge[];
}

// ---------------------------------------------------------------------------
// Hospital
// Zones: ER | ICU | Ward A | Ward B | OT | Pharmacy | Reception | Parking
// Exits: Reception, Parking, ER
// Nuance: elevator (ICU) and OT restricted during fire
// ---------------------------------------------------------------------------
const HOSPITAL: FacilityFloorGraph = {
  zones: [
    { id: 'Parking',   label: 'Parking',   type: 'exit',     hazardTags: [],              x: 60,  y: 320 },
    { id: 'Reception', label: 'Reception', type: 'exit',     hazardTags: [],              x: 240, y: 310 },
    { id: 'ER',        label: 'ER',        type: 'exit',     hazardTags: [],              x: 75,  y: 195 },
    { id: 'Ward A',    label: 'Ward A',    type: 'zone',     hazardTags: [],              x: 180, y: 230 },
    { id: 'Ward B',    label: 'Ward B',    type: 'zone',     hazardTags: [],              x: 330, y: 220 },
    { id: 'Pharmacy',  label: 'Pharmacy',  type: 'zone',     hazardTags: [],              x: 155, y: 145 },
    { id: 'ICU',       label: 'ICU',       type: 'elevator', hazardTags: ['restricted'],  x: 260, y: 155 },
    { id: 'OT',        label: 'OT',        type: 'zone',     hazardTags: ['restricted'],  x: 400, y: 140 },
  ],
  edges: [
    { from: 'Parking',   to: 'Reception', weight: 1 },
    { from: 'Reception', to: 'Ward A',    weight: 1 },
    { from: 'Reception', to: 'Pharmacy',  weight: 1 },
    { from: 'Ward A',    to: 'Ward B',    weight: 1 },
    { from: 'Ward A',    to: 'ICU',       weight: 1 },
    { from: 'Ward A',    to: 'ER',        weight: 1 },
    { from: 'ER',        to: 'ICU',       weight: 1 },
    { from: 'ICU',       to: 'Ward B',    weight: 1 },
    { from: 'ICU',       to: 'OT',        weight: 1 },
    { from: 'ICU',       to: 'Pharmacy',  weight: 1 },
    { from: 'Pharmacy',  to: 'Ward A',    weight: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Hotel
// Zones: Lobby | Pool | Restaurant | Floor 1 | Floor 2 | Floor 3 | Kitchen | Parking
// Exits: Parking, Lobby
// Nuance: stairwells (Floor 1/2/3) preferred over elevator during fire
// ---------------------------------------------------------------------------
const HOTEL: FacilityFloorGraph = {
  zones: [
    { id: 'Parking',    label: 'Parking',    type: 'exit',      hazardTags: [],  x: 60,  y: 318 },
    { id: 'Lobby',      label: 'Lobby',      type: 'exit',      hazardTags: [],  x: 240, y: 308 },
    { id: 'Restaurant', label: 'Restaurant', type: 'zone',      hazardTags: [],  x: 115, y: 235 },
    { id: 'Kitchen',    label: 'Kitchen',    type: 'zone',      hazardTags: ['fire'], x: 55, y: 185 },
    { id: 'Pool',       label: 'Pool',       type: 'zone',      hazardTags: [],  x: 390, y: 235 },
    { id: 'Floor 1',    label: 'Floor 1',    type: 'stairwell', hazardTags: [],  x: 240, y: 225 },
    { id: 'Floor 2',    label: 'Floor 2',    type: 'stairwell', hazardTags: [],  x: 240, y: 150 },
    { id: 'Floor 3',    label: 'Floor 3',    type: 'stairwell', hazardTags: [],  x: 240, y: 75 },
  ],
  edges: [
    { from: 'Parking',    to: 'Lobby',      weight: 1 },
    { from: 'Lobby',      to: 'Restaurant', weight: 1 },
    { from: 'Lobby',      to: 'Pool',       weight: 1 },
    { from: 'Lobby',      to: 'Floor 1',    weight: 1 },
    { from: 'Restaurant', to: 'Kitchen',    weight: 1 },
    { from: 'Kitchen',    to: 'Lobby',      weight: 2 },
    { from: 'Floor 1',    to: 'Floor 2',    weight: 2 },
    { from: 'Floor 2',    to: 'Floor 3',    weight: 2 },
    { from: 'Pool',       to: 'Lobby',      weight: 1 },
  ],
};

// ---------------------------------------------------------------------------
// School
// Zones: Classrooms | Playground | Cafeteria | Library | Gym | Office | Assembly Hall
// Exits: Playground, Assembly Hall
// Nuance: age-appropriate — children routed to open areas first
// ---------------------------------------------------------------------------
const SCHOOL: FacilityFloorGraph = {
  zones: [
    { id: 'Playground',    label: 'Playground',    type: 'exit', hazardTags: [],  x: 240, y: 45  },
    { id: 'Assembly Hall', label: 'Assembly Hall', type: 'exit', hazardTags: [],  x: 240, y: 128 },
    { id: 'Classrooms',    label: 'Classrooms',    type: 'zone', hazardTags: [],  x: 145, y: 220 },
    { id: 'Library',       label: 'Library',       type: 'zone', hazardTags: [],  x: 340, y: 215 },
    { id: 'Office',        label: 'Office',        type: 'zone', hazardTags: [],  x: 240, y: 210 },
    { id: 'Cafeteria',     label: 'Cafeteria',     type: 'zone', hazardTags: [],  x: 100, y: 295 },
    { id: 'Gym',           label: 'Gym',           type: 'zone', hazardTags: [],  x: 380, y: 295 },
  ],
  edges: [
    { from: 'Assembly Hall', to: 'Playground',  weight: 1 },
    { from: 'Assembly Hall', to: 'Office',       weight: 1 },
    { from: 'Office',        to: 'Classrooms',  weight: 1 },
    { from: 'Office',        to: 'Library',     weight: 1 },
    { from: 'Classrooms',    to: 'Cafeteria',   weight: 1 },
    { from: 'Classrooms',    to: 'Assembly Hall', weight: 1 },
    { from: 'Library',       to: 'Gym',         weight: 1 },
    { from: 'Library',       to: 'Assembly Hall', weight: 1 },
    { from: 'Cafeteria',     to: 'Playground',  weight: 2 },
    { from: 'Gym',           to: 'Playground',  weight: 2 },
  ],
};

// ---------------------------------------------------------------------------
// College
// Zones: Lecture Hall | Lab | Hostel A | Hostel B | Library | Cafeteria | Sports Ground
// Exits: Sports Ground
// Nuance: outdoor paths between hostel blocks are included (weight=2)
// ---------------------------------------------------------------------------
const COLLEGE: FacilityFloorGraph = {
  zones: [
    { id: 'Sports Ground', label: 'Sports Ground', type: 'exit', hazardTags: [],  x: 240, y: 45  },
    { id: 'Hostel A',      label: 'Hostel A',      type: 'zone', hazardTags: [],  x: 90,  y: 140 },
    { id: 'Hostel B',      label: 'Hostel B',      type: 'zone', hazardTags: [],  x: 390, y: 140 },
    { id: 'Lecture Hall',  label: 'Lecture Hall',  type: 'zone', hazardTags: [],  x: 165, y: 238 },
    { id: 'Lab',           label: 'Lab',           type: 'zone', hazardTags: ['chemical'], x: 325, y: 238 },
    { id: 'Library',       label: 'Library',       type: 'zone', hazardTags: [],  x: 240, y: 200 },
    { id: 'Cafeteria',     label: 'Cafeteria',     type: 'zone', hazardTags: [],  x: 115, y: 310 },
  ],
  edges: [
    { from: 'Hostel A',     to: 'Sports Ground',  weight: 2 },
    { from: 'Hostel B',     to: 'Sports Ground',  weight: 2 },
    { from: 'Hostel A',     to: 'Lecture Hall',   weight: 2 },
    { from: 'Lecture Hall', to: 'Library',        weight: 1 },
    { from: 'Library',      to: 'Lab',            weight: 1 },
    { from: 'Library',      to: 'Lecture Hall',   weight: 1 },
    { from: 'Lecture Hall', to: 'Sports Ground',  weight: 2 },
    { from: 'Lecture Hall', to: 'Cafeteria',      weight: 1 },
    { from: 'Cafeteria',    to: 'Sports Ground',  weight: 2 },
    { from: 'Lab',          to: 'Sports Ground',  weight: 2 },
    { from: 'Hostel B',     to: 'Library',        weight: 2 },
  ],
};

// ---------------------------------------------------------------------------
// Factory
// Zones: Floor 1 | Floor 2 | Loading Dock | Chemical Store | Control Room | Canteen
// Exits: Loading Dock
// Nuance: Chemical Store always blocked; Floor 1/2 have fire-hazard tags
// ---------------------------------------------------------------------------
const FACTORY: FacilityFloorGraph = {
  zones: [
    { id: 'Loading Dock',   label: 'Loading Dock',   type: 'exit', hazardTags: [],           x: 85,  y: 290 },
    { id: 'Control Room',   label: 'Control Room',   type: 'zone', hazardTags: [],           x: 240, y: 65  },
    { id: 'Floor 1',        label: 'Floor 1',        type: 'zone', hazardTags: ['fire'],     x: 155, y: 180 },
    { id: 'Floor 2',        label: 'Floor 2',        type: 'zone', hazardTags: ['fire'],     x: 335, y: 180 },
    { id: 'Chemical Store', label: 'Chemical Store', type: 'zone', hazardTags: ['chemical'], x: 420, y: 275 },
    { id: 'Canteen',        label: 'Canteen',        type: 'zone', hazardTags: [],           x: 240, y: 300 },
  ],
  edges: [
    { from: 'Control Room',   to: 'Floor 1',        weight: 1 },
    { from: 'Control Room',   to: 'Floor 2',        weight: 1 },
    { from: 'Floor 1',        to: 'Floor 2',        weight: 1 },
    { from: 'Floor 1',        to: 'Loading Dock',   weight: 1 },
    { from: 'Floor 2',        to: 'Loading Dock',   weight: 1 },
    { from: 'Chemical Store', to: 'Floor 2',        weight: 1 },
    { from: 'Canteen',        to: 'Loading Dock',   weight: 1 },
    { from: 'Canteen',        to: 'Floor 1',        weight: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const FLOOR_PLAN_GRAPHS: Record<FacilityType, FacilityFloorGraph> = {
  hospital: HOSPITAL,
  hotel:    HOTEL,
  school:   SCHOOL,
  college:  COLLEGE,
  factory:  FACTORY,
};

/** Helper: build the Maps needed by computeBlockedZones */
export function buildZoneMaps(zones: FloorZone[]): {
  zoneHazardTags: Map<string, string[]>;
  zoneTypes: Map<string, string>;
} {
  const zoneHazardTags = new Map<string, string[]>();
  const zoneTypes = new Map<string, string>();
  for (const z of zones) {
    zoneHazardTags.set(z.id, z.hazardTags);
    zoneTypes.set(z.id, z.type);
  }
  return { zoneHazardTags, zoneTypes };
}
