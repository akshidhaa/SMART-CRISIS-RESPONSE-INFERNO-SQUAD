'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Language, User, UserRole } from '@scr-mesh/types';

import { auth, db } from '../firebase';

const STORAGE_KEY = 'scr-mesh.currentFacilityId';

export interface AuthContextValue {
  user: FirebaseUser | null;
  role: UserRole | null;
  designation: string;
  facilityIds: string[];
  currentFacilityId: string | null;
  language: Language | null;
  loading: boolean;
  setCurrentFacilityId: (facilityId: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [currentFacilityId, setCurrentFacilityIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;

    if (stored) setCurrentFacilityIdState(stored);
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (next) => {
      if (next) {
        setUser(next);
      } else {
        // DEMO MODE
        setUser({ uid: 'demo-user', email: 'demo@example.com' } as FirebaseUser);

setProfile({
  email: 'demo@example.com',
  displayName: 'Demo Admin',
  role: 'admin',
  facilityIds: ['demo_hospital', 'demo_hotel', 'demo_school'],
  createdAt: new Date() as any,
  updatedAt: new Date() as any,
} as any);
        setCurrentFacilityIdState('demo_hospital');
        setLoading(false);
      }
    });

    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;

    if (user.uid === 'demo-user') {
      return;
    }

    setLoading(true);

    const ref = doc(db, 'users', user.uid);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as User;
          setProfile(data);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  useEffect(() => {
    const ids = profile?.facilityIds ?? [];

    if (ids.length === 0) {
      setCurrentFacilityIdState(null);
      return;
    }

    if (!currentFacilityId || !ids.includes(currentFacilityId)) {
      setCurrentFacilityIdState(ids[0]);
    }
  }, [profile, currentFacilityId]);

  const setCurrentFacilityId = useCallback((facilityId: string) => {
    setCurrentFacilityIdState(facilityId);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, facilityId);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: profile?.role ?? null,
      designation: profile?.designation ?? '',
      facilityIds: profile?.facilityIds ?? [],
      currentFacilityId,
      language: profile?.language ?? null,
      loading,
      setCurrentFacilityId,
    }),
    [user, profile, currentFacilityId, loading, setCurrentFacilityId]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }

  return ctx;
}