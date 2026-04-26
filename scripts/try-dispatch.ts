import * as admin from 'firebase-admin';
import { runDispatch } from '../firebase/functions/src/alerts/dispatchAlerts';

admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID ?? 'scr-mesh-dev',
});

const alertId = process.argv[2];
if (!alertId) {
  console.error('usage: npx tsx scripts/try-dispatch.ts <alertId>');
  process.exit(1);
}

runDispatch(alertId, {
  fcm: async ({ tokens, body }) => {
    console.log('FCM would send:', { body, tokens });
    return { successCount: tokens.length, failureCount: 0, deadTokens: [] };
  },
  twilio: async ({ to, body }) => {
    console.log('SMS would send:', { to, body });
    return { sid: 'stub' };
  },
  meshRelay: async ({ message }) => {
    console.log('Relay:', message);
    return 'stub';
  },
})
  .then((s) => {
    console.log('summary:', s);
    process.exit(0);
  })
  .catch((err) => {
    console.error('error:', err);
    process.exit(1);
  });
