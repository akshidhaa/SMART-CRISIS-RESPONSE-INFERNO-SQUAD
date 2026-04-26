'use client';

import { useAuth } from '@/lib/auth';
import { useCurrentFacility } from '@/lib/useCurrentFacility';

export default function EmployeeProfile() {
  const { role, designation, facilityIds } = useAuth();
  const { facility } = useCurrentFacility();

  return (
    <div className="space-y-6 pb-4">
      <div className="px-1 pt-1 pb-4 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight">Profile</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-muted/10 rounded-xl border border-border p-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{role || 'Unknown'}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Designation</span>
              <span className="font-medium">{designation || 'None'}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Active Facility</span>
              <span className="font-medium text-right">{facility?.data.name || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notification Push</span>
              <span className="font-medium text-emerald-500">Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
