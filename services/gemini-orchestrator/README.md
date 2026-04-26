# gemini-orchestrator

Node.js + TypeScript Cloud Run service. Uses Gemini 1.5 Pro to triage
incidents, generate multi-language summaries, and recommend mesh events for
cross-facility coordination.

Subscribes to Pub/Sub `incident.created` → enriches the incident doc →
optionally fans out to `criticalEvents` + `meshRecommendations` collections.

## Endpoints

| Method | Path               | Purpose                                         |
|--------|--------------------|-------------------------------------------------|
| GET    | `/health`          | Cloud Run liveness probe                        |
| POST   | `/pubsub`          | Pub/Sub push handler (expects `{ incidentId }`) |
| POST   | `/api/orchestrate` | Manual trigger for local testing                |

## Pub/Sub wiring

The publisher is `firebase/functions/src/incidents/onIncidentCreate.ts` —
every new Firestore doc in `incidents/` is published to the
**`incident.created`** topic. This service's `/pubsub` endpoint is the
push subscriber.

```bash
# 1. Create topic
gcloud pubsub topics create incident.created --project scr-mesh-dev

# 2. Deploy this Cloud Run service (captures its URL)
gcloud run deploy gemini-orchestrator \
  --source services/gemini-orchestrator \
  --project scr-mesh-dev \
  --region us-central1 \
  --port 8080 \
  --no-allow-unauthenticated

# 3. Create a push subscription pointing at /pubsub
SERVICE_URL=$(gcloud run services describe gemini-orchestrator \
  --region us-central1 --format='value(status.url)')

gcloud pubsub subscriptions create gemini-orchestrator-sub \
  --topic incident.created \
  --push-endpoint "$SERVICE_URL/pubsub" \
  --push-auth-service-account pubsub-invoker@scr-mesh-dev.iam.gserviceaccount.com
```

## Idempotency

The orchestrator short-circuits if `incident.aiSummary` or
`incident.orchestrationComplete` is already set, so Pub/Sub redelivery
and manual replays are safe.

## AI-detected incidents

Incidents created by `services/ai-detection` (Phase 2.2) carry
`aiDetected: true` and a `cameraId` on the Firestore doc. They flow
through this orchestrator the same way as human-reported ones — the
only difference is where they originate.
