// Main orchestration flow — the glue between Firestore, Gemini, and downstream events.
//
// 1. Fetch incident + facility + matching playbook from Firestore.
// 2. Call Gemini for AI triage.
// 3. Validate the response with Zod.
// 4. Update the incident with aiSummary + severity.
// 5. If critical → publish to criticalEvents collection.
// 6. Store mesh recommendations for the mesh-coordinator service.

import admin from 'firebase-admin';
import { PLAYBOOKS } from '@scr-mesh/playbooks';
import { analyzeIncidentContext } from './gemini.js';
import { GeminiResponseSchema, type GeminiResponse } from './schemas.js';
import { logger } from './logger.js';

export async function orchestrateIncident(incidentId: string): Promise<void> {
  const startMs = Date.now();
  const db = admin.firestore();
  const incidentRef = db.collection('incidents').doc(incidentId);

  logger.info('Orchestration started', { incidentId });

  // ── Step 1: Fetch incident ────────────────────────────────────────────
  const docSnap = await incidentRef.get();
  if (!docSnap.exists) {
    logger.error('Aborting — incident not found', { incidentId });
    return;
  }

  const incident = docSnap.data()!;

  // Idempotency guard — skip if already orchestrated
  if (incident.aiSummary || incident.orchestrationComplete) {
    logger.info('Incident already orchestrated, skipping', { incidentId });
    return;
  }

  const facilityType = incident.facilityType as string;
  const incidentType = incident.type as string;

  // ── Step 2: Fetch facility ────────────────────────────────────────────
  const facilitySnap = await db.collection('facilities').doc(incident.facilityId).get();
  if (!facilitySnap.exists) {
    logger.error('Aborting — facility not found', {
      incidentId,
      facilityId: incident.facilityId,
    });
    return;
  }
  const facility = facilitySnap.data()!;

  // ── Step 3: Find matching playbook ────────────────────────────────────
  const playbookKey = `${facilityType}:${incidentType}`;
  const basePlaybook = PLAYBOOKS[playbookKey];

  const baseSteps = basePlaybook
    ? basePlaybook.steps.map((s) => `[${s.targetRole}] ${s.action} (TTA: ${s.ttaSeconds}s)`)
    : ['Assess the situation', 'Notify emergency contacts'];

  logger.info('Context gathered', {
    incidentId,
    facilityType,
    incidentType,
    facilityName: facility.name,
    playbookFound: Boolean(basePlaybook),
  });

  // ── Step 4: Call Gemini ───────────────────────────────────────────────
  let geminiResult: GeminiResponse;
  try {
    logger.info('Sending to Gemini for triage', { incidentId });

    const rawResult = await analyzeIncidentContext(
      facilityType,
      incidentType,
      incident.reporterRole,
      incident.location,
      incident.description,
      baseSteps,
    );

    // Zod validation as a safety net on top of Gemini's native structured output
    geminiResult = GeminiResponseSchema.parse(rawResult);

    logger.info('Gemini response validated', {
      incidentId,
      severity: geminiResult.severity,
      meshRecommendations: geminiResult.meshEventRecommendations.length,
      estimatedResponseMinutes: geminiResult.estimatedResponseMinutes,
    });
  } catch (err) {
    logger.error('Gemini call or Zod validation failed', {
      incidentId,
      error: String(err),
    });
    throw err;
  }

  // ── Step 5: Update incident with full AI enrichment ───────────────────
  await incidentRef.update({
    aiSummary: geminiResult.refinedSummary,
    severity: geminiResult.severity,
    multiLanguageSummaries: geminiResult.multiLanguageSummaries,
    suggestedProtocolDeltas: geminiResult.suggestedProtocolDeltas,
    recommendedRoles: geminiResult.recommendedRoles,
    estimatedResponseMinutes: geminiResult.estimatedResponseMinutes,
    meshEventRecommendations: geminiResult.meshEventRecommendations,
    orchestrationComplete: true,
    aiProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info('Incident updated with AI enrichment', {
    incidentId,
    severity: geminiResult.severity,
  });

  // ── Step 6: If critical → publish downstream event ────────────────────
  if (geminiResult.severity === 'critical') {
    logger.critical('CRITICAL incident detected — publishing downstream event', {
      incidentId,
      facilityId: incident.facilityId,
      facilityType,
    });

    await db.collection('criticalEvents').add({
      incidentId,
      facilityId: incident.facilityId,
      facilityType,
      meshRecommendations: geminiResult.meshEventRecommendations,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // ── Step 7: Store mesh recommendations for mesh-coordinator ───────────
  if (geminiResult.meshEventRecommendations.length > 0) {
    await db.collection('meshRecommendations').add({
      incidentId,
      facilityId: incident.facilityId,
      recommendations: geminiResult.meshEventRecommendations,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('Mesh recommendations stored', {
      incidentId,
      count: geminiResult.meshEventRecommendations.length,
    });
  }

  const durationMs = Date.now() - startMs;
  logger.info('Orchestration complete', {
    incidentId,
    severity: geminiResult.severity,
    durationMs,
    suggestedDeltas: geminiResult.suggestedProtocolDeltas.length,
    recommendedRoles: geminiResult.recommendedRoles,
  });
}
