'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleMap,
  MarkerF,
  OverlayView,
  PolygonF,
  useJsApiLoader,
  HeatmapLayerF,
  PolylineF,
} from '@react-google-maps/api';
import { motion } from 'framer-motion';
import {
  Factory,
  GraduationCap,
  HeartPulse,
  Hotel,
  School,
  Loader2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import type { FacilityType } from '@scr-mesh/types';
import { FACILITY_THEME } from '@scr-mesh/constants';
import type { ActiveArc, FacilityNode, IncidentRow } from './types';
import {
  FACILITY_LAYOUTS,
  FOOTPRINT_MIN_ZOOM,
  polygonCentroid,
} from './facilityLayouts';

const ICONS: Record<FacilityType, LucideIcon> = {
  hospital: HeartPulse,
  hotel: Hotel,
  school: School,
  college: GraduationCap,
  factory: Factory,
};

const ACCENT_HEX: Record<FacilityType, string> = {
  hospital: '#dc2626',
  hotel: '#f59e0b',
  school: '#2563eb',
  college: '#9333ea',
  factory: '#475569',
};

const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };
const BENGALURU_RESTRICTION = {
  latLngBounds: {
    north: 13.20,
    south: 12.70,
    east: 77.80,
    west: 77.40,
  },
  strictBounds: false,
};

const INCIDENT_RED = '#ef4444';
const ACTIVE_INCIDENT_STATUSES = new Set(['reported', 'acknowledged', 'in_progress']);
const LIBRARIES: 'visualization'[] = ['visualization'];
const containerStyle = { width: '100%', height: '100%' } as const;

interface ZoneClickInfo {
  facilityId: string;
  facilityType: string;
  facilityName: string;
  zone: string;
}

interface MeshMapProps {
  facilities: Record<string, FacilityNode>;
  arcs: ActiveArc[];
  incidents: IncidentRow[];
  showHeatmap: boolean;
  initialCenter?: { lat: number; lng: number };
  /** Increment this value to auto-fit the map to all facility positions. */
  fitTrigger?: number;
  /** Called when admin clicks a zone polygon at zoom >= FOOTPRINT_MIN_ZOOM. */
  onZoneClick?: (info: ZoneClickInfo) => void;
}

function centroidOf(facilities: Record<string, FacilityNode> | null | undefined) {
  if (!facilities) return { lat: 12.9716, lng: 77.5946 };
  const positions = Object.values(facilities)
    .map((f) => f.position)
    .filter((p): p is { lat: number; lng: number } => 
      p !== null && 
      typeof p.lat === 'number' && !isNaN(p.lat) &&
      typeof p.lng === 'number' && !isNaN(p.lng) &&
      p.lat !== 0
    );
  if (positions.length === 0) return { lat: 12.9716, lng: 77.5946 };
  const sum = positions.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / positions.length, lng: sum.lng / positions.length };
}

function makeArcPath(
  src: { lat: number; lng: number },
  tgt: { lat: number; lng: number },
  steps = 48,
): google.maps.LatLngLiteral[] {
  const mid = { lat: (src.lat + tgt.lat) / 2, lng: (src.lng + tgt.lng) / 2 };
  const dLat = tgt.lat - src.lat;
  const dLng = tgt.lng - src.lng;
  const len = Math.hypot(dLat, dLng) || 1;
  const ctrl = { lat: mid.lat + (-dLng / len) * len * 0.18, lng: mid.lng + (dLat / len) * len * 0.18 };
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return {
      lat: (1 - t) ** 2 * src.lat + 2 * (1 - t) * t * ctrl.lat + t ** 2 * tgt.lat,
      lng: (1 - t) ** 2 * src.lng + 2 * (1 - t) * t * ctrl.lng + t ** 2 * tgt.lng,
    };
  });
}

export function MeshMap({ facilities, arcs, incidents, showHeatmap, initialCenter, fitTrigger = 0, onZoneClick }: MeshMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: LIBRARIES });

  const mapRef = useRef<google.maps.Map | null>(null);
  // Always-current facilities ref — lets onLoad read latest facilities
  // without being listed as a dependency (avoids stale closure & re-bind).
  const facilitiesRef = useRef(facilities);
  facilitiesRef.current = facilities;

  const [zoom, setZoom] = useState(16);

  const center = useMemo(() => initialCenter ?? centroidOf(facilities), [initialCenter, facilities]);

  const fitBoundsToFacilities = useCallback(() => {
    if (!mapRef.current || typeof google === 'undefined') return;
    const positions = Object.values(facilities)
      .map((f) => f.position)
      .filter((p): p is { lat: number; lng: number } => 
        p !== null && 
        typeof p.lat === 'number' && !isNaN(p.lat) &&
        typeof p.lng === 'number' && !isNaN(p.lng) &&
        p.lat !== 0
      );
    if (positions.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    positions.forEach((p) => bounds.extend(p));
    mapRef.current.fitBounds(bounds, 80);
  }, [facilities]);

  // Auto-fit when fitTrigger increments (cascade start, manual button)
  useEffect(() => {
    if (fitTrigger > 0) fitBoundsToFacilities();
  }, [fitTrigger, fitBoundsToFacilities]);

  // Auto-fit once on initial load when facilities first populate
  const didInitialFit = useRef(false);
  useEffect(() => {
    const hasPositions = Object.values(facilities).some((f) => 
      f.position && typeof f.position.lat === 'number' && !isNaN(f.position.lat)
    );
    if (hasPositions && !didInitialFit.current && mapRef.current) {
      didInitialFit.current = true;
      fitBoundsToFacilities();
    }
  }, [facilities, fitBoundsToFacilities]);

  // facilityId → active incidents (only active statuses)
  const incidentsByFacility = useMemo(() => {
    const map = new Map<string, IncidentRow[]>();
    incidents.forEach((inc) => {
      if (!ACTIVE_INCIDENT_STATUSES.has(inc.status)) return;
      const list = map.get(inc.facilityId) ?? [];
      list.push(inc);
      map.set(inc.facilityId, list);
    });
    return map;
  }, [incidents]);

  const activeIncidentFacilityIds = useMemo(
    () => new Set(incidentsByFacility.keys()),
    [incidentsByFacility],
  );

  const [hoveredFacilityId, setHoveredFacilityId] = useState<string | null>(null);

  const [heatmapData, setHeatmapData] = useState<google.maps.LatLng[]>([]);
  useEffect(() => {
    if (!isLoaded || !showHeatmap) { setHeatmapData([]); return; }
    const pts: google.maps.LatLng[] = [];
    incidents.forEach((inc) => {
      const fac = facilities[inc.facilityId];
      if (fac?.position && typeof fac.position.lat === 'number' && !isNaN(fac.position.lat)) {
        pts.push(new google.maps.LatLng(fac.position.lat, fac.position.lng));
      }
    });
    setHeatmapData(pts);
  }, [isLoaded, showHeatmap, incidents, facilities]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // The emulator delivers Firestore data faster than Google Maps JS loads,
    // so the didInitialFit effect may have already fired with mapRef = null.
    // Re-attempt fit here using the always-current facilitiesRef.
    if (!didInitialFit.current) {
      const positions = Object.values(facilitiesRef.current)
        .map((f) => f.position)
        .filter((p): p is { lat: number; lng: number } => 
          p !== null && 
          typeof p.lat === 'number' && !isNaN(p.lat) &&
          typeof p.lng === 'number' && !isNaN(p.lng) &&
          p.lat !== 0
        );
      if (positions.length > 0) {
        didInitialFit.current = true;
        const bounds = new google.maps.LatLngBounds();
        positions.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 60);
      }
    }
  }, []);

  const onZoomChanged = useCallback(() => {
    if (mapRef.current) setZoom(mapRef.current.getZoom() ?? 12);
  }, []);

  const showFootprints = zoom >= FOOTPRINT_MIN_ZOOM;

  if (!apiKey) return (
    <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
      <div className="max-w-sm text-center">
        <p className="font-medium">Google Maps API key missing</p>
        <p className="mt-2 text-xs">
          Add <code className="rounded bg-background px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
          to <code>.env.local</code> and restart.
        </p>
      </div>
    </div>
  );

  if (loadError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-destructive/10 p-8 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h3 className="text-lg font-bold text-white">Map Engine Error</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Google Maps failed to initialise. Please verify your API key and network connection.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 p-8 text-center">
        <Loader2 className="mb-4 h-12 w-12 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold animate-pulse">
          Connecting to Satellite Mesh...
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={13}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: MAP_STYLES,
        restriction: BENGALURU_RESTRICTION,
        minZoom: 10,
        maxZoom: 20,
      }}
      onLoad={onLoad}
      onZoomChanged={onZoomChanged}
    >
      {showHeatmap && heatmapData.length > 0 && (
        <HeatmapLayerF data={heatmapData} options={{ radius: 40, opacity: 0.6 }} />
      )}

      {arcs.map((arc) => (
        <PolylineF
          key={arc.key}
          path={makeArcPath(arc.source, arc.target)}
          options={{
            strokeColor: arc.color,
            strokeOpacity: 0.55,
            strokeWeight: 3,
            geodesic: false,
            icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '14px' }],
          }}
        />
      ))}

      {/* Building footprints + zone labels — visible at zoom >= FOOTPRINT_MIN_ZOOM */}
      {showFootprints &&
        Object.values(facilities)
          .filter((f) => f.position)
          .flatMap((f) => {
            const facilityIncidents = incidentsByFacility.get(f.id) ?? [];
            // Set of zones that currently have an active incident
            const incidentZones = new Set(facilityIncidents.map((i) => i.location.zone));
            const layout = FACILITY_LAYOUTS[f.data.type] ?? [];

            return layout.flatMap((poly, idx) => {
              const zoneHit = incidentZones.has(poly.label);
              const matchedIncident = zoneHit
                ? facilityIncidents.find((i) => i.location.zone === poly.label)
                : null;
              // Green = safe, Red = danger
              const color = zoneHit ? INCIDENT_RED : '#16a34a';
              const path = poly.ring.map(([dLat, dLng]) => ({
                lat: f.position!.lat + dLat,
                lng: f.position!.lng + dLng,
              }));
              const centroid = polygonCentroid(f.position!, poly);

              return [
                // The polygon itself — clickable so admin can open Create Incident modal
                <PolygonF
                  key={`${f.id}-poly-${idx}`}
                  path={path}
                  options={{
                    fillColor: color,
                    fillOpacity: zoneHit ? Math.min(poly.fillOpacity * 2, 0.7) : poly.fillOpacity,
                    strokeColor: color,
                    strokeOpacity: zoneHit ? 1 : poly.strokeOpacity,
                    strokeWeight: zoneHit ? poly.strokeWeight * 2 : poly.strokeWeight,
                    clickable: true,
                    zIndex: zoneHit ? 20 : 5,
                  }}
                  onClick={() =>
                    onZoneClick?.({
                      facilityId: f.id,
                      facilityType: f.data.type,
                      facilityName: f.data.name,
                      zone: poly.label,
                    })
                  }
                />,
                // Zone name label (always shown when zoomed in)
                <OverlayView
                  key={`${f.id}-label-${idx}`}
                  position={centroid}
                  mapPaneName={OverlayView.OVERLAY_LAYER}
                  getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
                >
                  <div
                    style={{
                      backgroundColor: zoneHit ? '#7f1d1d' : 'rgba(5,46,22,0.85)',
                      color: zoneHit ? '#fca5a5' : '#bbf7d0',
                      border: zoneHit ? '1px solid #ef4444' : '1px solid rgba(22,163,74,0.4)',
                      borderRadius: 4,
                      padding: '2px 5px',
                      fontSize: 9,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      lineHeight: 1.4,
                      maxWidth: 110,
                    }}
                  >
                    {zoneHit ? '🔴 ' : ''}{poly.label}
                    {matchedIncident && (
                      <div style={{ fontSize: 8, fontWeight: 400, marginTop: 1, color: '#fca5a5' }}>
                        {matchedIncident.type.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                </OverlayView>,
              ];
            });
          })}

      {/* Facility markers */}
      {Object.values(facilities)
        .filter((f) => f.position)
        .map((f) => {
          const Icon = ICONS[f.data.type];
          const hasIncident = activeIncidentFacilityIds.has(f.id);
          // Green = safe, Red = danger
          const accent = hasIncident ? INCIDENT_RED : ACCENT_HEX[f.data.type];
          const theme = FACILITY_THEME[f.data.type];
          const facilityIncidents = incidentsByFacility.get(f.id) ?? [];
          const isHovered = hoveredFacilityId === f.id;

          return (
            <OverlayView
              key={f.id}
              position={f.position!}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
            >
              <div
                className="relative flex flex-col items-center"
                style={{ minWidth: 0, cursor: 'pointer' }}
                onMouseEnter={() => setHoveredFacilityId(f.id)}
                onMouseLeave={() => setHoveredFacilityId(null)}
              >
                {/* Hover tooltip — appears above the marker */}
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: 8,
                      width: 210,
                      zIndex: 100,
                      backgroundColor: 'rgba(15,23,42,0.97)',
                      border: hasIncident ? '1px solid #ef4444' : '1px solid #16a34a',
                      borderRadius: 6,
                      padding: '8px 10px',
                      fontSize: 10,
                      lineHeight: 1.5,
                      color: '#e2e8f0',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
                      pointerEvents: 'none',
                    }}
                  >
                    {hasIncident ? (
                      <>
                        <div style={{ fontWeight: 700, color: '#f87171', marginBottom: 6, fontSize: 11 }}>
                          🔴 ACTIVE INCIDENTS ({facilityIncidents.length})
                        </div>
                        {facilityIncidents.map((inc, i) => (
                          <div key={inc.id}>
                            {i > 0 && <div style={{ borderTop: '1px solid rgba(239,68,68,0.25)', margin: '5px 0' }} />}
                            <div style={{ fontWeight: 600, color: '#fca5a5', textTransform: 'uppercase', fontSize: 9 }}>
                              {inc.type.replace(/_/g, ' ')}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: 9 }}>
                              Zone: {inc.location.zone} · Severity: {inc.severity}
                            </div>
                            {inc.description && (
                              <div
                                style={{
                                  color: '#cbd5e1',
                                  fontSize: 9,
                                  marginTop: 2,
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                }}
                              >
                                {inc.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 700, color: '#4ade80', fontSize: 11, marginBottom: 4 }}>
                          ✅ {f.data.name}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 9 }}>Type: {theme.label}</div>
                        <div style={{ color: '#4ade80', fontSize: 9, marginTop: 2 }}>Status: All clear</div>
                      </>
                    )}
                  </div>
                )}

                {hasIncident && (
                  <motion.span
                    className="absolute h-10 w-10 rounded-full"
                    style={{ backgroundColor: INCIDENT_RED }}
                    initial={{ scale: 0.4, opacity: 0.7 }}
                    animate={{ scale: 2.8, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: 'easeOut' }}
                  />
                )}
                <div
                  className="z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-lg"
                  style={{
                    backgroundColor: accent,
                    borderColor: hasIncident ? '#fca5a5' : '#fff',
                    boxShadow: hasIncident
                      ? '0 0 14px 5px rgba(239,68,68,0.55)'
                      : '0 0 10px 2px rgba(22,163,74,0.35)',
                    transition: 'background-color 0.4s, border-color 0.4s',
                  }}
                  title={`${theme.label}: ${f.data.name}${hasIncident ? ' — ACTIVE INCIDENT' : ' — All clear'}`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>

                {/* Facility name tag */}
                <span
                  className="z-10 mt-1 max-w-[130px] truncate rounded px-1.5 py-0.5 text-[10px] font-semibold shadow"
                  style={
                    hasIncident
                      ? { backgroundColor: '#7f1d1d', color: '#fca5a5' }
                      : { backgroundColor: 'rgba(5,46,22,0.9)', color: '#86efac' }
                  }
                >
                  {hasIncident ? '🔴 ' : '🟢 '}{f.data.name}
                </span>
              </div>
            </OverlayView>
          );
        })}

      <MarkerF position={center} opacity={0} clickable={false} />
    </GoogleMap>

    {/* Zoom-in hint — visible when zones are hidden */}
    {!showFootprints && Object.keys(facilities).length > 0 && (
      <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur-sm">
        Zoom in to see facility zones
      </div>
    )}

    {/* Fit-all button — bottom-right corner */}
    <button
      onClick={fitBoundsToFacilities}
      title="Fit all facilities"
      className="absolute bottom-2 right-10 rounded bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow hover:bg-background"
      style={{ zIndex: 10 }}
    >
      ⊡ Fit
    </button>
    </div>
  );
}

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#263345' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#374151' }] },
];

export { ACCENT_HEX };
