// Exponential-backoff retry helper used by every channel dispatcher.
//
// Each attempt waits `baseMs * 2^n` before retrying (capped at `maxMs`).
// The caller owns the decision of whether an error is retryable — we just
// run the task up to `maxAttempts` times and surface the final error.

export interface RetryOptions {
  maxAttempts?: number;
  baseMs?: number;
  maxMs?: number;
  onAttempt?: (attempt: number, error: unknown) => void;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  task: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<{ result: T; attempts: number }> {
  const max = opts.maxAttempts ?? 3;
  const base = opts.baseMs ?? 200;
  const cap = opts.maxMs ?? 5_000;
  const sleep = opts.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      const result = await task();
      return { result, attempts: attempt };
    } catch (err) {
      lastError = err;
      opts.onAttempt?.(attempt, err);
      if (attempt === max) break;
      const delay = Math.min(cap, base * 2 ** (attempt - 1));
      await sleep(delay);
    }
  }
  throw lastError;
}
