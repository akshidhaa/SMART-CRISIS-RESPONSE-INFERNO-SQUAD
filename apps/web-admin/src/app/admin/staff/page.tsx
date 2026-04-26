'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import { DESIGNATIONS_BY_FACILITY } from '@scr-mesh/constants';
import type { User, UserRole } from '@scr-mesh/types';

const ALL_ROLES: UserRole[] = ['admin', 'employee', 'community', 'common'];

const ROLE_BADGE: Record<UserRole, string> = {
  admin: 'bg-primary text-primary-foreground',
  employee: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
  community: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  common: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
};

export default function StaffPage() {
  const { currentFacilityId } = useAuth();
  const { facility } = useCurrentFacility();
  const [users, setUsers] = useState<(User & { id: string })[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentFacilityId) return;
    const q = query(
      collection(db, 'users'),
      where('facilityIds', 'array-contains', currentFacilityId),
    );
    return onSnapshot(q, (snap) =>
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as User) }))),
    );
  }, [currentFacilityId]);

  const designations = facility ? DESIGNATIONS_BY_FACILITY[facility.data.type] : [];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(needle) ||
        u.displayName?.toLowerCase().includes(needle) ||
        u.designation?.toLowerCase().includes(needle),
    );
  }, [users, search]);

  async function changeDesignation(uid: string, designation: string) {
    setError(null);
    try {
      await updateDoc(doc(db, 'users', uid), { designation });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function changeRole(uid: string, role: UserRole) {
    setError(null);
    if (!currentFacilityId) return;
    try {
      const fn = httpsCallable(functions, 'setUserRole');
      await fn({ uid, role, facilityId: currentFacilityId });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <p className="text-sm text-muted-foreground">
          Manage users associated with {facility?.data.name ?? 'this facility'}.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{filtered.length} user{filtered.length === 1 ? '' : 's'}</CardTitle>
          <div className="w-72">
            <Input
              placeholder="Search by name, email, or designation"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-3 rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Name / Email</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Designation</th>
                    <th className="py-2 pr-4 font-medium">Zones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((u) => (
                    <tr key={u.id} className="align-top">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{u.displayName || '—'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Badge className={ROLE_BADGE[u.role]}>{u.role}</Badge>
                          <Select
                            value={u.role}
                            onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                            className="h-8 w-32 text-xs"
                          >
                            {ALL_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </Select>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Select
                          value={u.designation ?? ''}
                          onChange={(e) => changeDesignation(u.id, e.target.value)}
                          className="h-8 w-44 text-xs"
                        >
                          <option value="">—</option>
                          {designations.map((d) => (
                            <option key={d.id} value={d.label}>{d.label}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {u.zones?.length ? u.zones.join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <CardContent className="text-xs text-muted-foreground">
          <p>
            Role changes call the <code>setUserRole</code> Cloud Function and update custom claims.
            Designation is written directly to the user document.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
