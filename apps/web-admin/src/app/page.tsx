'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartPulse, Hotel, School, GraduationCap, Factory,
  Zap, Globe, ShieldCheck, ArrowRight, Play, QrCode,
  AlertTriangle, Brain, Radio, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button } from '@/components/ui/button';

const FACILITIES = [
  { type: 'hospital', label: 'Hospital', Icon: HeartPulse, color: '#ef4444', bg: '#450a0a', tagline: 'Code Blue / Mass Casualty' },
  { type: 'hotel', label: 'Hotel', Icon: Hotel, color: '#f59e0b', bg: '#451a03', tagline: 'Fire / Guest Emergency' },
  { type: 'school', label: 'School', Icon: School, color: '#3b82f6', bg: '#0c1a3a', tagline: 'Lockdown / Intruder' },
  { type: 'college', label: 'College', Icon: GraduationCap, color: '#a855f7', bg: '#2e1065', tagline: 'Lab Accident / Unrest' },
  { type: 'factory', label: 'Factory', Icon: Factory, color: '#eab308', bg: '#422006', tagline: 'Chemical Spill / Fire' },
] as const;

const NODE_POS: Record<string, { x: number; y: number }> = {
  hospital: { x: 240, y: 50 },
  hotel:    { x: 420, y: 150 },
  school:   { x: 350, y: 260 },
  college:  { x: 130, y: 260 },
  factory:  { x: 60,  y: 150 },
};

const MESH_EDGES = [
  ['hospital', 'hotel'], ['hospital', 'school'], ['hospital', 'college'], ['hospital', 'factory'],
  ['hotel', 'school'], ['hotel', 'factory'], ['school', 'college'], ['college', 'factory'],
];

const ALERT_TRANSLATIONS = [
  { lang: 'English', code: 'EN', text: 'CRITICAL: Chemical spill at Apex Factory. Shelter in place immediately. Seal all windows.' },
  { lang: 'Hindi',   code: 'HI', text: 'गंभीर: एपेक्स फैक्ट्री में रासायनिक रिसाव। तुरंत सुरक्षित स्थान में रहें। सभी खिड़कियां बंद करें।' },
  { lang: 'Tamil',   code: 'TA', text: 'அவசரம்: ஆபெக்ஸ் ஆலையில் இரசாயன கசிவு. உடனடியாக உள்ளே தங்குங்கள். அனைத்து ஜன்னல்களையும் மூடுங்கள்.' },
];

const CASCADE_STEPS = [
  { t: '0.0s', src: 'factory', msg: 'FIRE detected — Floor 1 + Floor 2 engulfed', hop: null },
  { t: '4.0s', src: 'factory→hospital', msg: 'PREPARE_BURN_UNIT  ·  42 workers evacuating', hop: '0→1' },
  { t: '7.0s', src: 'factory→school', msg: 'SHELTER_IN_PLACE  ·  340 students inside', hop: '0→1' },
  { t: '10.0s', src: 'factory→college', msg: 'EVACUATE_DOWNWIND  ·  Hostel B + Lab', hop: '0→1' },
  { t: '13.0s', src: 'factory→hotel', msg: 'EVACUATE_WINDWARD_SIDE  ·  Floors 2–3 NE', hop: '0→1' },
  { t: '16.0s', src: 'hospital', msg: 'MASS_CASUALTY activated  ·  23 burn patients', hop: null },
  { t: '20.0s', src: 'hospital→hotel', msg: 'PREPARE_FAMILY_ACCOMMODATION  ·  55 families', hop: '1→2' },
  { t: '23.0s', src: 'hospital→college+school', msg: 'BLOOD_DONATION_NEEDED  ·  O-neg critical', hop: '1→2' },
  { t: '30.0s', src: 'hotel→factory+school+college', msg: 'TRAFFIC_DIVERSION  ·  Main St sealed', hop: '2→3' },
  { t: '55.0s', src: 'system', msg: '✅  ALL 5 FACILITIES COORDINATED — 881 users notified', hop: null },
];

function MeshDiagram() {
  const [active, setActive] = useState(false);
  useEffect(() => { const t = setTimeout(() => setActive(true), 800); return () => clearTimeout(t); }, []);

  return (
    <div className="relative mx-auto w-full max-w-lg select-none">
      <svg viewBox="0 0 480 310" className="w-full" style={{ filter: 'drop-shadow(0 0 24px rgba(99,102,241,0.3))' }}>
        {MESH_EDGES.map(([a, b], i) => {
          const pa = NODE_POS[a]; const pb = NODE_POS[b];
          return (
            <motion.line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke="#6366f1" strokeWidth={1.5} strokeOpacity={0}
              animate={active ? { strokeOpacity: 0.5 } : {}}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }}
            />
          );
        })}
        {FACILITIES.map(({ type, label, color }, i) => {
          const { x, y } = NODE_POS[type];
          return (
            <motion.g key={type} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 200 }}>
              <circle cx={x} cy={y} r={28} fill={color} opacity={0.15} />
              <circle cx={x} cy={y} r={22} fill="#0f172a" stroke={color} strokeWidth={2} />
              <text x={x} y={y + 38} textAnchor="middle" fill="#94a3b8" fontSize={10}
                fontFamily="system-ui, sans-serif" fontWeight="600">{label}</text>
            </motion.g>
          );
        })}
        {active && (
          <motion.circle cx={NODE_POS.factory.x} cy={NODE_POS.factory.y} r={22}
            fill="none" stroke="#eab308" strokeWidth={2}
            animate={{ r: [22, 42], opacity: [0.8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
          />
        )}
      </svg>
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full border border-indigo-500/30 bg-indigo-950/80 px-4 py-1 text-xs font-semibold text-indigo-300 backdrop-blur"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
        5 facility types · 1 unified mesh
      </motion.div>
    </div>
  );
}

function AlertCarousel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % ALERT_TRANSLATIONS.length), 2800);
    return () => clearInterval(t);
  }, []);
  const item = ALERT_TRANSLATIONS[idx];
  return (
    <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-widest text-red-400">Live Alert</span>
        <span className="ml-auto rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] font-bold text-red-300">{item.code}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
          <p className="text-xs font-medium text-slate-200 leading-relaxed">{item.lang}</p>
          <p className="mt-1 text-sm text-slate-400 leading-relaxed">{item.text}</p>
        </motion.div>
      </AnimatePresence>
      <div className="mt-4 flex gap-1.5">
        {ALERT_TRANSLATIONS.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-red-500' : 'w-1.5 bg-slate-700'}`} />
        ))}
      </div>
    </div>
  );
}

function CascadeTerminal() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible >= CASCADE_STEPS.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 700);
    return () => clearTimeout(t);
  }, [visible]);

  const HOP_COLOR: Record<string, string> = { '0→1': '#22c55e', '1→2': '#3b82f6', '2→3': '#a855f7' };
  const SRC_COLOR: Record<string, string> = {
    factory: '#eab308', hospital: '#ef4444', hotel: '#f59e0b',
    school: '#3b82f6', college: '#a855f7', system: '#10b981',
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-[11px] text-slate-500">pnpm demo:finale</span>
      </div>
      <div className="space-y-1 p-4">
        {CASCADE_STEPS.slice(0, visible).map((step, i) => {
          const srcKey = step.src.split('→')[0].split('+')[0];
          const srcColor = SRC_COLOR[srcKey] ?? '#94a3b8';
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="flex items-start gap-3">
              <span className="shrink-0 text-slate-600">[T+{step.t}]</span>
              {step.hop && (
                <span className="shrink-0 rounded px-1 text-[10px] font-bold"
                  style={{ color: HOP_COLOR[step.hop], backgroundColor: HOP_COLOR[step.hop] + '20' }}>
                  HOP {step.hop}
                </span>
              )}
              <span className="shrink-0 font-semibold" style={{ color: srcColor }}>{step.src}</span>
              <span className="text-slate-400">{step.msg}</span>
            </motion.div>
          );
        })}
        {visible < CASCADE_STEPS.length && (
          <motion.span className="inline-block h-3.5 w-1.5 bg-indigo-400"
            animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} />
        )}
      </div>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function RootPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (role === 'admin') router.replace('/admin/overview');
    else if (role === 'employee') router.replace('/employee/home');
    else if (role === 'community') router.replace('/community/home');
  }, [loading, user, role, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">

      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <Radio className="h-5 w-5 text-indigo-400" />
            <span className="text-base font-bold tracking-tight">SCR-Mesh</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button size="sm" variant="outline" className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10">
                Sign in
              </Button>
            </Link>
            <Link href="/bootstrap">
              <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-500">
                Launch Demo <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative mx-auto max-w-3xl">
          <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            One Network.<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Every Crisis.</span>{' '}
            Every Facility.
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-base text-slate-400 leading-relaxed">
            SCR-Mesh connects hospitals, hotels, schools, colleges, and factories
            into a single real-time coordination mesh — so a factory fire triggers
            hospital readiness, school sheltering, and hotel evacuation in under 60 seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg" className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500 shadow-2xl">
                <Play className="h-4 w-4" /> Launch Live Demo
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400">The Problem</p>
            <h2 className="text-2xl font-bold sm:text-3xl">Five facilities. Five silos. Zero coordination.</h2>
            <p className="mt-3 text-slate-400">When a factory has a chemical spill, who tells the school across the street?</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {FACILITIES.map(({ label, Icon, color, bg, tagline }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                className="rounded-xl border p-4 text-center"
                style={{ borderColor: color + '30', backgroundColor: bg }}>
                <Icon className="mx-auto mb-2 h-7 w-7" style={{ color }} />
                <div className="text-sm font-semibold">{label}</div>
                <div className="mt-1 text-[10px] text-slate-500">{tagline}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">The Solution</p>
            <h2 className="text-2xl font-bold sm:text-3xl">One coordinated mesh across all 5 types</h2>
            <p className="mt-3 text-slate-400">Every facility becomes a node. Every crisis propagates coordinated actions across the network.</p>
          </div>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <MeshDiagram />
            <div className="space-y-5">
              {[
                { icon: Zap, title: 'Sub-60s Cascade', desc: 'A factory fire triggers hospital burn unit readiness, school shelter-in-place, and hotel upper-floor evacuation — all within 60 seconds of detection.' },
                { icon: Brain, title: 'Gemini AI Triage', desc: 'Every incident is classified, severity-rated, and enriched with multilingual alerts by Gemini before being broadcast to relevant facilities.' },
                { icon: ShieldCheck, title: 'Dijkstra Evacuation', desc: 'Real-time indoor pathfinding routes occupants around blocked zones, chemical hazards, and fire areas to the nearest safe exit.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="mt-0.5 shrink-0 rounded-lg border border-indigo-500/20 bg-indigo-950/50 p-2">
                    <Icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{title}</div>
                    <div className="mt-1 text-xs text-slate-400 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">Grand Finale</p>
            <h2 className="text-2xl font-bold sm:text-3xl">Community Cascade — live terminal</h2>
            <p className="mt-3 text-slate-400">Factory fire → Hospital → Hotel. 7 mesh events. 3 hops. All 5 facilities coordinated in 55 seconds.</p>
          </div>
          <div className="mx-auto max-w-3xl"><CascadeTerminal /></div>
          <div className="mt-6 flex justify-center">
            <Link href="/admin/mesh/live">
              <Button variant="outline" className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                Watch live on the mesh map <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="rounded-lg border border-violet-500/20 bg-violet-950/50 p-2">
                  <Brain className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <div className="font-semibold">AI Detection (YOLOv8 + Gemini)</div>
                  <div className="text-xs text-slate-500">Real-time anomaly detection across all facility types</div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { facility: 'school', color: '#3b82f6', icon: '🏫', detector: 'Weapon', confidence: '97%' },
                  { facility: 'factory', color: '#eab308', icon: '🏭', detector: 'Chemical Spill Visual', confidence: '91%' },
                  { facility: 'hospital', color: '#ef4444', icon: '🏥', detector: 'Crowd Surge + Intruder', confidence: '88%' },
                ].map(({ facility, color, icon, detector, confidence }) => (
                  <div key={facility} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-xl">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold capitalize" style={{ color }}>{facility}</div>
                      <div className="text-[11px] text-slate-500">{detector}</div>
                    </div>
                    <div className="text-xs font-bold text-emerald-400">{confidence}</div>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: confidence }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="rounded-lg border border-red-500/20 bg-red-950/50 p-2">
                  <Globe className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <div className="font-semibold">3-Language Alert Dispatch</div>
                  <div className="text-xs text-slate-500">EN · HI · TA — Gemini-powered</div>
                </div>
              </div>
              <AlertCarousel />
              <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                Gemini generates culturally appropriate translations under 140 characters.
                Dispatched via FCM push, Twilio SMS, and in-app — simultaneously.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Built for every role, every facility</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Admin Dashboard', desc: 'Facility-adaptive UI — hospital admins see red-cross iconography, factory managers see industrial yellow/black. Incident management, staff control, mesh settings.', color: 'indigo', icon: ShieldCheck, href: '/login' },
              { title: 'Employee Mobile App', desc: 'One-thumb acknowledgement. Playbook-driven task checklists. FCM push + haptic on critical. Offline-first Firestore. Facility-specific defaults (Tamil for school in Tamil Nadu).', color: 'violet', icon: Zap, href: '/login' },
              { title: 'Community SOS', desc: 'Press-and-hold SOS with facility-scoped incident picker. A school student sees "Lockdown / Fire / Medical". A factory worker sees "Injury / Chemical / Equipment".', color: 'rose', icon: AlertTriangle, href: '/community/sos' },
              { title: 'Live Mesh Map', desc: 'Full-screen Google Maps with animated arcs between facilities as mesh events fire. Time scrubber to replay any past cascade. Heatmap overlay for incident density.', color: 'emerald', icon: Radio, href: '/login' },
              { title: 'Indoor Navigation', desc: 'Dijkstra pathfinding on pre-built zone graphs for all 5 facility types. Blocked zones avoided in real-time. SVG viewer + admin zone graph editor.', color: 'blue', icon: QrCode, href: '/community/navigate' },
              { title: 'Connectivity Fallback', desc: 'Wi-Fi → BLE mesh → Cellular simulation. Alerts reach employees even when local network is down. Switchable from the dev toolbar during demo.', color: 'amber', icon: Globe, href: '/bootstrap' },
            ].map(({ title, desc, color, icon: Icon, href }) => (
              <Link key={title} href={href}>
                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer h-full block">
                  <div className={`mb-3 inline-flex rounded-lg border border-${color}-500/20 bg-${color}-950/40 p-2`}>
                    <Icon className={`h-4 w-4 text-${color}-400`} />
                  </div>
                  <div className="mb-1.5 font-semibold text-sm">{title}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Ready to see all 5 facilities coordinate?</h2>
          <p className="mb-8 text-slate-400">
            Seed demo data, trigger the grand finale cascade, and watch 881 users
            across a hospital, hotel, school, college, and factory get coordinated in under 60 seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg" className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500">
                <Play className="h-4 w-4" /> Launch Admin Demo
              </Button>
            </Link>
            <Link href="/bootstrap">
              <Button size="lg" variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
                Seed Demo Data
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}