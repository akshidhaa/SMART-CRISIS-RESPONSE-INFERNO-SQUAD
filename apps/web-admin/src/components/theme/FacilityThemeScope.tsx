'use client';

// Wraps a subtree with facility-type-specific accent CSS variables. We only
// override `--primary`, `--primary-foreground`, and `--ring` — the rest of
// the design system (backgrounds, borders, muted) stays neutral so the
// dashboard reads as "neutral chrome + facility-tinted accents".
//
// Facility theme is the single source of truth — change the FACILITY_THEME
// map and every page picks it up.

import * as React from 'react';
import { FACILITY_THEME } from '@scr-mesh/constants';
import type { FacilityType } from '@scr-mesh/types';

interface FacilityThemeScopeProps {
  facilityType: FacilityType | null | undefined;
  className?: string;
  children: React.ReactNode;
}

export function FacilityThemeScope({ facilityType, className, children }: FacilityThemeScopeProps) {
  const theme = facilityType ? FACILITY_THEME[facilityType] : null;
  const style = theme
    ? ({
        ['--primary' as string]: theme.accent,
        ['--primary-foreground' as string]: theme.accentForeground,
        ['--ring' as string]: theme.ring,
      } as React.CSSProperties)
    : undefined;
  return (
    <div data-facility-type={facilityType ?? 'none'} style={style} className={className}>
      {children}
    </div>
  );
}
