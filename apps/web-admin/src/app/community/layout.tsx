'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { SignedIn, useAuth } from '@/lib/auth';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import { FacilityThemeScope } from '@/components/theme/FacilityThemeScope';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, AlertCircle, Map, Users, QrCode, Bell, X, ShieldCheck } from 'lucide-react';
import { CommunityFacilityProvider, useCommunityView } from '@/lib/communityContext';
import { IncidentAlertBanner } from '@/components/alerts/IncidentAlertBanner';
import { AlertVoiceAnnouncer } from '@/components/alerts/AlertVoiceAnnouncer';

interface IncidentSummary {
  id: string; type: string; severity: string; status: string; createdAt: any;
}

// ─── Gate ────────────────────────────────────────────────────────────────────

function CommunityGate({ children }: { children: ReactNode }) {
  const { currentFacilityId, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading SCR Community…</p>
        </div>
      </div>
    );
  }

  if (!currentFacilityId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldCheck className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <p className="font-bold text-foreground">Access Denied</p>
          <p className="mt-1 text-sm text-muted-foreground">You are not associated with any active facility.</p>
        </div>
        <button
          onClick={async () => {
            const { auth } = await import('@/lib/firebase');
            await auth.signOut();
            localStorage.clear();
            window.location.href = '/login';
          }}
          className="rounded-xl bg-destructive/10 px-5 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
        >
          Sign Out & Clear Session
        </button>
      </div>
    );
  }

  return (
    <CommunityFacilityProvider>
      <Shell>{children}</Shell>
    </CommunityFacilityProvider>
  );
}

// ─── Bell Dropdown ───────────────────────────────────────────────────────────

function BellDropdown({ incidents }: { incidents: IncidentSummary[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 backdrop-blur transition-colors hover:bg-muted"
      >
        <Bell className="h-4 w-4" />
        {incidents.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-white">
            {incidents.length > 9 ? '9+' : incidents.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-bold">Active Alerts</span>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-muted">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            {incidents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <ShieldCheck className="h-8 w-8 text-emerald-500" />
                <p className="text-xs text-muted-foreground">No active incidents</p>
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto divide-y divide-border">
                {incidents.slice(0, 8).map((inc) => (
                  <li key={inc.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${
                      inc.severity === 'critical' ? 'bg-red-500' :
                      inc.severity === 'high'     ? 'bg-orange-500' :
                      inc.severity === 'medium'   ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate capitalize">
                        {String(inc.type ?? '').replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] capitalize text-muted-foreground">{inc.status?.replace(/_/g, ' ')}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      inc.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      inc.severity === 'high'     ? 'bg-orange-100 text-orange-700' :
                                                     'bg-yellow-100 text-yellow-700'
                    }`}>{inc.severity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Bottom Nav ──────────────────────────────────────────────────────────────

function CommunityBottomNav({ alertCount }: { alertCount: number }) {
  const pathname = usePathname();
  const navItems = [
    { name: 'Home',     href: '/community/home',     icon: Home },
    { name: 'Check-In', href: '/community/checkin',  icon: QrCode },
    { name: 'SOS',      href: '/community/sos',      icon: AlertCircle, highlight: true },
    { name: 'Navigate', href: '/community/navigate', icon: Map },
    { name: 'Contacts', href: '/community/contacts', icon: Users },
  ];

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50">
      <div
        className="flex items-center justify-around rounded-[28px] px-2 py-2 shadow-2xl"
        style={{
          background: 'hsl(var(--background)/0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid hsl(var(--border)/0.6)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.06) inset',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          if (item.highlight) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="relative -top-5 flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-xl border-4 border-background transition-all active:scale-90"
                style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)', boxShadow: '0 4px 20px rgba(239,68,68,0.5)' }}
              >
                <Icon className="h-6 w-6 text-white" />
                {alertCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-black ring-2 ring-background">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
                <span className="sr-only">SOS</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all active:scale-95"
              style={isActive ? { background: 'hsl(var(--primary)/0.12)' } : {}}
            >
              <Icon className="h-5 w-5 transition-colors" style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
              <span className="text-[10px] font-semibold transition-colors" style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shell inner — reads context set by home page ────────────────────────────

function ShellInner({ homeFacilityName, homeFacilityType, children }: {
  homeFacilityName: string;
  homeFacilityType: string;
  children: ReactNode;
}) {
  const { currentFacilityId } = useAuth();
  const { viewFacility } = useCommunityView();
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);

  // Watch incidents for whichever facility is currently viewed
  const watchId = viewFacility?.id ?? currentFacilityId ?? '';

  useEffect(() => {
    if (!watchId) return;
    const q = query(
      collection(db, 'incidents'),
      where('facilityId', '==', watchId),
      where('status', 'in', ['reported', 'acknowledged', 'in_progress']),
    );
    return onSnapshot(q, (snap) => {
      setIncidents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as IncidentSummary)));
    });
  }, [watchId]);

  // Display data: prefer the user-selected view facility, fall back to home
  const displayName = viewFacility?.name ?? homeFacilityName;
  const displayType = viewFacility?.type ?? homeFacilityType;
  const hasAlert    = incidents.length > 0;

  return (
    <FacilityThemeScope facilityType={homeFacilityType as any}>
      <div className="flex flex-col min-h-screen bg-background text-foreground" style={{ paddingBottom: '6rem' }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-40 px-4 py-3"
          style={{
            background: 'hsl(var(--background)/0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid hsl(var(--border)/0.5)',
            boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center justify-between">
            {/* Brand + currently viewed facility name */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
                  Bengaluru Safety Mesh
                </span>
              </div>
              <p className="mt-0.5 truncate max-w-[240px] text-xs font-bold leading-tight text-muted-foreground uppercase tracking-widest">
                {displayName ? `Focus: ${displayName}` : 'Active Monitoring Area'}
              </p>
            </div>

            {/* Right: alert dot + type badge + bell */}
            <div className="flex shrink-0 items-center gap-3">
              {hasAlert && (
                <span
                  className="h-2 w-2 rounded-full bg-destructive animate-pulse"
                  style={{ boxShadow: '0 0 0 3px rgba(239,68,68,0.25)' }}
                />
              )}
              
              <div className="hidden sm:block h-8 w-px bg-border/50 mx-1" />

              <div className="flex flex-col items-end mr-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-tighter">Current Zone</span>
                <span className="text-[11px] font-bold text-emerald-500 uppercase">{displayType || 'Cluster'}</span>
              </div>

              <BellDropdown incidents={incidents} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 relative">
          {children}
        </main>

        <CommunityBottomNav alertCount={incidents.length} />

        {/* ── Real-time alert systems ──────────────────────────────── */}
        {/* IncidentAlertBanner: fires immediately when any incident hits Firestore */}
        <IncidentAlertBanner />
        {/* AlertVoiceAnnouncer: handles backend-dispatched alerts from the alerts collection */}
        <AlertVoiceAnnouncer />
      </div>
    </FacilityThemeScope>
  );
}

// ─── Shell — provides home facility data ─────────────────────────────────────

function Shell({ children }: { children: ReactNode }) {
  const { facility } = useCurrentFacility();
  return (
    <ShellInner
      homeFacilityName={facility?.data.name ?? ''}
      homeFacilityType={facility?.data.type ?? ''}
    >
      {children}
    </ShellInner>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <SignedIn>
      <CommunityGate>{children}</CommunityGate>
    </SignedIn>
  );
}
