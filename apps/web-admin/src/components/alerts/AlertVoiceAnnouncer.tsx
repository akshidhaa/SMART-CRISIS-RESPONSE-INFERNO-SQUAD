'use client';

// AlertVoiceAnnouncer — listens in real-time to the current user's unread
// alerts and announces each new one via the browser Speech Synthesis API in
// the language from users/{uid}.language. Shows a small floating toast per
// active alert with an Acknowledge button that writes acknowledged=true
// back to Firestore (which stops the toast loop).
//
// Voice playback requires a user gesture before browsers allow it — hence
// the explicit "Enable voice" toggle. Muted state persists in localStorage.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { BellRing, BellOff, Radio, Signal, Volume2, Wifi, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import type { Alert, Language } from '@scr-mesh/types';
import { LANGUAGE_OPTIONS, speakInLanguage } from './LanguagePicker';
import { useMeshAlerts, type LiveMeshAlert } from '@/lib/connectivity/useMeshAlerts';
import { cn } from '@/lib/utils';

const MUTE_KEY = 'scr-mesh.voiceAnnouncer.muted';
const MAX_ACTIVE = 3;

type LiveAlert = LiveMeshAlert;

function pickBody(alert: Alert, lang: Language): string {
  const translated = alert.messageTranslations?.[lang];
  if (translated && translated.trim()) return translated;
  return alert.messageTranslations?.en ?? alert.message ?? 'New alert';
}

export function AlertVoiceAnnouncer() {
  const { user, language } = useAuth();
  const alerts = useMeshAlerts();
  const [muted, setMuted] = useState<boolean>(false);
  const spokenRef = useRef<Set<string>>(new Set());
  const firstSnapshotRef = useRef<boolean>(true);

  const lang: Language = language ?? 'en';

  // Hydrate mute preference.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMuted(window.localStorage.getItem(MUTE_KEY) === '1');
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((cur) => {
      const next = !cur;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      }
      if (next && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }, []);

  // Announce newly-seen alerts. On first render (page reload) seed the spoken
  // set so we don't re-announce the backlog.
  useEffect(() => {
    if (!user) return;
    if (firstSnapshotRef.current) {
      firstSnapshotRef.current = false;
      alerts.forEach((a) => spokenRef.current.add(a.id));
      return;
    }
    alerts.forEach((a) => {
      if (spokenRef.current.has(a.id)) return;
      spokenRef.current.add(a.id);
      if (muted) return;
      speakInLanguage(pickBody(a, lang), lang);
    });
  }, [alerts, user, lang, muted]);

  const acknowledge = useCallback(async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'alerts', alertId), { acknowledged: true });
    } catch (err) {
      console.error('[AlertVoiceAnnouncer] ack failed:', err);
    }
  }, []);

  const replay = useCallback(
    (alert: LiveAlert) => {
      speakInLanguage(pickBody(alert, lang), lang);
    },
    [lang],
  );

  const visible = useMemo(() => alerts.slice(0, MAX_ACTIVE), [alerts]);
  const langLabel = LANGUAGE_OPTIONS.find((l) => l.code === lang)?.label ?? lang;

  if (!user) return null;

  return (
    <div className="fixed right-4 top-20 z-50 flex w-[min(90vw,320px)] flex-col gap-2">
      <button
        type="button"
        onClick={toggleMute}
        className="flex items-center gap-2 self-end rounded-full border border-border bg-background/90 px-3 py-1 text-xs font-medium shadow backdrop-blur transition hover:bg-muted"
        title={muted ? 'Voice announcements muted — click to enable' : 'Voice enabled — click to mute'}
      >
        {muted ? <BellOff className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5 text-primary" />}
        {muted ? 'Voice off' : `Voice · ${langLabel}`}
      </button>

      {visible.map((alert) => (
        <div
          key={alert.id}
          className="rounded-lg border border-border bg-background p-3 shadow-lg"
          role="alert"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug text-foreground">
              {pickBody(alert, lang)}
            </p>
            <button
              type="button"
              onClick={() => acknowledge(alert.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Acknowledge alert"
              title="Acknowledge"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">
                {alert.facilityId}
              </span>
              <TransportBadge transport={alert.transport} />
            </div>
            <button
              type="button"
              onClick={() => replay(alert)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              title="Replay in your language"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Replay
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransportBadge({ transport }: { transport: LiveAlert['transport'] }) {
  const map = {
    'wifi': { Icon: Wifi, label: 'via Wi-Fi', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    'ble-mesh': { Icon: Radio, label: 'via BLE Mesh', cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
    'cellular': { Icon: Signal, label: 'via Cellular', cls: 'bg-amber-500/15 text-amber-800 dark:text-amber-200' },
  } as const;
  const { Icon, label, cls } = map[transport];
  return (
    <span className={cn('flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium', cls)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
