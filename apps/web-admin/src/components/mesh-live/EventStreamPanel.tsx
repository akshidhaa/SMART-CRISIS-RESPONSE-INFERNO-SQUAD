'use client';

// Right-rail live stream of mesh events. Shows the most recent event first;
// when the time scrubber is active (replayCutoffMs set), only events at or
// before the cutoff appear, so the rail and the map stay in lockstep.

import { ArrowRight, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { FACILITY_THEME } from '@scr-mesh/constants';
import { cn } from '@/lib/utils';
import type { FacilityNode, MeshEventRow } from './types';

interface EventStreamPanelProps {
  events: MeshEventRow[];
  facilities: Record<string, FacilityNode>;
  /** When set, only show events with publishedAtMs <= cutoff. */
  replayCutoffMs: number | null;
}

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return `${Math.max(0, Math.floor(diff / 1000))}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3600_000)}h ago`;
}

export function EventStreamPanel({ events, facilities, replayCutoffMs }: EventStreamPanelProps) {
  const visible = (replayCutoffMs == null
    ? events
    : events.filter((e) => e.publishedAtMs <= replayCutoffMs)
  )
    .slice()
    .reverse()
    .slice(0, 60);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-background/95 backdrop-blur">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Network className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Live event stream</h2>
        <span className="ml-auto text-[11px] font-mono text-muted-foreground">
          {visible.length} {visible.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="p-6 text-center text-xs text-muted-foreground">
            No mesh events yet. Trigger a critical incident at any facility to see ripples here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {visible.map((e) => {
                const src = facilities[e.sourceFacilityId];
                const srcTheme = src ? FACILITY_THEME[src.data.type] : null;
                return (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="px-4 py-3"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-mono">{e.eventType}</span>
                      <span>{relTime(e.publishedAtMs)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm">
                      <span className="truncate font-medium">
                        {src?.data.name ?? e.sourceFacilityId}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate text-muted-foreground">
                        {e.affectedFacilityIds.length}{' '}
                        {e.affectedFacilityIds.length === 1 ? 'facility' : 'facilities'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {srcTheme && (
                        <Badge variant="outline" className={cn(srcTheme.accentClass, 'text-[10px]')}>
                          src · {srcTheme.short}
                        </Badge>
                      )}
                      {e.affectedFacilityIds.slice(0, 3).map((fid) => {
                        const tgt = facilities[fid];
                        const tgtTheme = tgt ? FACILITY_THEME[tgt.data.type] : null;
                        return (
                          <Badge
                            key={fid}
                            variant="outline"
                            className={cn(tgtTheme?.accentClass ?? '', 'text-[10px]')}
                          >
                            {tgt?.data.name ?? fid}
                          </Badge>
                        );
                      })}
                      {e.affectedFacilityIds.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{e.affectedFacilityIds.length - 3} more
                        </span>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </aside>
  );
}
