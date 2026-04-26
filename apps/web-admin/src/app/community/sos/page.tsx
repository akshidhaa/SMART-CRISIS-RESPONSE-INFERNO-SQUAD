'use client';

import { useState } from 'react';
import { AlertTriangle, ShieldAlert, PhoneCall, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useCommunityView } from '@/lib/communityContext';

export default function CommunitySosPage() {
  const [sosActive, setSosActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { viewFacility } = useCommunityView();

  const triggerSos = async () => {
    if (sent || loading) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'incidents'), {
        facilityId: viewFacility?.id || 'city_gen_hosp',
        facilityType: viewFacility?.type || 'hospital',
        type: 'sos_alert',
        status: 'reported',
        severity: 'critical',
        reporterId: 'resident_mobile',
        reporterRole: 'community',
        description: `EMERGENCY SOS SIGNAL ACTIVATED AT ${viewFacility?.name || 'CITY GENERAL HOSPITAL'}`,
        location: { zone: 'Resident Current Location', floor: '1' },
        reportedAtMs: Date.now(),
        createdAt: serverTimestamp()
      });
      
      setSent(true);
      setSosActive(true);
    } catch (error) {
      console.error('SOS Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Status indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className={cn(
            "h-2 w-2 rounded-full animate-pulse",
            viewFacility ? "bg-emerald-500" : "bg-amber-500"
          )} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            {viewFacility ? `Alert Zone: ${viewFacility.name}` : "Global Mesh Monitoring"}
          </span>
        </div>

        <div className="relative overflow-hidden rounded-[3rem] bg-[#11141a] p-10 text-center border border-white/5 shadow-2xl">
          <div className="relative z-10 flex flex-col items-center">
            <div className={cn(
              "mb-8 flex h-24 w-24 items-center justify-center rounded-full ring-4 transition-all duration-500",
              sent ? "bg-emerald-500/10 ring-emerald-500/20" : "bg-destructive/10 ring-destructive/20"
            )}>
              {sent ? <CheckCircle2 className="h-12 w-12 text-emerald-500" /> : <AlertTriangle className="h-12 w-12 text-destructive" />}
            </div>
            <h2 className="mb-4 text-4xl font-black uppercase tracking-tight text-white">
              {sent ? "SOS Transmitted" : "Emergency SOS"}
            </h2>
            <p className="mb-10 text-muted-foreground leading-relaxed">
              {sent 
                ? `Your emergency signal has been broadcast to ${viewFacility?.name || 'the Mesh Command Hub'}. Help is on the way.`
                : `Activating this button will alert ${viewFacility?.name || 'the nearest mesh node'} and broadcast your location.`}
            </p>
            
            <button 
              onClick={triggerSos}
              disabled={loading || sent}
              className={cn(
                "group relative flex h-40 w-40 items-center justify-center rounded-full transition-all duration-500 active:scale-95 shadow-2xl",
                sent ? "bg-emerald-500 shadow-emerald-500/20" : "bg-destructive shadow-destructive/20 hover:bg-destructive/90",
                loading && "opacity-50"
              )}
            >
              {loading ? (
                <Loader2 className="h-12 w-12 text-white animate-spin" />
              ) : sent ? (
                <CheckCircle2 className="h-12 w-12 text-white" />
              ) : (
                <>
                  <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
                  <span className="text-3xl font-black text-white">SOS</span>
                </>
              )}
            </button>
            
            {sosActive && !sent && (
              <div className="mt-10 animate-in fade-in slide-in-from-top-4">
                <p className="text-lg font-bold text-destructive uppercase tracking-widest">Signal Transmitting</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-bold">Connecting to Command Hub...</p>
              </div>
            )}
          </div>
          
          {/* Background decorative elements */}
          <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-destructive/5 blur-3xl" />
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        </div>

        {!sent && !viewFacility && (
          <div className="mt-8 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">⚠️ No Alert Zone Selected</p>
            <p className="text-[10px] text-muted-foreground mt-1">SOS will default to City General Hospital. Return to Home to select your specific facility.</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button className="flex items-center justify-center gap-3 rounded-2xl bg-white/5 py-4 text-sm font-bold text-white border border-white/10 hover:bg-white/10 transition-all">
            <PhoneCall className="h-4 w-4" />
            Call Police
          </button>
          <button className="flex items-center justify-center gap-3 rounded-2xl bg-white/5 py-4 text-sm font-bold text-white border border-white/10 hover:bg-white/10 transition-all">
            <PhoneCall className="h-4 w-4" />
            Medical Help
          </button>
        </div>
      </div>
    </div>
  );
}
