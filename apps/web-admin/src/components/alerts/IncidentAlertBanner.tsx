'use client';

// IncidentAlertBanner — watches ALL incidents in real-time.
// When a new incident arrives it slides a prominent banner from the top,
// speaks the alert in the user's chosen language (default: English),
// requests browser notification permission, and auto-dismisses after 8s.
//
// The seen-IDs ref is seeded on the first snapshot so page-load doesn't
// re-alert on pre-existing incidents.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection, onSnapshot, query, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { speakInLanguage, LANGUAGE_OPTIONS } from './LanguagePicker';
import type { Language } from '@scr-mesh/types';
import { AlertTriangle, Globe, Volume2, VolumeX, X } from 'lucide-react';

// ─── Translations ─────────────────────────────────────────────────────────────

const INCIDENT_TYPES: Record<string, Record<string, string>> = {
  en: {
    fire: 'Fire', medical_emergency: 'Medical Emergency', evacuation: 'Evacuation',
    chemical_spill: 'Chemical Spill', security_breach: 'Security Breach',
    power_failure: 'Power Failure', flood: 'Flood', structural_damage: 'Structural Damage',
    gas_leak: 'Gas Leak', bomb_threat: 'Bomb Threat', riot: 'Civil Disturbance',
  },
  hi: {
    fire: 'आग', medical_emergency: 'चिकित्सा आपात', evacuation: 'निकासी',
    chemical_spill: 'रासायनिक रिसाव', security_breach: 'सुरक्षा उल्लंघन',
    power_failure: 'बिजली विफलता', flood: 'बाढ़', structural_damage: 'संरचनात्मक क्षति',
    gas_leak: 'गैस रिसाव', bomb_threat: 'बम की धमकी', riot: 'सामाजिक अशांति',
  },
  ta: {
    fire: 'தீ விபத்து', medical_emergency: 'மருத்துவ அவசரநிலை', evacuation: 'வெளியேற்றம்',
    chemical_spill: 'இரசாயன கசிவு', security_breach: 'பாதுகாப்பு மீறல்',
    power_failure: 'மின் தோல்வி', flood: 'வெள்ளம்', structural_damage: 'கட்டமைப்பு சேதம்',
    gas_leak: 'எரிவாயு கசிவு', bomb_threat: 'குண்டு அச்சுறுத்தல்', riot: 'கலவரம்',
  },
  te: {
    fire: 'అగ్నిప్రమాదం', medical_emergency: 'వైద్య అత్యవసరం', evacuation: 'తరలింపు',
    chemical_spill: 'రసాయన లీకేజ్', security_breach: 'భద్రతా ఉల్లంఘన',
    power_failure: 'విద్యుత్ వైఫల్యం', flood: 'వరద', structural_damage: 'నిర్మాణ నష్టం',
    gas_leak: 'గ్యాస్ లీకేజ్', bomb_threat: 'బాంబు బెదిరింపు', riot: 'అల్లర్లు',
  },
  mr: {
    fire: 'आग', medical_emergency: 'वैद्यकीय आणीबाणी', evacuation: 'स्थलांतर',
    chemical_spill: 'रासायनिक गळती', security_breach: 'सुरक्षा उल्लंघन',
    power_failure: 'वीज खंडित', flood: 'पूर', structural_damage: 'संरचनात्मक नुकसान',
    gas_leak: 'गॅस गळती', bomb_threat: 'बॉम्बची धमकी', riot: 'दंगल',
  },
  bn: {
    fire: 'আগুন', medical_emergency: 'চিকিৎসা জরুরি', evacuation: 'সরিয়ে নেওয়া',
    chemical_spill: 'রাসায়নিক ছড়িয়ে পড়া', security_breach: 'নিরাপত্তা লঙ্ঘন',
    power_failure: 'বিদ্যুৎ বিচ্ছিন্ন', flood: 'বন্যা', structural_damage: 'কাঠামোগত ক্ষতি',
    gas_leak: 'গ্যাস লিক', bomb_threat: 'বোমার হুমকি', riot: 'দাঙ্গা',
  },
};

const SEVERITY_LABELS: Record<string, Record<string, string>> = {
  en: { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' },
  hi: { critical: 'अत्यंत गंभीर', high: 'गंभीर', medium: 'मध्यम', low: 'कम' },
  ta: { critical: 'மிக தீவிரம்', high: 'தீவிரம்', medium: 'நடுத்தரம்', low: 'குறைவு' },
  te: { critical: 'అత్యంత తీవ్రం', high: 'తీవ్రం', medium: 'మధ్యస్థం', low: 'తక్కువ' },
  mr: { critical: 'अत्यंत गंभीर', high: 'गंभीर', medium: 'मध्यम', low: 'कमी' },
  bn: { critical: 'অত্যন্ত গুরুত্বপূর্ণ', high: 'গুরুত্বপূর্ণ', medium: 'মাঝারি', low: 'কম' },
};

const UI_STRINGS: Record<string, { title: string; at: string; zone: string; follow: string; dismiss: string; replay: string }> = {
  en: { title: 'Emergency Alert',       at: 'at',    zone: 'Zone', follow: 'Follow staff instructions immediately.', dismiss: 'Dismiss', replay: 'Replay' },
  hi: { title: 'आपातकालीन सूचना',       at: 'में',   zone: 'क्षेत्र', follow: 'तुरंत कर्मचारियों के निर्देशों का पालन करें।', dismiss: 'बंद करें', replay: 'दोहराएं' },
  ta: { title: 'அவசரகால எச்சரிக்கை',  at: 'இல்',  zone: 'மண்டலம்', follow: 'உடனடியாக ஊழியர்களின் வழிகாட்டுதலைப் பின்பற்றவும்.', dismiss: 'மூடு', replay: 'மீண்டும்' },
  te: { title: 'అత్యవసర హెచ్చరిక',     at: 'వద్ద', zone: 'జోన్', follow: 'వెంటనే సిబ్బంది సూచనలను అనుసరించండి.', dismiss: 'మూసివేయి', replay: 'మళ్ళీ' },
  mr: { title: 'आणीबाणी सूचना',         at: 'येथे', zone: 'क्षेत्र', follow: 'ताबडतोब कर्मचाऱ्यांच्या सूचनांचे पालन करा.', dismiss: 'बंद करा', replay: 'पुन्हा' },
  bn: { title: 'জরুরি সতর্কতা',          at: 'এ',   zone: 'অঞ্চল', follow: 'অবিলম্বে কর্মীদের নির্দেশ অনুসরণ করুন।', dismiss: 'বন্ধ করুন', replay: 'পুনরায়' },
};

function getIncidentType(lang: string, type: string): string {
  return (INCIDENT_TYPES[lang] ?? INCIDENT_TYPES.en)[type]
    ?? type.replace(/_/g, ' ');
}
function getSeverityLabel(lang: string, sev: string): string {
  return (SEVERITY_LABELS[lang] ?? SEVERITY_LABELS.en)[sev] ?? sev.toUpperCase();
}
function getUI(lang: string) {
  return UI_STRINGS[lang] ?? UI_STRINGS.en;
}

function buildSpeechText(lang: string, type: string, severity: string, facilityName: string, zone: string): string {
  const ui = getUI(lang);
  const typeTxt = getIncidentType(lang, type);
  const sevTxt = getSeverityLabel(lang, severity);
  return `${ui.title}. ${sevTxt} ${typeTxt} ${ui.at} ${facilityName}, ${ui.zone} ${zone}. ${ui.follow}`;
}

// ─── Severity styling ─────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<string, { bg: string; badgeBg: string; badgeText: string }> = {
  critical: { bg: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', badgeBg: 'rgba(255,255,255,0.18)', badgeText: '#fca5a5' },
  high:     { bg: 'linear-gradient(135deg,#78350f,#c2410c)', badgeBg: 'rgba(255,255,255,0.18)', badgeText: '#fed7aa' },
  medium:   { bg: 'linear-gradient(135deg,#713f12,#b45309)', badgeBg: 'rgba(255,255,255,0.18)', badgeText: '#fef08a' },
  low:      { bg: 'linear-gradient(135deg,#14532d,#15803d)', badgeBg: 'rgba(255,255,255,0.18)', badgeText: '#bbf7d0' },
};
function getSeverityStyle(sev: string) {
  return SEVERITY_STYLE[sev] ?? SEVERITY_STYLE.medium;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BannerItem {
  id: string;
  type: string;
  severity: string;
  facilityId: string;
  facilityName: string;
  zone: string;
  progress: number; // 0-100 auto-dismiss progress
}

const MUTE_KEY = 'scr-mesh.incidentAlert.muted';
const DISMISS_MS = 8000;

// ─── Component ────────────────────────────────────────────────────────────────

export function IncidentAlertBanner() {
  const { user, language } = useAuth();
  const lang: Language = (language as Language) ?? 'en';

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [muted, setMuted] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [savingLang, setSavingLang] = useState(false);

  const seenRef = useRef<Set<string>>(new Set());
  const firstSnapRef = useRef(true);
  // facilityId → name cache so we can label banners
  const facilityNamesRef = useRef<Record<string, string>>({});

  // Hydrate mute preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMuted(window.localStorage.getItem(MUTE_KEY) === '1');
    }
  }, []);

  // Request browser notification permission once
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Lightweight facility name cache
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'facilities'), (snap) => {
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data?.name) facilityNamesRef.current[d.id] = data.name as string;
      });
    });
    return unsub;
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((cur) => {
      const next = !cur;
      if (typeof window !== 'undefined') window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      if (next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const replay = useCallback((banner: BannerItem) => {
    const speech = buildSpeechText(lang, banner.type, banner.severity, banner.facilityName, banner.zone);
    speakInLanguage(speech, lang);
  }, [lang]);

  // Change language — saves to Firestore users/{uid}.language
  const changeLang = useCallback(async (next: Language) => {
    const uid = user?.uid ?? auth.currentUser?.uid;
    if (!uid) return;
    setSavingLang(true);
    try {
      await updateDoc(doc(db, 'users', uid), { language: next });
      const opt = LANGUAGE_OPTIONS.find((o) => o.code === next);
      if (opt) speakInLanguage(opt.previewText, next);
    } catch (e) {
      console.error('[IncidentAlertBanner] changeLang:', e);
    } finally {
      setSavingLang(false);
      setShowLangPicker(false);
    }
  }, [user]);

  // Watch ALL active incidents — fire banners on new arrivals
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'incidents'),
      where('status', 'in', ['reported', 'acknowledged', 'in_progress']),
    );
    return onSnapshot(q, (snap) => {
      // First snapshot: seed seen IDs, never show for pre-existing incidents
      if (firstSnapRef.current) {
        firstSnapRef.current = false;
        snap.docs.forEach((d) => seenRef.current.add(d.id));
        return;
      }

      const newOnes: BannerItem[] = [];
      snap.docs.forEach((d) => {
        if (seenRef.current.has(d.id)) return;
        seenRef.current.add(d.id);
        const data = d.data();
        const fid: string = data.facilityId ?? '';
        newOnes.push({
          id: d.id,
          type: data.type ?? 'unknown',
          severity: data.severity ?? 'medium',
          facilityId: fid,
          facilityName: facilityNamesRef.current[fid] ?? fid,
          zone: data.location?.zone ?? '—',
          progress: 100,
        });
      });

      if (newOnes.length === 0) return;

      // Show banners (max 3 stacked)
      setBanners((prev) => [...newOnes, ...prev].slice(0, 3));

      // Voice + browser notification for the most severe new incident
      const first = newOnes[0];
      if (!muted) {
        const speech = buildSpeechText(lang, first.type, first.severity, first.facilityName, first.zone);
        speakInLanguage(speech, lang);
      }

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const ui = getUI(lang);
        newOnes.forEach((inc) => {
          new Notification(`🚨 ${ui.title}`, {
            body: `${getIncidentType(lang, inc.type)} ${ui.at} ${inc.facilityName} — ${ui.zone}: ${inc.zone}`,
            icon: '/favicon.ico',
            tag: inc.id,
          });
        });
      }

      // Auto-dismiss after DISMISS_MS
      const ids = newOnes.map((n) => n.id);
      window.setTimeout(() => {
        setBanners((prev) => prev.filter((b) => !ids.includes(b.id)));
      }, DISMISS_MS);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // lang and muted intentionally excluded — we read from refs/closures at fire time

  if (!user) return null;

  return (
    <>
      {/* ── Alert banners ─────────────────────────────────────────── */}
      <div className="fixed left-0 right-0 top-16 z-[60] flex flex-col gap-2 px-3 pointer-events-none">
        {banners.map((banner) => {
          const style = getSeverityStyle(banner.severity);
          const ui = getUI(lang);
          return (
            <div
              key={banner.id}
              className="pointer-events-auto w-full overflow-hidden rounded-2xl shadow-2xl animate-in slide-in-from-top-3 duration-300"
              style={{
                background: style.bg,
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
              role="alert"
              aria-live="assertive"
            >
              {/* Progress bar */}
              <div
                className="h-0.5 bg-white/30"
                style={{ animation: `scr-progress ${DISMISS_MS}ms linear forwards` }}
              />

              <div className="flex items-start gap-3 px-4 py-3">
                {/* Icon */}
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/70">{ui.title}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase"
                      style={{ background: style.badgeBg, color: style.badgeText }}
                    >
                      {getSeverityLabel(lang, banner.severity)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-black text-white leading-tight">
                    {getIncidentType(lang, banner.type)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/75 truncate">
                    {banner.facilityName} · {ui.zone}: {banner.zone}
                  </p>
                  <p className="mt-1.5 text-[10px] font-semibold text-white/60">{ui.follow}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => dismiss(banner.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                    aria-label={ui.dismiss}
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                  <button
                    onClick={() => replay(banner)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                    aria-label={ui.replay}
                    title={ui.replay}
                  >
                    <Volume2 className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Floating controls (voice mute + language) ──────────────── */}
      <div className="fixed bottom-24 right-3 z-[55] flex flex-col items-end gap-2">
        {/* Language picker sheet */}
        {showLangPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowLangPicker(false)} />
            <div
              className="relative z-20 overflow-hidden rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                minWidth: 200,
              }}
            >
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Alert Language</p>
              </div>
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => changeLang(opt.code as Language)}
                  disabled={savingLang}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black"
                    style={
                      lang === opt.code
                        ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                        : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    {opt.code.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold">{opt.label}</span>
                  {lang === opt.code && (
                    <span className="ml-auto text-[10px] font-bold text-primary">Active</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Globe button — language picker toggle */}
        <button
          onClick={() => setShowLangPicker((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all active:scale-90"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
          title="Change alert language"
          aria-label="Change alert language"
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Mute / unmute voice */}
        <button
          onClick={toggleMute}
          className="flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all active:scale-90"
          style={{
            background: muted ? 'hsl(var(--muted))' : 'hsl(var(--primary)/0.12)',
            border: `1px solid ${muted ? 'hsl(var(--border))' : 'hsl(var(--primary)/0.3)'}`,
          }}
          title={muted ? 'Voice muted — tap to enable' : 'Voice enabled — tap to mute'}
          aria-label={muted ? 'Unmute alert voice' : 'Mute alert voice'}
        >
          {muted
            ? <VolumeX className="h-4 w-4 text-muted-foreground" />
            : <Volume2 className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
          }
        </button>
      </div>

      {/* Keyframe for progress bar drain */}
      <style>{`
        @keyframes scr-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </>
  );
}
