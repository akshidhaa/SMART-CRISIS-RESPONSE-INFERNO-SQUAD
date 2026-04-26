'use client';

import { useMemo } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Bell, 
  MapPin, 
  HeartPulse, 
  Hotel, 
  School, 
  GraduationCap, 
  Factory,
  ChevronRight,
  PhoneCall,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommunityData } from '@/hooks/useCommunityData';
import { useCommunityView } from '@/lib/communityContext';
import { FACILITY_THEME } from '@scr-mesh/constants';

const ICONS: Record<string, any> = {
  hospital: HeartPulse,
  hotel: Hotel,
  school: School,
  college: GraduationCap,
  factory: Factory,
};

export default function CommunityHomePage() {
  const { facilities, alerts, incidents, loading } = useCommunityData();
  const { setViewFacility } = useCommunityView();

  // Filter out duplicates and "Demo Hospital"
  const filteredFacilities = useMemo(() => {
    const unique = new Map();
    Object.values(facilities).forEach(fac => {
      if (fac.data.name !== 'Demo Hospital' && !unique.has(fac.data.name)) {
        unique.set(fac.data.name, fac);
      }
    });
    return Array.from(unique.values());
  }, [facilities]);

  const activeAlertsCount = incidents.filter(i => i.status !== 'resolved').length;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Community Dashboard</h1>
        <p className="text-muted-foreground">Real-time safety overview of the Bengaluru Cluster.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-8 lg:col-span-7">
          {/* Facility Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight">Facility Status</h3>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" /> Live Updates
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredFacilities.map((fac) => {
                const Icon = ICONS[fac.data.type] || HeartPulse;
                const hasIncident = incidents.some(i => i.facilityId === fac.id && i.status !== 'resolved');

                return (
                  <button 
                    key={fac.id}
                    onClick={() => setViewFacility({ id: fac.id, name: fac.data.name, type: fac.data.type })}
                    className={cn(
                      "group relative flex flex-col text-left rounded-3xl border p-6 transition-all duration-300 shadow-xl",
                      hasIncident 
                        ? "bg-destructive/10 border-destructive/40" 
                        : "bg-[#11141a] border-white/10 hover:border-primary/50"
                    )}
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl",
                        hasIncident ? "bg-destructive text-white" : "bg-primary/10 text-primary"
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        hasIncident ? "bg-destructive animate-pulse" : "bg-emerald-500"
                      )} />
                    </div>
                    <h4 className="text-base font-bold text-white">{fac.data.name}</h4>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{fac.data.type}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5">
          <div className="flex flex-col h-full rounded-3xl bg-[#11141a] border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="font-bold tracking-tight">Recent Alerts</h3>
              </div>
              {activeAlertsCount > 0 && (
                <div className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">
                  {activeAlertsCount} ACTIVE
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Radio className="h-12 w-12 text-muted-foreground/20 mb-4 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Monitoring mesh network...</p>
                </div>
              ) : (
                incidents.map((incident) => (
                  <div key={incident.id} className={cn(
                    "rounded-xl border p-4",
                    incident.status === 'resolved' ? "bg-white/2 border-white/5 opacity-50" : "bg-destructive/10 border-destructive/20"
                  )}>
                    <p className="text-[10px] font-black uppercase text-destructive mb-1">{incident.type}</p>
                    <h5 className="text-sm font-bold text-white">{facilities[incident.facilityId]?.data.name ?? incident.facilityId}</h5>
                    <p className="text-[10px] text-muted-foreground mt-2">{new Date(incident.reportedAtMs).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
