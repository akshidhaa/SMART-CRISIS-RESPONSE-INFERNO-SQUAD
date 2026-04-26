'use client';

import { ShieldCheck, UserCheck, Users, MapPin, CheckCircle2 } from 'lucide-react';

export default function CheckInPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Safety Check-In</h1>
        <p className="text-muted-foreground">Notify your community and family that you are safe during an active incident.</p>
      </div>

      <div className="grid gap-8">
        <div className="rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/20 p-10 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-4 ring-emerald-500/20 text-emerald-500">
            <UserCheck className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">I am safe</h2>
          <p className="text-sm text-muted-foreground mb-10 max-w-sm mx-auto">
            Broadcasting a "Safe" status will update your neighborhood status and notify emergency contacts.
          </p>
          <button className="w-full max-w-xs rounded-2xl bg-emerald-500 py-4 text-sm font-black uppercase text-white shadow-xl shadow-emerald-500/20 transition-transform active:scale-95">
            Broadcast Safety Status
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground px-2">Recent Neighborhood Check-ins</h3>
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#11141a] p-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Resident Hub {i}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Safe · Verified at 14:32</p>
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
