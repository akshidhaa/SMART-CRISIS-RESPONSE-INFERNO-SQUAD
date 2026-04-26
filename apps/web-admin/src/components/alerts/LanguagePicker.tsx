'use client';

// LanguagePicker — lets a signed-in user pick the language used for alert
// dispatch + voice announcements. Writes to users/{uid}.language, which the
// backend dispatcher reads to choose messageTranslations[lang], and the
// frontend AlertVoiceAnnouncer reads to choose the TTS voice.

import { useCallback, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import type { Language } from '@scr-mesh/types';

interface LanguageOption {
  code: Language;
  label: string;
  localeTag: string;
  previewText: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English',   localeTag: 'en-US', previewText: 'Alert voice enabled for English.' },
  { code: 'hi', label: 'हिंदी',       localeTag: 'hi-IN', previewText: 'अलर्ट ध्वनि हिंदी में सक्षम है।' },
  { code: 'ta', label: 'தமிழ்',      localeTag: 'ta-IN', previewText: 'எச்சரிக்கை குரல் தமிழில் இயக்கப்பட்டுள்ளது.' },
];

async function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  const immediate = window.speechSynthesis.getVoices();
  if (immediate.length > 0) return immediate;
  return new Promise((resolve) => {
    const onChange = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    // Safety timeout — some browsers never fire the event.
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
}

export async function speakInLanguage(text: string, langCode: Language): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const opt = LANGUAGE_OPTIONS.find((o) => o.code === langCode);
  if (!opt) return;

  const voices = await getVoicesAsync();
  const prefix = opt.localeTag.toLowerCase().slice(0, 2);
  const match =
    voices.find((v) => v.lang?.toLowerCase() === opt.localeTag.toLowerCase()) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith(prefix));

  if (!match) {
    console.warn(
      `[speakInLanguage] No ${opt.localeTag} voice installed. Available:`,
      voices.map((v) => `${v.name} (${v.lang})`),
    );
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = opt.localeTag;
  utter.rate = 0.95;
  if (match) utter.voice = match;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function LanguagePicker({ className }: { className?: string }) {
  const { language, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const current: Language = language ?? 'en';

  const changeLanguage = useCallback(
    async (next: Language) => {
      const uid = user?.uid ?? auth.currentUser?.uid;
      if (!uid) return;
      setSaving(true);
      try {
        await updateDoc(doc(db, 'users', uid), { language: next });
        const opt = LANGUAGE_OPTIONS.find((o) => o.code === next);
        if (opt) speakInLanguage(opt.previewText, next);
      } catch (err) {
        console.error('[LanguagePicker] failed to update language:', err);
      } finally {
        setSaving(false);
      }
    },
    [user],
  );

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <label htmlFor="scr-language-picker" className="text-xs text-muted-foreground">
        Alert language
      </label>
      <select
        id="scr-language-picker"
        value={current}
        disabled={saving || !user}
        onChange={(e) => changeLanguage(e.target.value as Language)}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
