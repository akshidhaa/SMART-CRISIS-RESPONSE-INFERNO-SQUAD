'use client';

// Auth context = Firebase user + the Firestore `users/{uid}` profile + the
// currently-selected facility. `useAuth()` is the only hook the rest of
// the app should need.
//
// `currentFacilityId` is persisted to localStorage so tab reloads and
// FacilitySwitcher selections survive — if the stored id is no longer in
// the user's facilityIds, we fall back to the first entry.

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
      typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setCurrentFacilityIdState(stored);
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (next) => {
      setUser(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    console.log('[AuthProvider] Reading profile for uid:', user.uid);
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as User;
          console.log('[AuthProvider] Profile loaded:', { role: data.role, facilityIds: data.facilityIds });
          setProfile(data);
        } else {
          console.warn('[AuthProvider] No user doc found at users/' + user.uid);
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[AuthProvider] Firestore read FAILED:', err.code, err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [user]);

  // Keep `currentFacilityId` valid whenever the profile changes.
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
    [user, profile, currentFacilityId, loading, setCurrentFacilityId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return ctx;
}
