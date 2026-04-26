'use client';

// Dev toolbar for the Phase 3.2 connectivity simulator. Three toggle pills
// (Wi-Fi / BLE Mesh / Cellular) + a mode indicator icon. Intended for the
// hackathon demo, not production — mount only inside the admin shell.

import { Radio, Wifi, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectivity, type ConnectivityMode } from '@/lib/connectivity/ConnectivityProvider';

interface ModeOption {
  mode: ConnectivityMode;
  label: string;
  Icon: typeof Wifi;
  activeClass: string;
}

const OPTIONS: ModeOption[] = [
  { mode: 'wifi', label: 'Wi-Fi', Icon: Wifi, activeClass: 'bg-emerald-500 text-white' },
  { mode: 'ble-mesh', label: 'BLE Mesh', Icon: Radio, activeClass: 'bg-violet-500 text-white' },
  { mode: 'cellular', label: 'Cellular', Icon: Signal, activeClass: 'bg-amber-500 text-white' },
];

export function ConnectivityToolbar() {
  const { mode, forceMode, isOnline } = useConnectivity();

  return (
    <div
      className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs lg:px-6"
      role="toolbar"
      aria-label="Connectivity simulator"
    >
      <span className="font-medium text-muted-foreground">Transport:</span>
      <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
        {OPTIONS.map(({ mode: m, label, Icon, activeClass }) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => forceMode(m)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors',
                active ? activeClass : 'text-muted-foreground hover:bg-muted',
              )}
              aria-pressed={active}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>
      <span className="ml-auto flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
        <span
          className={cn(
            'inline-block h-2 w-2 rounded-full',
            isOnline ? 'bg-emerald-500' : 'bg-red-500',
          )}
        />
        {isOnline ? 'browser online' : 'browser offline'}
      </span>
    </div>
  );
}

export function ConnectivityIndicator() {
  const { mode } = useConnectivity();
  const opt = OPTIONS.find((o) => o.mode === mode)!;
  const Icon = opt.Icon;
  return (
    <span
      className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', opt.activeClass)}
      title={`Current transport: ${opt.label}`}
    >
      <Icon className="h-3 w-3" />
      {opt.label}
    </span>
  );
}
