'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  ClipboardList,
  Map as MapIcon,
  Network,
  Users,
  Home,
  ShieldAlert,
  UserCheck,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { FACILITY_THEME } from '@scr-mesh/constants';
import type { Facility } from '@scr-mesh/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: '/admin/overview', label: 'Overview', icon: Activity },
  { href: '/admin/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/admin/staff', label: 'Staff', icon: Users },
  { href: '/admin/facility', label: 'Facility', icon: Building2 },
  { href: '/admin/mesh', label: 'Mesh', icon: Network },
  { href: '/admin/mesh/live', label: 'Live Map', icon: MapIcon },
  { href: '/admin/playbooks', label: 'Playbooks', icon: ClipboardList },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const COMMUNITY_NAV = [
  { href: '/community/home', label: 'Comm. Home', icon: Home },
  { href: '/community/navigate', label: 'Comm. Map', icon: MapIcon },
  { href: '/community/sos', label: 'Comm. SOS', icon: ShieldAlert },
  { href: '/community/checkin', label: 'Check-In', icon: UserCheck },
  { href: '/community/contacts', label: 'Contacts', icon: Phone },
  { href: '/evacuate', label: 'Evac Map', icon: MapIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { facilityIds, currentFacilityId, setCurrentFacilityId } = useAuth();
  const [facilities, setFacilities] = useState<Record<string, Facility>>({});

  useEffect(() => {
    if (facilityIds.length === 0) return;
    const unsubs = facilityIds.map((fid) =>
      onSnapshot(doc(db, 'facilities', fid), (snap) => {
        if (snap.exists()) {
          setFacilities((prev) => ({ ...prev, [snap.id]: snap.data() as Facility }));
        }
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [facilityIds]);

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-5">
        <span className="text-base font-semibold">SCR-Mesh</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 overflow-y-auto">
        {/* Community Section - Hidden on Admin Mesh Live view per request */}
        {pathname !== '/admin/mesh/live' && (
          <div className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Community Access</p>
            <div className="space-y-1">
              {COMMUNITY_NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-all duration-200',
                      active
                        ? 'bg-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-500/5'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-2 border-t border-white/5 pt-4">
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Admin Hub</p>
          <div className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Facility switcher widget */}
      {facilityIds.length > 0 && (
        <div className="mt-auto border-t p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Facilities
          </p>
          <div className="flex flex-col gap-1">
            {(() => {
              const seen = new Set<string>();
              return Array.from(new Set(facilityIds))
                .map((fid) => ({ fid, fac: facilities[fid] }))
                .filter(({ fac }) => {
                  if (!fac) return true; // Show placeholder while loading
                  if (seen.has(fac.name)) return false;
                  if (fac.name === 'Demo Hospital' || fac.name === 'demo_hospital') return false;
                  seen.add(fac.name);
                  return true;
                })
                .map(({ fid, fac }) => {
                  const facTheme = fac ? FACILITY_THEME[fac.type] : null;
                  const isActive = fid === currentFacilityId;

                  return (
                    <button
                      key={fid}
                      onClick={() => setCurrentFacilityId(fid)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium ring-1 ring-primary/30'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      {facTheme && (
                        <span
                          className={cn(
                            'inline-flex h-2 w-2 shrink-0 rounded-full',
                            facTheme.accentClass,
                          )}
                        />
                      )}
                      <span className="truncate">{fac?.name ?? fid}</span>
                    </button>
                  );
                });
            })()}
          </div>
        </div>
      )}
    </aside>
  );
}
