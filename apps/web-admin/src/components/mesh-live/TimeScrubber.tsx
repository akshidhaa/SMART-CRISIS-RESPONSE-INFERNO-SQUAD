'use client';

// Bottom strip — Live / Pause / Replay controls. When the user drags the
// slider the parent computes a cutoffMs that filters arcs + the event stream.
// "Play" walks the cutoff forward at 10x real time so a 1-hour history
// replays in 6 minutes (or instantly if events are clustered).

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Radio, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Mode = 'live' | 'paused' | 'replay';

interface TimeScrubberProps {
  /** Earliest event timestamp; null when no history. */
  minMs: number | null;
  /** Latest event timestamp; null when no history. */
  maxMs: number | null;
  /** Active cutoff to render at; null = live (show everything). */
  cutoffMs: number | null;
  onChange: (cutoff: number | null) => void;
}

const PLAYBACK_SPEED = 10;
const TICK_MS = 200;

export function TimeScrubber({ minMs, maxMs, cutoffMs, onChange }: TimeScrubberProps) {
  const mode: Mode = cutoffMs == null ? 'live' : 'paused';
  const [playing, setPlaying] = useState(false);
  const lastTickRef = useRef<number>(0);

  // Drive playback when in replay mode.
  useEffect(() => {
    if (!playing || cutoffMs == null || minMs == null || maxMs == null) return;
    let cancelled = false;
    lastTickRef.current = performance.now();

    const step = () => {
      if (cancelled) return;
      const now = performance.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      const next = Math.min(maxMs, (cutoffMs ?? minMs) + delta * PLAYBACK_SPEED);
      onChange(next);
      if (next >= maxMs) {
        setPlaying(false);
        return;
      }
      window.setTimeout(step, TICK_MS);
    };
    const id = window.setTimeout(step, TICK_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [playing, cutoffMs, minMs, maxMs, onChange]);

  const noHistory = minMs == null || maxMs == null || minMs === maxMs;

  return (
    <div className="flex items-center gap-3 border-t border-border bg-background/95 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={mode === 'live' ? 'default' : 'outline'}
          onClick={() => {
            setPlaying(false);
            onChange(null);
          }}
        >
          <Radio className="mr-1 h-3 w-3" />
          Live
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={noHistory}
          onClick={() => {
            if (minMs == null) return;
            setPlaying((p) => !p);
            if (cutoffMs == null) onChange(minMs);
          }}
        >
          {playing ? <Pause className="mr-1 h-3 w-3" /> : <Play className="mr-1 h-3 w-3" />}
          {playing ? 'Pause' : 'Replay'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={noHistory}
          onClick={() => {
            setPlaying(false);
            if (minMs != null) onChange(minMs);
          }}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      <input
        type="range"
        min={minMs ?? 0}
        max={maxMs ?? 1}
        step={1000}
        value={cutoffMs ?? maxMs ?? 0}
        disabled={noHistory}
        onChange={(e) => {
          setPlaying(false);
          onChange(Number(e.target.value));
        }}
        className="flex-1 accent-primary"
      />

      <span className="w-44 shrink-0 text-right text-[11px] font-mono text-muted-foreground">
        {noHistory
          ? 'no history yet'
          : mode === 'live'
            ? `live · last ${formatRange(minMs!, maxMs!)}`
            : new Date(cutoffMs ?? maxMs!).toLocaleTimeString()}
      </span>
    </div>
  );
}

function formatRange(minMs: number, maxMs: number): string {
  const span = maxMs - minMs;
  const mins = Math.round(span / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.round(mins / 60)}h`;
}
