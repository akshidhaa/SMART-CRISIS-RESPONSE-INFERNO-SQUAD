'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signOut, useAuth } from '@/lib/auth';
import { FacilitySwitcher } from '@/components/FacilitySwitcher';
import { DarkModeToggle } from '@/components/theme/DarkModeToggle';
import { LanguagePicker } from '@/components/alerts/LanguagePicker';
import { ConnectivityIndicator } from '@/components/connectivity/ConnectivityToolbar';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import { FACILITY_THEME } from '@scr-mesh/constants';

export function Topbar() {
  const { user, designation } = useAuth();
  const { facility } = useCurrentFacility();
  const theme = facility ? FACILITY_THEME[facility.data.type] : null;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {facility && (
          <Badge className={theme?.accentClass}>
            {theme?.label}
          </Badge>
        )}
        <span className="text-sm font-medium">
          {facility?.data.name ?? 'Select a facility'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ConnectivityIndicator />
        <FacilitySwitcher />
        <LanguagePicker />
        <DarkModeToggle />
        <span className="hidden text-xs text-muted-foreground md:inline">
          {user?.email}
          {designation ? ` · ${designation}` : ''}
        </span>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          <LogOut className="mr-1 h-3 w-3" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
