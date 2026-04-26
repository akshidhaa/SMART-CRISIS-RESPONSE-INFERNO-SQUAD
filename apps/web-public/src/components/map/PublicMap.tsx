'use client';

import { useMemo, useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';
import type { FacilityNode } from '@scr-mesh/types';
import { FACILITY_THEME } from '@scr-mesh/constants';

const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

function centroidOf(nodes: FacilityNode[]): { lat: number, lng: number } {
  if (nodes.length === 0) return BENGALURU_CENTER;
  const lat = nodes.reduce((acc, n) => acc + n.position.lat, 0) / nodes.length;
  const lng = nodes.reduce((acc, n) => acc + n.position.lng, 0) / nodes.length;
  return { lat, lng };
}

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  clickableIcons: false,
  scrollwheel: true,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  ],
};

const BENGALURU_RESTRICTION = {
  latLngBounds: {
    north: 13.15,
    south: 12.80,
    east: 77.80,
    west: 77.40,
  },
  strictBounds: false,
};

export function PublicMap({ facilities, activeIncidentFacilityIds }: { 
  facilities: FacilityNode[], 
  activeIncidentFacilityIds: Set<string> 
}) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const center = useMemo(() => centroidOf(facilities), [facilities]);

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  return isLoaded ? (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={16}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          ...MAP_OPTIONS,
          restriction: BENGALURU_RESTRICTION,
          minZoom: 14,
        }}
      >
        {facilities.map((fac) => {
          const hasIncident = activeIncidentFacilityIds.has(fac.id);
          const theme = FACILITY_THEME[fac.data.type];
          const color = hasIncident ? '#ef4444' : (theme?.accentHex ?? '#3b82f6');
          
          return (
            <Marker
              key={fac.id}
              position={fac.position}
              title={fac.data.name}
              icon={{
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                fillColor: color,
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#ffffff',
                scale: 1.5,
                anchor: new google.maps.Point(12, 22),
              }}
            />
          );
        })}
      </GoogleMap>
      
      {/* Legend overlay */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 rounded-2xl bg-[#0a0c10]/90 p-4 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500 shadow-sm" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Normal Operations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-sm" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Active Incident</span>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-3xl bg-white/5 border border-white/10">
      <div className="flex flex-col items-center gap-2">
        <MapPin className="h-8 w-8 text-muted-foreground animate-bounce" />
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Loading Satellite Mesh...</p>
      </div>
    </div>
  );
}
