// mesh-coordinator HTTP server — Cloud Run entrypoint.
//
// Routes:
//   POST /pubsub  — receives Pub/Sub push messages from `incident.critical`.
//                   Body shape per Pub/Sub push contract:
//                   { message: { data: <base64({ incidentId })> }, subscription }
//   POST /coordinate — direct invocation for tests/dev.
//                   Body: { incidentId }
//   GET  /health  — liveness probe.

import express, { type Request, type Response } from 'express';
import { coordinate } from './coordinate.js';
import { buildAdminFirestoreAdapter } from './firestore.js';

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'mesh-coordinator' });
});

app.post('/coordinate', async (req: Request, res: Response) => {
  try {
    const incidentId = req.body?.incidentId;
    if (!incidentId || typeof incidentId !== 'string') {
      return res.status(400).json({ error: 'incidentId required' });
    }
    const fs = await buildAdminFirestoreAdapter();
    const out = await coordinate({ incidentId }, { fs });
    res.json(out);
  } catch (err) {
    console.error('[mesh-coordinator] /coordinate failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/pubsub', async (req: Request, res: Response) => {
  try {
    const dataB64 = req.body?.message?.data;
    if (!dataB64) return res.status(400).json({ error: 'message.data missing' });
    const decoded = Buffer.from(dataB64, 'base64').toString('utf8');
    const payload = JSON.parse(decoded) as { incidentId?: string };
    if (!payload.incidentId) return res.status(400).json({ error: 'incidentId missing in payload' });

    const fs = await buildAdminFirestoreAdapter();
    const out = await coordinate({ incidentId: payload.incidentId }, { fs });
    // Pub/Sub push expects 2xx for ack, anything else triggers redelivery.
    res.status(200).json(out);
  } catch (err) {
    console.error('[mesh-coordinator] /pubsub failed', err);
    // Return 200 to prevent Pub/Sub redelivery storms on permanent errors.
    // Production should distinguish transient vs permanent and return 500 only
    // for transient (e.g. Firestore unavailable).
    res.status(200).json({ error: (err as Error).message });
  }
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`[mesh-coordinator] listening on :${port}`);
});
