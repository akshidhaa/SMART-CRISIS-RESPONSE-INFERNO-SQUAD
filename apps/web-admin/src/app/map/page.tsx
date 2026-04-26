'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Facility, FacilityType, Incident, MeshEvent } from '@scr-mesh/types';
import { FACILITY_THEME } from '@scr-mesh/constants';
import { ACCENT_HEX } from '@/components/mesh-live/MeshMap';
import {
  HeartPulse,
  Hotel,
  School,
  GraduationCap,
  Factory,
  Navigation,
  X,
  Bus,
  Car,
  PersonStanding,
  MapPin,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacilityEntry {
  id: string;
  data: Facility;
  position: { lat: number; lng: number } | null;
}

interface IncidentEntry {
  id: string;
  facilityId: string;
  type: string;
  severity: string;
  status: string;
  location: { zone: string; floor: string };
  description?: string;
}

// ---------------------------------------------------------------------------
// Constants (defined outside component so refs are stable)
// ---------------------------------------------------------------------------

const CONTAINER = { width: '100%', height: '100%' } as const;
const INCIDENT_RED = '#ef4444';
const ACTIVE_STATUSES = ['reported', 'acknowledged', 'in_progress'] as const;

const ICONS: Record<FacilityType, LucideIcon> = {
  hospital: HeartPulse,
  hotel: Hotel,
  school: School,
  college: GraduationCap,
  factory: Factory,
};

type TravelMode = 'WALKING' | 'DRIVING' | 'TRANSIT';

const TRAVEL_OPTIONS: { mode: TravelMode; label: string; Icon: LucideIcon }[] = [
  { mode: 'WALKING', label: 'Walk', Icon: PersonStanding },
  { mode: 'DRIVING', label: 'Drive', Icon: Car },
  { mode: 'TRANSIT', label: 'Transit', Icon: Bus },
];

const MAP_DARK = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'on' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#263345' }] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPosition(loc: unknown): { lat: number; lng: number } | null {
  if (!loc || typeof loc !== 'object') return null;
  const l = loc as Record<string, unknown>;
  if (typeof l.lat === 'number' && typeof l.lng === 'number') return { lat: l.lat, lng: l.lng };
  if (typeof l.latitude === 'number' && typeof l.longitude === 'number')
    return { lat: l.latitude as number, lng: l.longitude as number };
  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CommunityMapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey });

  // Imperative map refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const dirRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // Data
  const [facilities, setFacilities] = useState<FacilityEntry[]>([]);
  const [incidents, setIncidents] = useState<IncidentEntry[]>([]);
  const [meshEventFacilityIds, setMeshEventFacilityIds] = useState<Set<string>>(new Set());

  // UI state
  const [selectedFacility, setSelectedFacility] = useState<FacilityEntry | null>(null);
  const [showTransit, setShowTransit] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>('WALKING');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Firestore subscriptions
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return onSnapshot(collection(db, 'facilities'), (snap) => {
      setFacilities(
        snap.docs.map((d) => ({
          id: d.id,
          data: d.data() as Facility,
          position: toPosition(d.data().location),
        })),
      );
    });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'incidents'),
      where('status', 'in', [...ACTIVE_STATUSES]),
    );
    return onSnapshot(q, (snap) => {
      setIncidents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as IncidentEntry)));
    });
  }, []);

  useEffect(() => {
    const cutoff = Timestamp.fromMillis(Date.now() - 6 * 3600_000);
    const q = query(collection(db, 'meshEvents'), where('publishedAt', '>=', cutoff));
    return onSnapshot(q, (snap) => {
      setMeshEventFacilityIds(new Set(snap.docs.map((d) => (d.data() as MeshEvent).sourceFacilityId)));
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const incidentsByFacility = useMemo(() => {
    const map = new Map<string, IncidentEntry[]>();
    incidents.forEach((i) => {
      const list = map.get(i.facilityId) ?? [];
      list.push(i);
      map.set(i.facilityId, list);
    });
    return map;
  }, [incidents]);

  const center = useMemo(() => {
    const withPos = facilities.filter((f) => f.position);
    if (withPos.length === 0) return { lat: 12.9716, lng: 77.5946 };
    const sum = withPos.reduce(
      (acc, f) => ({ lat: acc.lat + f.position!.lat, lng: acc.lng + f.position!.lng }),
      { lat: 0, lng: 0 },
    );
    return { lat: sum.lat / withPos.length, lng: sum.lng / withPos.length };
  }, [facilities]);

  // ---------------------------------------------------------------------------
  // Imperative map effects
  // ---------------------------------------------------------------------------

  // Transit layer
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    if (showTransit) {
      if (!transitLayerRef.current) {
        transitLayerRef.current = new google.maps.TransitLayer();
      }
      transitLayerRef.current.setMap(mapRef.current);
    } else {
      transitLayerRef.current?.setMap(null);
    }
  }, [showTransit, isLoaded]);

  // 5km mesh-event circles
  useEffect(() => {
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];
    if (!mapRef.current || !isLoaded) return;
    facilities.forEach((f) => {
      if (!f.position || !meshEventFacilityIds.has(f.id)) return;
      const circle = new google.maps.Circle({
        map: mapRef.current!,
        center: f.position,
        radius: 5000,
        fillColor: INCIDENT_RED,
        fillOpacity: 0.07,
        strokeColor: INCIDENT_RED,
        strokeOpacity: 0.45,
        strokeWeight: 1.5,
        clickable: false,
        zIndex: 1,
      });
      circlesRef.current.push(circle);
    });
  }, [facilities, meshEventFacilityIds, isLoaded]);

  // ---------------------------------------------------------------------------
  // Directions
  // ---------------------------------------------------------------------------

  function clearDirections() {
    dirRendererRef.current?.setMap(null);
    dirRendererRef.current = null;
    setDirectionsResult(null);
  }

  function doDirections(
    origin: { lat: number; lng: number },
    dest: { lat: number; lng: number },
  ) {
    setDirectionsLoading(true);
    clearDirections();

    // Place a blue dot for user's position
    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = new google.maps.Marker({
      position: origin,
      map: mapRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#6366f1',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
      title: 'Your location',
      zIndex: 999,
    });

    const svc = new google.maps.DirectionsService();
    svc.route(
      {
        origin,
        destination: dest,
        travelMode: google.maps.TravelMode[travelMode],
      },
      (result, status) => {
        setDirectionsLoading(false);
        if (status === 'OK' && result) {
          setDirectionsResult(result);
          const renderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#6366f1', strokeWeight: 4, strokeOpacity: 0.85 },
          });
          renderer.setMap(mapRef.current!);
          renderer.setDirections(result);
          dirRendererRef.current = renderer;
        }
      },
    );
  }

  function handleGetDirections(dest: { lat: number; lng: number }) {
    if (userLocation) {
      doDirections(userLocation, dest);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        doDirections(loc, dest);
      },
      () => alert('Enable location access to get directions.'),
      { enableHighAccuracy: true },
    );
  }

  // ---------------------------------------------------------------------------
  // Map load callback
  // ---------------------------------------------------------------------------

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // ---------------------------------------------------------------------------
  // Error / loading states
  // ---------------------------------------------------------------------------

  if (!apiKey) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <div className="max-w-sm text-center">
          <p className="font-medium">Google Maps API key missing</p>
          <p className="mt-2 text-xs">
            Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to{' '}
            <code>.env.local</code> and restart.
          </p>
        </div>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-destructive">
        Map failed to load: {loadError.message}
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* ------------------------------------------------------------------ */}
      {/* Header strip                                                         */}
      {/* ------------------------------------------------------------------ */}
      <header className="z-10 flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/community/home"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-sm font-semibold">Community Safety Map</h1>
            <p className="text-[11px] text-muted-foreground">
              {facilities.length} facilities · {incidents.length} active incident
              {incidents.length === 1 ? '' : 's'}
              {meshEventFacilityIds.size > 0 &&
                ` · ${meshEventFacilityIds.size} mesh alert${meshEventFacilityIds.size === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showTransit ? 'default' : 'outline'}
            onClick={() => setShowTransit((s) => !s)}
          >
            <Bus className="mr-1 h-3.5 w-3.5" />
            Transit {showTransit ? 'on' : 'off'}
          </Button>
          <Link href="/evacuate">
            <Button size="sm" variant="destructive">
              <Navigation className="mr-1 h-3.5 w-3.5" />
              Evacuate
            </Button>
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Map + side panel                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex min-h-0 flex-1">
        {/* Map */}
        <div className="relative min-w-0 flex-1">
          <GoogleMap
            mapContainerStyle={CONTAINER}
            center={center}
            zoom={13}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              styles: MAP_DARK as google.maps.MapTypeStyle[],
            }}
            onLoad={onMapLoad}
          >
            {facilities
              .filter((f) => f.position)
              .map((f) => {
                const Icon = ICONS[f.data.type];
                const facIncidents = incidentsByFacility.get(f.id) ?? [];
                const hasIncident = facIncidents.length > 0;
                const hasCritical = facIncidents.some((i) => i.severity === 'critical');
                const accent = hasIncident ? INCIDENT_RED : ACCENT_HEX[f.data.type];
                const isSelected = selectedFacility?.id === f.id;

                return (
                  <OverlayView
                    key={f.id}
                    position={f.position!}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
                  >
                    <div
                      className="relative flex cursor-pointer flex-col items-center"
                      onClick={() => {
                        setSelectedFacility(isSelected ? null : f);
                        if (isSelected) clearDirections();
                      }}
                    >
                      {/* Pulse ring — critical incidents only */}
                      {hasCritical && (
                        <motion.span
                          className="absolute h-10 w-10 rounded-full"
                          style={{ backgroundColor: INCIDENT_RED }}
                          initial={{ scale: 0.4, opacity: 0.7 }}
                          animate={{ scale: 2.8, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeOut' }}
                        />
                      )}

                      {/* Icon circle */}
                      <div
                        className="z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-lg transition-all duration-200"
                        style={{
                          backgroundColor: accent,
                          borderColor: hasIncident ? '#fca5a5' : isSelected ? '#fff' : 'rgba(255,255,255,0.5)',
                          boxShadow: hasCritical
                            ? '0 0 14px 5px rgba(239,68,68,0.55)'
                            : isSelected
                            ? '0 0 0 3px rgba(255,255,255,0.4)'
                            : undefined,
                          transform: isSelected ? 'scale(1.15)' : undefined,
                        }}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>

                      {/* Name tag */}
                      <span
                        className="z-10 mt-1 max-w-[120px] truncate rounded px-1.5 py-0.5 text-[10px] font-semibold shadow"
                        style={
                          hasIncident
                            ? { backgroundColor: '#7f1d1d', color: '#fca5a5' }
                            : { backgroundColor: 'rgba(17,24,39,0.88)', color: '#d1d5db' }
                        }
                      >
                        {hasIncident ? '🔴 ' : ''}{f.data.name}
                      </span>
                    </div>
                  </OverlayView>
                );
              })}
          </GoogleMap>

          {/* Map legend */}
          <div className="absolute bottom-4 left-4 rounded-lg border bg-background/90 p-2.5 text-[10px] text-muted-foreground shadow backdrop-blur">
            <p className="mb-1.5 font-semibold uppercase tracking-wide">Legend</p>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                Active incident
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full border border-red-400 bg-red-500/10" />
                5km mesh alert radius
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
                Your location
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Info panel — appears when a facility is selected               */}
        {/* -------------------------------------------------------------- */}
        {selectedFacility && (
          <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-l bg-card">
            {/* Header */}
            <div className="flex items-start justify-between border-b p-4">
              <div>
                <h2 className="font-semibold leading-tight">{selectedFacility.data.name}</h2>
                <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                  {FACILITY_THEME[selectedFacility.data.type].label}
                  {selectedFacility.data.tier ? ` · Tier ${selectedFacility.data.tier}` : ''}
                </p>
              </div>
              <button
                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  setSelectedFacility(null);
                  clearDirections();
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Address */}
            {selectedFacility.data.address && (
              <div className="flex items-start gap-2 px-4 py-2 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{selectedFacility.data.address}</span>
              </div>
            )}

            {/* Active incidents */}
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Live Incident Status
              </p>
              {(() => {
                const facInc = incidentsByFacility.get(selectedFacility.id) ?? [];
                if (facInc.length === 0) {
                  return (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      No active incidents — safe
                    </div>
                  );
                }
                return (
                  <ul className="space-y-2">
                    {facInc.map((inc) => (
                      <li key={inc.id} className="rounded-lg border bg-background p-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium capitalize">
                            {inc.type.replace(/_/g, ' ')}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              inc.severity === 'critical'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                : inc.severity === 'high'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
                            }
                          >
                            {inc.severity}
                          </Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {inc.location.zone} · Floor {inc.location.floor}
                        </p>
                        {inc.description && (
                          <p className="mt-1 line-clamp-2 text-muted-foreground/80">
                            {inc.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>

            {/* Mesh alert indicator */}
            {meshEventFacilityIds.has(selectedFacility.id) && (
              <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Active mesh alert — 5km advisory zone active
              </div>
            )}

            {/* Directions */}
            <div className="mt-auto border-t p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Get Directions
              </p>

              {/* Travel mode */}
              <div className="mb-3 flex gap-1.5">
                {TRAVEL_OPTIONS.map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setTravelMode(mode)}
                    className={`flex flex-1 flex-col items-center gap-0.5 rounded-md border py-1.5 text-[10px] transition-colors ${
                      travelMode === mode
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <Button
                className="w-full"
                size="sm"
                disabled={!selectedFacility.position || directionsLoading}
                onClick={() =>
                  selectedFacility.position && handleGetDirections(selectedFacility.position)
                }
              >
                <Navigation className="mr-1.5 h-3.5 w-3.5" />
                {directionsLoading ? 'Routing…' : 'Get Directions'}
              </Button>

              {/* Route summary */}
              {directionsResult && (
                <div className="mt-2.5 rounded-md bg-muted p-2.5 text-xs">
                  <p className="font-medium">
                    {directionsResult.routes[0]?.legs[0]?.duration?.text}
                    {' · '}
                    {directionsResult.routes[0]?.legs[0]?.distance?.text}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    via {travelMode.charAt(0) + travelMode.slice(1).toLowerCase()}
                  </p>
                </div>
              )}

              {/* Full evacuate link */}
              <Link
                href={`/evacuate?fid=${selectedFacility.id}`}
                className="mt-3 block text-center text-xs text-primary hover:underline"
              >
                Open full evacuation plan →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
