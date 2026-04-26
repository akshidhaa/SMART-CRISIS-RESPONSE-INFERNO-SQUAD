// Firestore client — reads incidents, facilities, writes back AI enrichments.
// Firebase Admin is initialized in index.ts; this module just grabs the db.

import admin from 'firebase-admin';
import type { Facility, Incident } from '@scr-mesh/types';
import { logger } from './logger.js';

function db() {
  return admin.firestore();
}

export async function fetchIncident(incidentId: string): Promise<(Incident & { id: string }) | null> {
  const snap = await db().collection('incidents').doc(incidentId).get();
  if (!snap.exists) {
    logger.warn('Incident not found', { incidentId });
    return null;
  }
  return { id: snap.id, ...(snap.data() as Incident) };
}

export async function fetchFacility(facilityId: string): Promise<(Facility & { id: string }) | null> {
  const snap = await db().collection('facilities').doc(facilityId).get();
  if (!snap.exists) {
    logger.warn('Facility not found', { facilityId });
    return null;
  }
  return { id: snap.id, ...(snap.data() as Facility) };
}

export async function updateIncidentWithAI(
  incidentId: string,
  aiSummary: string,
  severity: string,
  multiLanguageSummaries: Record<string, string>,
): Promise<void> {
  await db().collection('incidents').doc(incidentId).update({
    aiSummary,
    severity,
    multiLanguageSummaries,
    aiProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  logger.info('Incident updated with AI enrichment', { incidentId, severity });
}

export async function publishCriticalEvent(
  incidentId: string,
  facilityId: string,
  meshRecommendations: Array<{ type: string; target: string; radiusKm: number; reason: string }>,
): Promise<void> {
  await db().collection('criticalEvents').add({
    incidentId,
    facilityId,
    meshRecommendations,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  logger.info('Critical event published', { incidentId, facilityId });
}

export async function storeMeshRecommendations(
  incidentId: string,
  recommendations: Array<{ type: string; target: string; radiusKm: number; reason: string }>,
): Promise<void> {
  if (recommendations.length === 0) return;
  await db().collection('meshRecommendations').add({
    incidentId,
    recommendations,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  logger.info('Mesh recommendations stored', { incidentId, count: recommendations.length });
}
