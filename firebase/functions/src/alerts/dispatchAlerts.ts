// dispatchAlerts — Phase 2.3 delivery engine.
//
// Triggered on every new alerts/{alertId} document. Resolves the recipient's
// language preference + available channels and fans the message out via FCM,
// Twilio SMS (critical only), and the mesh-relay fallback. Each leg is wrapped
// in withRetry (3x exponential backoff). Successful channels are written back
// to alert.deliveredVia; the final retry count + last error land on the doc
// for observability.

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import type { Alert, Incident, User, DeliveryChannel, Language } from '@scr-mesh/types';
import { dispatchFcm } from './dispatchers/fcm.js';
import { dispatchTwilio } from './dispatchers/twilio.js';
import { dispatchMeshRelay } from './dispatchers/meshRelay.js';
import { withRetry } from './dispatchers/retry.js';

export interface DispatchDeps {
  db?: FirebaseFirestore.Firestore;
  fcm?: typeof dispatchFcm;
  twilio?: typeof dispatchTwilio;
  meshRelay?: typeof dispatchMeshRelay;
  sleep?: (ms: number) => Promise<void>;
}

export interface DispatchSummary {
  alertId: string;
  language: Language;
  delivered: DeliveryChannel[];
  retries: number;
  skipped: boolean;
  reason?: string;
  errors: Record<string, string>;
}

function pickTranslation(alert: Alert, lang: Language): string {
  const translated = alert.messageTranslations?.[lang];
  if (translated && translated.trim()) return translated;
  return alert.messageTranslations?.en ?? alert.message ?? '';
}

async function loadAlert(
  db: FirebaseFirestore.Firestore,
  alertId: string
): Promise<(Alert & { id: string }) | null> {
  const snap = await db.collection('alerts').doc(alertId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Alert) };
}

async function loadRecipient(
  db: FirebaseFirestore.Firestore,
  recipientId: string | undefined
): Promise<(User & { id: string }) | null> {
  if (!recipientId) return null;
  const snap = await db.collection('users').doc(recipientId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as User) };
}

async function loadIncident(
  db: FirebaseFirestore.Firestore,
  incidentId: string
): Promise<Incident | null> {
  const snap = await db.collection('incidents').doc(incidentId).get();
  return snap.exists ? (snap.data() as Incident) : null;
}

async function pruneDeadTokens(
  db: FirebaseFirestore.Firestore,
  userId: string,
  dead: string[]
): Promise<void> {
  if (!dead.length) return;
  await db
    .collection('users')
    .doc(userId)
    .update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...dead),
    });
}

export async function runDispatch(
  alertId: string,
  deps: DispatchDeps = {}
): Promise<DispatchSummary> {
  const db = deps.db ?? admin.firestore();
  const fcm = deps.fcm ?? dispatchFcm;
  const twilio = deps.twilio ?? dispatchTwilio;
  const meshRelay = deps.meshRelay ?? dispatchMeshRelay;
  const sleep = deps.sleep;

  const summary: DispatchSummary = {
    alertId,
    language: 'en',
    delivered: [],
    retries: 0,
    skipped: false,
    errors: {},
  };

  const alert = await loadAlert(db, alertId);
  if (!alert) {
    summary.skipped = true;
    summary.reason = 'alert-missing';
    return summary;
  }

  const recipient = await loadRecipient(db, alert.recipientId);
  const incident = await loadIncident(db, alert.incidentId);
  const severity = incident?.severity ?? 'medium';

  const lang: Language = (recipient?.language as Language) ?? 'en';
  summary.language = lang;
  const body = pickTranslation(alert, lang);

  const delivered: DeliveryChannel[] = Array.isArray(alert.deliveredVia)
    ? [...alert.deliveredVia]
    : [];
  let retries = 0;
  const errors: Record<string, string> = {};

  // --- FCM push -----------------------------------------------------------
  const tokens = recipient?.fcmTokens ?? [];
  if (tokens.length) {
    try {
      const { result, attempts } = await withRetry(
        () =>
          fcm({
            tokens,
            title: `SCR-Mesh: ${(incident?.type ?? 'incident').replace(/_/g, ' ')}`,
            body,
            data: {
              alertId,
              incidentId: alert.incidentId,
              facilityId: alert.facilityId,
              severity,
            },
          }),
        { maxAttempts: 3, baseMs: 200, sleep }
      );
      retries += attempts - 1;
      if (result.successCount > 0 && !delivered.includes('push')) {
        delivered.push('push');
      }
      if (result.deadTokens.length && recipient) {
        await pruneDeadTokens(db, recipient.id, result.deadTokens);
      }
      if (result.failureCount && !result.successCount) {
        errors.fcm = `all ${result.failureCount} tokens failed`;
      }
    } catch (err) {
      retries += 3;
      errors.fcm = err instanceof Error ? err.message : String(err);
    }
  }

  // --- Twilio SMS (critical only) ----------------------------------------
  if (severity === 'critical' && recipient?.phoneNumber) {
    try {
      const { result, attempts } = await withRetry(
        () =>
          twilio({
            to: recipient.phoneNumber,
            body,
          }),
        { maxAttempts: 3, baseMs: 300, sleep }
      );
      retries += attempts - 1;
      if (result && !delivered.includes('sms')) delivered.push('sms');
    } catch (err) {
      retries += 3;
      errors.sms = err instanceof Error ? err.message : String(err);
    }
  }

  // --- Mesh-relay fallback ------------------------------------------------
  //  When neither FCM nor SMS delivered, park the message for async pickup.
  const livePushOrSms = delivered.includes('push') || delivered.includes('sms');
  if (!livePushOrSms) {
    try {
      const { attempts } = await withRetry(
        () =>
          meshRelay({
            alertId,
            incidentId: alert.incidentId,
            recipientId: recipient?.id ?? alert.recipientId ?? 'unknown',
            message: body,
          }),
        { maxAttempts: 3, baseMs: 200, sleep }
      );
      retries += attempts - 1;
      if (!delivered.includes('in_app')) delivered.push('in_app');
    } catch (err) {
      retries += 3;
      errors.meshRelay = err instanceof Error ? err.message : String(err);
    }
  }

  const update: Record<string, unknown> = {
    deliveredVia: delivered,
    retries,
  };
  const lastError = Object.values(errors).pop();
  if (lastError) update.lastError = lastError;

  await db.collection('alerts').doc(alertId).update(update);

  summary.delivered = delivered;
  summary.retries = retries;
  summary.errors = errors;
  return summary;
}

// Test harness hook: firebase-functions-test wrapped invocations call the
// real trigger which would otherwise hit live admin.firestore() / FCM.
// Tests set this override so runDispatch receives the in-memory fakes.
let _dispatchDepsOverride: DispatchDeps = {};
export const __setDispatchDeps = (deps: DispatchDeps): void => {
  _dispatchDepsOverride = deps;
};
export const __resetDispatchDeps = (): void => {
  _dispatchDepsOverride = {};
};

export const dispatchAlerts = onDocumentCreated(
  'alerts/{alertId}',
  async (event) => {
    const alertId = event.params.alertId;
    const snapshot = event.data;
    if (!snapshot) return;

    try {
      const summary = await runDispatch(alertId, _dispatchDepsOverride);
      console.log(
        `dispatchAlerts ${alertId}: delivered=[${summary.delivered.join(',')}] ` +
          `retries=${summary.retries} lang=${summary.language}` +
          (summary.skipped ? ` skipped=${summary.reason}` : '')
      );
    } catch (err) {
      console.error(`dispatchAlerts ${alertId} fatal:`, err);
    }
  }
);
