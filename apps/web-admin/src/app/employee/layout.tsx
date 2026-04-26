'use client';

import { type ReactNode } from 'react';
import { SignedIn, useAuth } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import { FacilityThemeScope } from '@/components/theme/FacilityThemeScope';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, MessageCircle, User, ShieldAlert } from 'lucide-react';
import { LanguagePicker } from '@/components/alerts/LanguagePicker';
import { AlertVoiceAnnouncer } from '@/components/alerts/AlertVoiceAnnouncer';

// Wrapper specifically for Employee role
function EmployeeGate({ children }: { children: ReactNode }) {
  const { currentFacilityId, role, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Loading employee module...
      </div>
    );
  }

  // Ensure they have the correct role and a facility
  if (!currentFacilityId || (role !== 'employee' && role !== 'admin')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center text-sm">
         <p className="text-zinc-400">Access Denied. Employee role and assigned facility required.</p>
      </div>
    );
  }

  return <Shell>{children}</Shell>;
}

function EmployeeBottomNav() {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Home', href: '/employee/home', icon: Home },
    { name: 'Tasks', href: '/employee/tasks', icon: CheckSquare },
    { name: 'Drill', href: '/employee/drill', icon: ShieldAlert },
    { name: 'Chat', href: '/employee/chat', icon: MessageCircle },
    { name: 'Profile', href: '/employee/profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border flex items-center justify-around px-2 pb-safe">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { facility } = useCurrentFacility();
  return (
    <FacilityThemeScope facilityType={facility?.data.type}>
      <div className="flex flex-col min-h-screen bg-background text-foreground pb-16">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border py-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-semibold">{facility?.data.name || 'Loading'}</h1>
              <span className="text-[10px] font-mono uppercase text-muted-foreground">
                {facility?.data.type}
              </span>
            </div>
            <LanguagePicker />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 relative">
          {children}
        </main>
        <AlertVoiceAnnouncer />
        <EmployeeBottomNav />
      </div>
    </FacilityThemeScope>
  );
}

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <SignedIn>
      <EmployeeGate>{children}</EmployeeGate>
    </SignedIn>
  );
}
