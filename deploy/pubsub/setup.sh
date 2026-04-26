#!/usr/bin/env bash
# deploy/pubsub/setup.sh
# Creates Pub/Sub topics and push subscriptions for SCR-Mesh.
# Run AFTER all Cloud Run services are deployed so their URLs are available.
#
# Usage:
#   export PROJECT_ID=your-gcp-project-id
#   export REGION=us-central1
#   bash deploy/pubsub/setup.sh

set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
: "${REGION:=us-central1}"

echo "==> Setting up Pub/Sub for project: $PROJECT_ID (region: $REGION)"

# ── Topics ────────────────────────────────────────────────────────────────
TOPICS=(
  "incident.created"
  "incident.critical"
  "mesh.event.created"
)

for topic in "${TOPICS[@]}"; do
  if gcloud pubsub topics describe "$topic" --project="$PROJECT_ID" &>/dev/null; then
    echo "    topic '$topic' already exists — skipping"
  else
    gcloud pubsub topics create "$topic" --project="$PROJECT_ID"
    echo "    created topic: $topic"
  fi
done

# ── Fetch Cloud Run service URLs ──────────────────────────────────────────
get_url() {
  gcloud run services describe "$1" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(status.url)"
}

echo "==> Fetching Cloud Run service URLs..."
GEMINI_URL=$(get_url gemini-orchestrator)
MESH_URL=$(get_url mesh-coordinator)

echo "    gemini-orchestrator : $GEMINI_URL"
echo "    mesh-coordinator    : $MESH_URL"

# ── Push Subscriptions ────────────────────────────────────────────────────
# incident.created → gemini-orchestrator
SUB1="incident-created-to-gemini"
if gcloud pubsub subscriptions describe "$SUB1" --project="$PROJECT_ID" &>/dev/null; then
  echo "    subscription '$SUB1' already exists — skipping"
else
  gcloud pubsub subscriptions create "$SUB1" \
    --project="$PROJECT_ID" \
    --topic="incident.created" \
    --push-endpoint="${GEMINI_URL}/pubsub" \
    --push-auth-service-account="scr-mesh-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --ack-deadline=60 \
    --message-retention-duration=7d \
    --min-retry-delay=10s \
    --max-retry-delay=300s
  echo "    created: $SUB1"
fi

# incident.critical → mesh-coordinator
SUB2="incident-critical-to-coordinator"
if gcloud pubsub subscriptions describe "$SUB2" --project="$PROJECT_ID" &>/dev/null; then
  echo "    subscription '$SUB2' already exists — skipping"
else
  gcloud pubsub subscriptions create "$SUB2" \
    --project="$PROJECT_ID" \
    --topic="incident.critical" \
    --push-endpoint="${MESH_URL}/pubsub" \
    --push-auth-service-account="scr-mesh-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --ack-deadline=60 \
    --message-retention-duration=7d \
    --min-retry-delay=10s \
    --max-retry-delay=300s
  echo "    created: $SUB2"
fi

# mesh.event.created → mesh-coordinator
SUB3="mesh-event-to-coordinator"
if gcloud pubsub subscriptions describe "$SUB3" --project="$PROJECT_ID" &>/dev/null; then
  echo "    subscription '$SUB3' already exists — skipping"
else
  gcloud pubsub subscriptions create "$SUB3" \
    --project="$PROJECT_ID" \
    --topic="mesh.event.created" \
    --push-endpoint="${MESH_URL}/pubsub" \
    --push-auth-service-account="scr-mesh-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --ack-deadline=60 \
    --message-retention-duration=7d \
    --min-retry-delay=10s \
    --max-retry-delay=300s
  echo "    created: $SUB3"
fi

echo ""
echo "==> Pub/Sub setup complete."
echo "    Topics   : ${TOPICS[*]}"
echo "    Subscriptions: $SUB1, $SUB2, $SUB3"
