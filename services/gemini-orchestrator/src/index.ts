// gemini-orchestrator — Express server for Cloud Run.
// Receives Pub/Sub push messages on POST /pubsub, orchestrates via Gemini.

import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { orchestrateIncident } from './orchestrate.js';
import { logger } from './logger.js';

dotenv.config();

// Initialize Firebase Admin (ADC in Cloud Run, project-id locally)
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'scr-mesh-dev',
});

const app = express();
app.use(express.json());

// ── Health check for Cloud Run ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'gemini-orchestrator' });
});

// ── Pub/Sub push endpoint ───────────────────────────────────────────────
app.post('/pubsub', async (req, res) => {
  try {
    const message = req.body.message;
    if (!message?.data) {
      logger.warn('Bad Pub/Sub message — missing message.data');
      res.status(400).send('Bad Request: missing message.data');
      return;
    }

    // Decode base64 Pub/Sub payload
    const dataString = Buffer.from(message.data, 'base64').toString('utf8');
    const payload = JSON.parse(dataString);

    const { incidentId } = payload;
    if (!incidentId) {
      logger.warn('Pub/Sub payload missing incidentId', { payload });
      res.status(400).send('Missing incidentId');
      return;
    }

    logger.info('Pub/Sub message received', { incidentId, messageId: message.messageId });

    await orchestrateIncident(incidentId);

    // 204 = acknowledged, Pub/Sub will not retry
    res.status(204).send();
  } catch (error) {
    logger.error('Pub/Sub handler failed', { error: String(error) });
    // 500 tells Pub/Sub to retry the message
    res.status(500).send('Internal Server Error');
  }
});

// ── Manual trigger endpoint (for local testing) ─────────────────────────
app.post('/api/orchestrate', async (req, res) => {
  try {
    const { incidentId } = req.body;
    if (!incidentId) {
      res.status(400).json({ error: 'incidentId is required' });
      return;
    }

    logger.info('Manual orchestration triggered', { incidentId });
    await orchestrateIncident(incidentId);

    res.status(200).json({ success: true, incidentId });
  } catch (error) {
    logger.error('Manual orchestration failed', { error: String(error) });
    res.status(500).json({ error: 'Orchestration failed' });
  }
});

// ── Start server ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`Gemini Orchestrator running on port ${PORT}`);
});
