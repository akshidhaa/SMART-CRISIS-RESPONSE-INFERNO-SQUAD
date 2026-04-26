'use client';

import { useMemo } from 'react';
import { useCommunityData } from '@/hooks/useCommunityData';
import { MeshMap } from '@/components/mesh-live/MeshMap';
import { ShieldAlert, MapPin, ChevronRight } from 'lucide-react';

export default function EvacuationPage() {
  const { facilities, incidents, loading } = useCommunityData();

  const filteredFacilities = useMemo(() => {
    const next: Record<string, any> = {};
    Object.entries(facilities).forEach(([id, fac]) => {
      if (fac.data.name !== 'Demo Hospital') {
        next[id] = fac;
      }
    });
    return next;
  }, [facilities]);

  const activeIncidentFacilityIds = new Set(
    incidents.filter(i => i.status !== 'resolved').map(i => i.facilityId)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Urgent Protocol</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Evacuation Map</h1>
          <p className="text-muted-foreground">Follow designated safe paths to the nearest recovery hub.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 flex-1 min-h-0">
        <div className="lg:col-span-8 relative rounded-3xl overflow-hidden border-2 border-destructive/20 shadow-2xl">
          <MeshMap 
            facilities={filteredFacilities} 
            incidents={incidents}
            arcs={[]}
            showHeatmap={false}
          />
          <div className="absolute top-6 right-6 rounded-2xl bg-destructive/90 p-4 text-white backdrop-blur-xl border border-white/20">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1">Status</p>
            <p className="text-xs font-bold">EVACUATION ACTIVE</p>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Safe Recovery Hubs</h3>
          <div className="space-y-4">
            {Object.values(filteredFacilities).filter(f => !activeIncidentFacilityIds.has(f.id)).map((fac) => (
              <div key={fac.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#11141a] p-5 hover:border-emerald-500/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{fac.data.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Safe Zone · Open</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
          
          <div className="rounded-3xl bg-destructive/10 border border-destructive/20 p-6 mt-8">
            <h4 className="text-sm font-black text-destructive uppercase mb-2">Notice</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Avoid all markers pulsing red. Follow instructions from mesh responders on the ground.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
