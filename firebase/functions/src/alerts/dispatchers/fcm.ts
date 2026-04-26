// FCM push dispatcher. Uses firebase-admin Messaging.sendEachForMulticast so
// one tombstoned token doesn't poison the whole fanout. Returns the list of
// tokens that succeeded; dead tokens are surfaced for caller cleanup.

import * as admin from 'firebase-admin';

export interface FcmDispatchInput {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface FcmDispatchResult {
  successCount: number;
  failureCount: number;
  deadTokens: string[];
}

// Tokens Firebase tells us to retire on sight.
const DEAD_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

export async function dispatchFcm(
  input: FcmDispatchInput,
  messaging: admin.messaging.Messaging = admin.messaging()
): Promise<FcmDispatchResult> {
  if (!input.tokens.length) {
    return { successCount: 0, failureCount: 0, deadTokens: [] };
  }

  const response = await messaging.sendEachForMulticast({
    tokens: input.tokens,
    notification: { title: input.title, body: input.body },
    data: input.data,
  });

  const deadTokens: string[] = [];
  response.responses.forEach((r, idx) => {
    if (!r.success && r.error && DEAD_ERROR_CODES.has(r.error.code)) {
      deadTokens.push(input.tokens[idx]);
    }
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    deadTokens,
  };
}
