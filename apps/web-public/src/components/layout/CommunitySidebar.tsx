'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Map as MapIcon, 
  Bell, 
  Info, 
  ShieldAlert,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Community Feed', icon: Home },
  { href: '/map', label: 'Safety Map', icon: MapIcon },
  { href: '/alerts', label: 'Real-time Alerts', icon: Bell },
  { href: '/playbooks', label: 'Emergency Guides', icon: Info },
];

export function CommunitySidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0a0c10] lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
            <ShieldAlert className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">SCR-Mesh</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 p-4">
        <p className="mb-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Navigation</p>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300',
                active
                  ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-[1.02]'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-3xl bg-destructive/5 p-5 ring-1 ring-destructive/20 transition-all hover:bg-destructive/10">
          <div className="mb-3 flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">Emergency Mode</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
            Report any immediate danger directly to the response hub.
          </p>
        </div>
      </div>
    </aside>
  );
}
