'use client';

import { useCommunityData } from '@/hooks/useCommunityData';
import { PublicMap } from '@/components/map/PublicMap';
import { Shield, Info } from 'lucide-react';

export default function MapPage() {
  const { facilities, incidents, loading } = useCommunityData();

  const activeIncidentFacilityIds = new Set(
    incidents.filter(i => i.status !== 'resolved').map(i => i.facilityId)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Safety Map</h1>
          <p className="text-muted-foreground">Real-time visualization of facility status and incident locations.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 border border-emerald-500/20">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live Sync Active</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <PublicMap 
          facilities={Object.values(facilities)} 
          activeIncidentFacilityIds={activeIncidentFacilityIds} 
        />
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Info className="h-5 w-5" />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The map displays all facilities within the Bangalore cluster. Icons pulse <span className="text-destructive font-bold">RED</span> when an active incident is reported. Tap a marker for more information (coming soon).
        </p>
      </div>
    </div>
  );
}
