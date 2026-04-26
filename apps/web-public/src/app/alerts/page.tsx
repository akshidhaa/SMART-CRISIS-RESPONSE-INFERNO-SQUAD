'use client';

import { Bell, ShieldAlert, Activity, CheckCircle2 } from 'lucide-react';
import { useCommunityData } from '@/hooks/useCommunityData';
import { cn } from '@/lib/utils';

export default function AlertsPage() {
  const { incidents, loading } = useCommunityData();

  const active = incidents.filter(i => i.status !== 'resolved');
  const resolved = incidents.filter(i => i.status === 'resolved');

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Real-time Alerts</h1>
        <p className="text-muted-foreground">Monitor active incidents and safety notifications across the mesh network.</p>
      </div>

      <div className="space-y-10">
        {/* Active Incidents */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-sm font-black uppercase tracking-widest">Active Incidents</h2>
          </div>
          
          <div className="grid gap-4">
            {active.length === 0 ? (
              <div className="rounded-3xl border border-white/5 bg-emerald-500/5 p-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
                <p className="font-bold text-emerald-500">All Systems Clear</p>
                <p className="text-xs text-muted-foreground mt-1">No active incidents reported in the cluster.</p>
              </div>
            ) : (
              active.map((incident) => (
                <div key={incident.id} className="group relative overflow-hidden rounded-3xl border border-destructive/30 bg-destructive/5 p-6 transition-all hover:bg-destructive/10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive text-white animate-pulse">
                        <ShieldAlert className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-destructive text-white px-2 py-0.5 rounded">
                            {incident.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Reported {new Date(incident.reportedAtMs).toLocaleTimeString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1">Response hub active at facility hub</h3>
                      </div>
                    </div>
                    <button className="rounded-xl bg-white text-black px-6 py-2 text-xs font-black uppercase transition-transform active:scale-95">
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Resolved Feed */}
        <section className="space-y-4 opacity-60">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-5 w-5" />
            <h2 className="text-sm font-black uppercase tracking-widest">Incident History</h2>
          </div>
          
          <div className="grid gap-3">
            {resolved.map((incident) => (
              <div key={incident.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/2 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">{incident.type.replace(/_/g, ' ')} RESOLVED</p>
                    <p className="text-[10px] text-muted-foreground">Cleared at {new Date(incident.reportedAtMs).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
