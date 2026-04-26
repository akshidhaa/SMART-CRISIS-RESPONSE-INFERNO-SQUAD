'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCommunityData } from '@/hooks/useCommunityData';
import { MeshMap } from '@/components/mesh-live/MeshMap';
import { MapPin, Shield } from 'lucide-react';

export default function NavigatePage() {
  const { facilities, incidents, loading: dataLoading } = useCommunityData();
  const [timedOut, setTimedOut] = useState(false);

  // Fail-safe: If data takes too long, stop showing the spinner
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const loading = dataLoading && !timedOut;

  // Filter out "Demo Hospital" and duplicates for the map
  const filteredFacilities = useMemo(() => {
    const next: Record<string, any> = {};
    const seenNames = new Set();
    
    Object.entries(facilities).forEach(([id, fac]) => {
      if (fac.data.name !== 'Demo Hospital' && !seenNames.has(fac.data.name)) {
        next[id] = fac;
        seenNames.add(fac.data.name);
      }
    });
    return next;
  }, [facilities]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Initialising Safety Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Community Safety Map</h1>
          <p className="text-muted-foreground">Real-time mesh navigation through the Bengaluru Cluster.</p>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] h-[600px] md:h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0c10]">
        <MeshMap 
          facilities={filteredFacilities} 
          incidents={incidents}
          arcs={[]}
          showHeatmap={false}
        />
      </div>
    </div>
  );
}
