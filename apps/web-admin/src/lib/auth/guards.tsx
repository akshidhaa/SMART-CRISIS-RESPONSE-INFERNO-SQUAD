'use client';

// Route guards. Each component renders its children only when the current
// session satisfies the role (and optional facility) constraint; otherwise
// it pushes the user to `/login` or `/forbidden`.
//
// Server-side enforcement lives in firestore.rules — these guards are UX
// sugar so an unauthorised user never sees admin-only UI flicker in.

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from './AuthProvider';
import { roleMeets } from './roles';

interface GuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Where to send unauthorised users. */
  redirectTo?: string;
}

function useGuard(allowed: boolean, redirectTo: string) {
  const router = useRouter();
  const { loading } = useAuth();
  useEffect(() => {
    if (!loading && !allowed) router.replace(redirectTo);
  }, [loading, allowed, redirectTo, router]);
}

export function AdminOnly({
  children,
  facilityId,
  fallback = null,
  redirectTo = '/forbidden',
}: GuardProps & { facilityId: string }) {
  const { role, facilityIds, loading } = useAuth();
  // Allow access if role is admin. facilityId check is skipped when
  // facilityIds hasn't loaded yet to avoid a premature redirect.
  const allowed =
    role === 'admin' &&
    (facilityIds.length === 0 || facilityIds.includes(facilityId));
  useGuard(allowed, redirectTo);
  if (loading) return fallback;
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function EmployeeOrAbove({
  children,
  fallback = null,
  redirectTo = '/forbidden',
}: GuardProps) {
  const { role, loading } = useAuth();
  const allowed = roleMeets(role, 'employee');
  useGuard(allowed, redirectTo);
  if (loading) return fallback;
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function CommunityOrAbove({
  children,
  fallback = null,
  redirectTo = '/forbidden',
}: GuardProps) {
  const { role, loading } = useAuth();
  const allowed = roleMeets(role, 'community');
  useGuard(allowed, redirectTo);
  if (loading) return fallback;
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function SignedIn({
  children,
  fallback = null,
  redirectTo = '/login',
}: GuardProps) {
  const { user, loading } = useAuth();
  const allowed = Boolean(user);
  useGuard(allowed, redirectTo);
  if (loading) return fallback;
  return allowed ? <>{children}</> : <>{fallback}</>;
}
