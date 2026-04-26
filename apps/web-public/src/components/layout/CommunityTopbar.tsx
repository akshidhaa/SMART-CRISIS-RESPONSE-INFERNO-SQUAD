'use client';

import { Activity, Radio, MapPin, Menu } from 'lucide-react';

export function CommunityTopbar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-[#0a0c10]/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <button className="lg:hidden text-white">
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold tracking-tight text-white">Bengaluru Cluster <span className="text-muted-foreground font-normal ml-1">· MG Road</span></span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden items-center gap-6 md:flex">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-500">Network Online</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mesh Active</span>
          </div>
        </div>
        
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[10px] font-black text-white ring-1 ring-white/10">
          IN
        </div>
      </div>
    </header>
  );
}
