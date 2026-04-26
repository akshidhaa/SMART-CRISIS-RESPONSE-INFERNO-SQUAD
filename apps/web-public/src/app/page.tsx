'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  MapPin, 
  Radio, 
  Bell, 
  Info, 
  Activity, 
  HeartPulse, 
  Hotel, 
  School, 
  GraduationCap, 
  Factory,
  ChevronRight,
  PhoneCall
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommunityData } from '@/hooks/useCommunityData';
import { FACILITY_THEME } from '@scr-mesh/constants';

const ICONS: Record<string, any> = {
  hospital: HeartPulse,
  hotel: Hotel,
  school: School,
  college: GraduationCap,
  factory: Factory,
};

export default function CommunityPage() {
  const { facilities, alerts, incidents, loading } = useCommunityData();
  const [sosActive, setSosActive] = useState(false);

  const activeAlertsCount = incidents.filter(i => i.status !== 'resolved').length;

  return (
    <div className="p-4 md:p-8">
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* ── Left Column: Emergency & Status ───────────────────────── */}
        <div className="space-y-8 lg:col-span-7">
          
          {/* SOS Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-destructive/20 to-transparent p-1 ring-1 ring-destructive/30">
            <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-[#11141a] p-8">
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 ring-4 ring-destructive/20">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
                <h2 className="mb-2 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">Emergency SOS</h2>
                <p className="mb-8 max-w-md text-sm text-muted-foreground">
                  Only use this button if you are in immediate danger or witnessing a life-safety incident.
                </p>
                
                <button 
                  onClick={() => setSosActive(!sosActive)}
                  className={cn(
                    "group relative flex h-32 w-32 items-center justify-center rounded-full transition-all duration-500 active:scale-95",
                    sosActive ? "pulse-red" : "bg-destructive hover:bg-destructive/90"
                  )}
                >
                  <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
                  <span className="text-2xl font-black text-white">SOS</span>
                </button>
                
                {sosActive && (
                  <div className="mt-8 animate-in fade-in slide-in-from-top-4">
                    <p className="text-sm font-bold text-destructive">EMERGENCY REPORTING ACTIVE</p>
                    <p className="text-xs text-muted-foreground">Connecting to nearest response hub...</p>
                  </div>
                )}
              </div>
              
              {/* Background decorative elements */}
              <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-destructive/5 blur-3xl" />
              <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            </div>
          </div>

          {/* Facility Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight">Facility Status</h3>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" /> Live Updates
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Object.values(facilities).length === 0 ? (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                  <p className="text-sm text-muted-foreground">Waiting for mesh data...</p>
                </div>
              ) : (
                Object.values(facilities).map((fac) => {
                  const Icon = ICONS[fac.data.type] || Info;
                  const hasIncident = incidents.some(i => i.facilityId === fac.id && i.status !== 'resolved');

                  return (
                    <div 
                      key={fac.id}
                      className={cn(
                        "group relative flex flex-col rounded-3xl border p-6 transition-all duration-300",
                        hasIncident 
                          ? "bg-destructive/10 border-destructive/40 shadow-lg shadow-destructive/5" 
                          : "bg-[#11141a] border-white/10 hover:border-primary/50 hover:bg-[#141820] shadow-xl"
                      )}
                    >
                      <div className="mb-6 flex items-center justify-between">
                        <div className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors",
                          hasIncident ? "bg-destructive text-white" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                        )}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            hasIncident ? "bg-destructive animate-pulse" : "bg-emerald-500"
                          )} />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            hasIncident ? "text-destructive" : "text-emerald-500"
                          )}>
                            {hasIncident ? 'Alert' : 'Safe'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-base font-bold truncate text-white">{fac.data.name}</h4>
                        <p className="text-[11px] uppercase tracking-widest font-medium text-muted-foreground">{fac.data.type}</p>
                      </div>

                      <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-4">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {hasIncident ? 'Incident Reported' : 'Normal Operations'}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column: Alerts Feed ─────────────────────────────── */}
        <div className="lg:col-span-5">
          <div className="flex flex-col h-full rounded-3xl bg-[#11141a] border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-5">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="font-bold tracking-tight">Neighborhood Alerts</h3>
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
                  <p className="text-[11px] text-muted-foreground/60 mt-1">No active incidents reported</p>
                </div>
              ) : (
                incidents.map((incident) => (
                  <div 
                    key={incident.id}
                    className={cn(
                      "flex flex-col rounded-xl border p-4 transition-all",
                      incident.status === 'resolved' 
                        ? "bg-white/2 border-white/5 grayscale" 
                        : "bg-destructive/10 border-destructive/20"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="space-y-1">
                        <span className={cn(
                          "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                          incident.status === 'resolved' ? "bg-muted text-muted-foreground" : "bg-destructive text-white"
                        )}>
                          {incident.type.replace(/_/g, ' ')}
                        </span>
                        <h5 className="text-sm font-bold mt-1">
                          {facilities[incident.facilityId]?.data.name ?? incident.facilityId}
                        </h5>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(incident.reportedAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {incident.status === 'resolved' 
                        ? 'This incident has been resolved. Personnel are conducting final safety checks.' 
                        : 'Emergency responders are on-site. Follow established safety protocols and avoid the area.'}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-white/5 bg-white/2">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-bold hover:bg-white/10 transition-colors">
                <PhoneCall className="h-4 w-4" />
                Local Emergency Services
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
