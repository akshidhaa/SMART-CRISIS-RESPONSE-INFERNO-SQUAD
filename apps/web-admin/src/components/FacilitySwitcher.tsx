'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Check, ChevronDown } from 'lucide-react';

import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';

interface FacilityOption {
  id: string;
  name: string;
}

export function FacilitySwitcher({ className }: { className?: string }) {
  const { facilityIds, currentFacilityId, setCurrentFacilityId } = useAuth();
  const [options, setOptions] = useState<FacilityOption[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const resolved = await Promise.all(
        facilityIds.map(async (id): Promise<FacilityOption> => {
          try {
            const snap = await getDoc(doc(db, 'facilities', id));
            return { id, name: (snap.data()?.name as string) ?? id };
          } catch {
            return { id, name: id };
          }
        }),
      );
      if (!cancelled) {
        // De-duplicate by name and filter out Demo Hospital
        const seen = new Set<string>();
        const filtered = resolved.filter((opt) => {
          if (seen.has(opt.name)) return false;
          if (opt.name === 'Demo Hospital' || opt.name === 'demo_hospital') return false;
          seen.add(opt.name);
          return true;
        });
        setOptions(filtered);
      }
    }
    if (facilityIds.length > 0) void load();
    else setOptions([]);
    return () => { cancelled = true; };
  }, [facilityIds]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (facilityIds.length <= 1) return null;

  const current = options.find((o) => o.id === currentFacilityId);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent transition-colors"
      >
        <span className="text-muted-foreground">Facility</span>
        <span className="font-medium text-foreground">{current?.name ?? '…'}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown panel — uses CSS vars so it respects dark/light mode */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-md border border-border bg-card shadow-lg"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
        >
          {options.map((opt) => {
            const isActive = opt.id === currentFacilityId;
            return (
              <button
                key={opt.id}
                onClick={() => { setCurrentFacilityId(opt.id); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground font-semibold',
                )}
              >
                {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                <span className={cn(!isActive && 'ml-[18px]')}>{opt.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
