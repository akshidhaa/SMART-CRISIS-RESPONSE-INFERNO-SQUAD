// Role hierarchy helper. Higher number = more privilege.
// Kept in one place so guards and server code agree on the ordering.

import type { UserRole } from '@scr-mesh/types';

const ORDER: Record<UserRole, number> = {
  common: 0,
  community: 1,
  employee: 2,
  admin: 3,
};

export function roleMeets(role: UserRole | null, minimum: UserRole): boolean {
  if (!role) return false;
  return ORDER[role] >= ORDER[minimum];
}
