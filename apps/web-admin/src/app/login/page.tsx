'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';

import { signIn, signUp } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') {
        await signIn(email, password);
      } else {
        await signUp({ email, password, displayName });
      }
      router.replace('/');
    } catch (err) {
      const message =
        err instanceof FirebaseError ? err.message : 'Authentication failed.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm"
      >
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">
            {mode === 'signIn' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-sm text-muted-foreground">
            SCR-Mesh Admin — role is assigned by a facility admin after sign-up.
          </p>
        </header>

        {mode === 'signUp' && (
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        )}
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? '…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === 'signIn'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </form>
    </main>
  );
}
