'use client';

import { Phone, MapPin, Shield, Info, LifeBuoy } from 'lucide-react';

export default function ContactsPage() {
  const CONTACTS = [
    { title: 'Emergency Hub', phone: '112', desc: 'Central response dispatch for all life-safety events.', icon: Shield },
    { title: 'Medical Services', phone: '102', desc: 'Ambulance and paramedical support.', icon: LifeBuoy },
    { title: 'Fire & Rescue', phone: '101', desc: 'Facility fire response and evacuation support.', icon: Info },
    { title: 'Neighborhood Watch', phone: '800-MESH-01', desc: 'Community coordination and local safety.', icon: Phone },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Community Contacts</h1>
        <p className="text-muted-foreground">Direct lines to local response hubs and emergency services.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {CONTACTS.map((contact) => {
          const Icon = contact.icon;
          return (
            <div key={contact.title} className="group flex flex-col rounded-3xl border border-white/10 bg-[#11141a] p-8 transition-all hover:bg-[#161b24] shadow-xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{contact.title}</h3>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                {contact.desc}
              </p>
              <div className="mt-auto">
                <a 
                  href={`tel:${contact.phone}`}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white/5 py-4 text-base font-black text-white hover:bg-white/10 transition-all border border-white/10"
                >
                  <Phone className="h-5 w-5" />
                  {contact.phone}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
