'use client';

import { Info, BookOpen, HeartPulse, Flame, Zap, ShieldCheck } from 'lucide-react';

const GUIDES = [
  {
    id: 'first-aid',
    title: 'Basic First Aid',
    desc: 'Immediate steps to take for common medical emergencies.',
    icon: HeartPulse,
    color: 'emerald',
  },
  {
    id: 'fire-safety',
    title: 'Fire Evacuation',
    desc: 'Protocol for safely exiting a facility during a fire event.',
    icon: Flame,
    color: 'orange',
  },
  {
    id: 'power-outage',
    title: 'Mesh Network Use',
    desc: 'How to communicate when cellular networks are down.',
    icon: Zap,
    color: 'primary',
  },
  {
    id: 'security',
    title: 'Lockdown Procedures',
    desc: 'Staying safe during security threats or civil unrest.',
    icon: ShieldCheck,
    color: 'blue',
  },
];

export default function PlaybooksPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Emergency Guides</h1>
        <p className="text-muted-foreground">Essential protocols and guides to help you stay safe during a crisis.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {GUIDES.map((guide) => {
          const Icon = guide.icon;
          return (
            <div key={guide.id} className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#11141a] p-8 transition-all hover:border-primary/50 hover:bg-[#161b24] shadow-xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{guide.title}</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {guide.desc}
              </p>
              <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
                Read Guide <BookOpen className="h-3 w-3" />
              </button>
              
              {/* Decorative background icon */}
              <Icon className="absolute -right-8 -bottom-8 h-32 w-32 text-white/5 transition-all group-hover:text-primary/10 group-hover:scale-110" />
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-3xl bg-primary/5 border border-primary/20 p-8">
        <div className="flex items-center gap-4 mb-4">
          <Info className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-bold text-white">Need immediate help?</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          If you are in a life-threatening situation, use the **SOS** button on the home page or contact local emergency services immediately.
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-white border border-white/10">
            Emergency: 112
          </div>
          <div className="rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-white border border-white/10">
            Fire: 101
          </div>
          <div className="rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-white border border-white/10">
            Ambulance: 102
          </div>
        </div>
      </div>
    </div>
  );
}
