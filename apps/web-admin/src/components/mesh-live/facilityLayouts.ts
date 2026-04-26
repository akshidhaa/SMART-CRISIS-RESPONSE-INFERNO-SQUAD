// Per-facility-type building footprint definitions.
// Zone labels match ZONE_PRESETS from @scr-mesh/constants so incident
// location.zone can be matched directly to highlight the right polygon.
//
// Offsets are in degrees (lat/lng). At ~12.97°N:
//   0.0003° lat ≈ 33 m   |   0.0004° lng ≈ 37 m

import type { FacilityType } from '@scr-mesh/types';

export const FOOTPRINT_MIN_ZOOM = 14;

export interface FootprintPolygon {
  /** Must match a value in ZONE_PRESETS[facilityType] for incident linking. */
  label: string;
  /** [dLat, dLng] offsets relative to facility.position — forms a closed ring. */
  ring: [number, number][];
  fillOpacity: number;
  strokeOpacity: number;
  strokeWeight: number;
}

export type FacilityLayout = FootprintPolygon[];

function rect(
  dLat0: number, dLng0: number,
  dLat1: number, dLng1: number,
  label: string,
  fillOpacity = 0.28,
  strokeOpacity = 0.7,
  strokeWeight = 1.5,
): FootprintPolygon {
  return {
    label,
    ring: [
      [dLat0, dLng0],
      [dLat0, dLng1],
      [dLat1, dLng1],
      [dLat1, dLng0],
    ],
    fillOpacity,
    strokeOpacity,
    strokeWeight,
  };
}

// hospital zones: ER | ICU | Ward A | Ward B | OT | Pharmacy | Reception | Parking
// hotel zones:   Lobby | Pool | Restaurant | Floor 1 | Floor 2 | Floor 3 | Kitchen | Parking
// school zones:  Classrooms | Playground | Cafeteria | Library | Gym | Office | Assembly Hall
// college zones: Lecture Hall | Lab | Hostel A | Hostel B | Library | Cafeteria | Sports Ground
// factory zones: Floor 1 | Floor 2 | Loading Dock | Chemical Store | Control Room | Canteen

export const FACILITY_LAYOUTS: Record<FacilityType, FacilityLayout> = {
  hospital: [
    rect(-0.00045, -0.0002, -0.0003,  0.0002, 'ER',         0.35, 0.9, 2.0),
    rect(-0.0003,  -0.0004,  0.0001,  0.0004, 'Ward A',     0.30, 0.8, 2.0),
    rect( 0.0001,  -0.0004,  0.0003,  0.0004, 'ICU',        0.30, 0.8, 2.0),
    rect(-0.0001,   0.0004,  0.0002,  0.0007, 'Ward B',     0.20, 0.6, 1.5),
    rect(-0.0001,  -0.0007,  0.0002, -0.0004, 'OT',         0.20, 0.6, 1.5),
    rect( 0.0003,  -0.0002,  0.0005,  0.0002, 'Pharmacy',   0.18, 0.5, 1.0),
    rect( 0.0003,   0.0002,  0.0005,  0.0005, 'Reception',  0.18, 0.5, 1.0),
    rect(-0.00055, -0.0005, -0.00045, 0.0005, 'Parking',    0.10, 0.4, 1.0),
  ],

  hotel: [
    rect(-0.00045, -0.00015, -0.00025, 0.00015, 'Lobby',      0.30, 0.8, 2.0),
    rect(-0.00025, -0.00025,  0.00015, 0.00025, 'Floor 1',    0.28, 0.7, 2.0),
    rect( 0.00015, -0.00025,  0.00035, 0.00025, 'Floor 2',    0.25, 0.7, 1.5),
    rect( 0.00035, -0.00025,  0.00055, 0.00025, 'Floor 3',    0.22, 0.6, 1.5),
    rect(-0.00015,  0.00025,  0.0002,  0.00055, 'Pool',       0.15, 0.5, 1.0),
    rect(-0.00025, -0.00055, -0.00005,-0.00025, 'Restaurant', 0.18, 0.5, 1.0),
    rect(-0.00005, -0.00055,  0.00015,-0.00025, 'Kitchen',    0.18, 0.5, 1.0),
    rect(-0.00065, -0.00025, -0.00045, 0.00025, 'Parking',    0.10, 0.4, 1.0),
  ],

  school: [
    rect(-0.00015, -0.0005,  0.00025,  0.0003,  'Classrooms',    0.30, 0.8, 2.0),
    rect(-0.00015,  0.0003,  0.00025,  0.0006,  'Gym',           0.22, 0.6, 1.5),
    rect(-0.0005,  -0.0005, -0.00015,  0.0006,  'Playground',    0.12, 0.4, 1.0),
    rect(-0.0005,   0.0006, -0.00015,  0.0009,  'Cafeteria',     0.20, 0.6, 1.5),
    rect( 0.00025, -0.0003,  0.00045,  0.0000,  'Library',       0.18, 0.5, 1.0),
    rect( 0.00025,  0.0000,  0.00045,  0.0003,  'Office',        0.18, 0.5, 1.0),
    rect( 0.00025, -0.0005,  0.00045, -0.0003,  'Assembly Hall', 0.18, 0.5, 1.0),
  ],

  college: [
    rect(-0.0001,  -0.0003,  0.0003,  0.0001,  'Lecture Hall',  0.30, 0.8, 2.0),
    rect(-0.0001,   0.0001,  0.0003,  0.0005,  'Lab',           0.25, 0.7, 1.5),
    rect(-0.0005,  -0.0003, -0.0001,  0.0001,  'Hostel A',      0.25, 0.7, 1.5),
    rect(-0.0005,   0.0001, -0.0001,  0.0005,  'Hostel B',      0.25, 0.7, 1.5),
    rect( 0.0003,  -0.0003,  0.0006,  0.0001,  'Library',       0.18, 0.5, 1.0),
    rect( 0.0003,   0.0001,  0.0006,  0.0005,  'Cafeteria',     0.18, 0.5, 1.0),
    rect(-0.0007,  -0.0003, -0.0005,  0.0005,  'Sports Ground', 0.10, 0.4, 1.0),
  ],

  factory: [
    rect(-0.0002, -0.0006,  0.0003,  0.0003,  'Floor 1',       0.30, 0.8, 2.0),
    rect(-0.0002,  0.0003,  0.0001,  0.0007,  'Chemical Store', 0.28, 0.7, 1.5),
    rect( 0.0003, -0.0004,  0.0005,  0.0002,  'Loading Dock',  0.22, 0.6, 1.5),
    rect(-0.0004, -0.0006, -0.0002,  0.0007,  'Floor 2',       0.15, 0.5, 1.0),
    rect( 0.0001,  0.0003,  0.0003,  0.0007,  'Control Room',  0.20, 0.6, 1.5),
    rect( 0.0003,  0.0002,  0.0005,  0.0006,  'Canteen',       0.18, 0.5, 1.0),
  ],
};

/** Returns the lat/lng centroid of a polygon (for label placement). */
export function polygonCentroid(
  origin: { lat: number; lng: number },
  poly: FootprintPolygon,
): { lat: number; lng: number } {
  const n = poly.ring.length;
  const sumLat = poly.ring.reduce((s, [d]) => s + d, 0);
  const sumLng = poly.ring.reduce((s, [, d]) => s + d, 0);
  return { lat: origin.lat + sumLat / n, lng: origin.lng + sumLng / n };
}
