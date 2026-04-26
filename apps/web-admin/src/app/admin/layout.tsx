'use client';

// Admin shell. Wraps every /admin/* route in:
//   1. SignedIn — bounce to /login if not authenticated.
//   2. AdminOnly(currentFacilityId) — bounce to /forbidden otherwise.
//   3. FacilityThemeScope — facility-tinted accents.
//   4. Sidebar + Topbar chrome.
//
// AdminOnly requires a facilityId; we wait for currentFacilityId to settle
// (handled by AuthProvider's localStorage rehydration). When it's still
// null but loading is done, the user has no facilities → /forbidden.

import { type ReactNode } from 'react';
import { AdminOnly, SignedIn, useAuth } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import { FacilityThemeScope } from '@/components/theme/FacilityThemeScope';
import { AlertVoiceAnnouncer } from '@/components/alerts/AlertVoiceAnnouncer';
import { ConnectivityProvider } from '@/lib/connectivity/ConnectivityProvider';
import { ConnectivityToolbar } from '@/components/connectivity/ConnectivityToolbar';
import { CellularBanner, BleMeshBanner } from '@/components/connectivity/CellularBanner';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SignedIn>
      <AdminGate>{children}</AdminGate>
    </SignedIn>
  );
}

function AdminGate({ children }: { children: ReactNode }) {
  const { currentFacilityId, facilityIds, role, loading } = useAuth();

  // Still loading — show spinner, never redirect yet
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  // Loading done but no facility assigned — show debug info
  if (!currentFacilityId || facilityIds.length === 0) {
    return (
      <DebugPanel role={role} facilityIds={facilityIds} />
    );
  }

  // Guard: wait for the sync effect to align currentFacilityId with facilityIds.
  // Without this, a stale localStorage value triggers an immediate /forbidden redirect.
  if (!facilityIds.includes(currentFacilityId)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  return (
    <AdminOnly facilityId={currentFacilityId}>
      <Shell>{children}</Shell>
    </AdminOnly>
  );
}

function DebugPanel({ role, facilityIds }: { role: string | null; facilityIds: string[] }) {
  const uid = auth.currentUser?.uid ?? 'not signed in';
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center text-sm">
      <p className="text-lg font-semibold text-foreground">Profile not loading</p>
      <div className="rounded-lg border bg-muted p-4 text-left font-mono text-xs space-y-1">
        <p><span className="text-muted-foreground">Auth UID:</span> {uid}</p>
        <p><span className="text-muted-foreground">Role:</span> {role ?? 'null — Firestore read returned nothing'}</p>
        <p><span className="text-muted-foreground">facilityIds:</span> {facilityIds.length ? facilityIds.join(', ') : 'empty'}</p>
      </div>
      <p className="text-muted-foreground max-w-sm">
        Go to Firestore Console → users collection → check the document ID exactly matches the Auth UID above.
      </p>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { facility } = useCurrentFacility();
  return (
    <FacilityThemeScope facilityType={facility?.data.type}>
      <ConnectivityProvider>
        <div className="flex min-h-screen bg-background text-foreground">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <ConnectivityToolbar />
            <BleMeshBanner />
            <CellularBanner />
            <Topbar />
            <main className="flex-1 overflow-x-hidden p-4 lg:p-6">{children}</main>
          </div>
          <AlertVoiceAnnouncer />
        </div>
      </ConnectivityProvider>
    </FacilityThemeScope>
  );
}
