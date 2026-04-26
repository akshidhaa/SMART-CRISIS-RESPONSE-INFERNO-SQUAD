'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export interface ViewFacility {
  id: string;
  name: string;
  type: string;
}

interface CommunityCtx {
  viewFacility: ViewFacility | null;
  setViewFacility: (f: ViewFacility) => void;
}

const CommunityCtx = createContext<CommunityCtx>({
  viewFacility: null,
  setViewFacility: () => {},
});

export function CommunityFacilityProvider({ children }: { children: ReactNode }) {
  const [viewFacility, setViewFacility] = useState<ViewFacility | null>(null);
  return (
    <CommunityCtx.Provider value={{ viewFacility, setViewFacility }}>
      {children}
    </CommunityCtx.Provider>
  );
}

export const useCommunityView = () => useContext(CommunityCtx);
