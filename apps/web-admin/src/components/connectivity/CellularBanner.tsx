'use client';

import { Signal } from 'lucide-react';
import { useConnectivity } from '@/lib/connectivity/ConnectivityProvider';

export function CellularBanner() {
  const { mode } = useConnectivity();
  if (mode !== 'cellular') return null;
  return (
    <div
      className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-900 dark:text-amber-200"
      role="status"
    >
      <Signal className="h-3.5 w-3.5" />
      <span>
        via Cellular — SMS fallback active for critical alerts (check Firebase Functions logs for Twilio calls)
      </span>
    </div>
  );
}

export function BleMeshBanner() {
  const { mode } = useConnectivity();
  if (mode !== 'ble-mesh') return null;
  return (
    <div
      className="flex items-center justify-center gap-2 border-b border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-900 dark:text-violet-200"
      role="status"
    >
      <span className="font-medium">via BLE Mesh</span>
      <span>— Firestore listeners suspended, reading from local mesh cache (polling 500ms)</span>
    </div>
  );
}
