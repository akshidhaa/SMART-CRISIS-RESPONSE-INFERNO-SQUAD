# SCR-Mesh — Deployment Guide

This guide walks a second person through deploying the full SCR-Mesh platform to Google Cloud Platform.  
Estimated time: **60–90 minutes** for a first-time deploy.

---

## Architecture Overview

| Component | Technology | Deployment target |
|---|---|---|
| `apps/web-admin` | Next.js 14 | Cloud Run → Firebase Hosting |
| `apps/web-public` | Next.js 14 | Cloud Run → Firebase Hosting |
| `services/gemini-orchestrator` | Node.js / Express | Cloud Run |
| `services/ai-detection` | Python / FastAPI | Cloud Run |
| `services/mesh-coordinator` | Node.js / Express | Cloud Run |
| `firebase/functions` | Firebase Functions v2 | Firebase Functions |
| Database | Firestore | Firebase |
| Messaging | Google Pub/Sub | GCP |

---

## Prerequisites

Install these tools on the deployment machine:

```bash
# Node.js 20+
node --version   # must be >= 20

# pnpm 9
npm install -g pnpm@9

# Docker (for building images)
docker --version

# Google Cloud SDK
gcloud --version

# Firebase CLI
npm install -g firebase-tools
firebase --version   # must be >= 13
```

---

## Step 0 — GCP Project Setup

### 0.1 Create the project

```bash
export PROJECT_ID=scr-mesh-prod     # change to your chosen project ID
export REGION=us-central1

gcloud projects create $PROJECT_ID --name="SCR Mesh Production"
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION
```

### 0.2 Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  pubsub.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com
```

### 0.3 Link Firebase to the GCP project

1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project** → select the GCP project `scr-mesh-prod`.
2. Enable **Google Analytics** if desired (optional).
3. In Firebase Console → **Firestore Database** → Create database (Production mode).
4. In Firebase Console → **Authentication** → Enable **Email/Password** provider.

### 0.4 Create a service account

```bash
gcloud iam service-accounts create scr-mesh-sa \
  --display-name="SCR Mesh Runtime SA"

# Grant necessary roles
for ROLE in \
  roles/datastore.user \
  roles/pubsub.publisher \
  roles/pubsub.subscriber \
  roles/secretmanager.secretAccessor \
  roles/run.invoker; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:scr-mesh-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="$ROLE"
done
```

### 0.5 Allow Pub/Sub to authenticate push subscriptions

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:service-$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role=roles/iam.serviceAccountTokenCreator
```

---

## Step 1 — Secrets

### 1.1 Gemini API key

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com).

```bash
echo -n "YOUR_GEMINI_API_KEY" | \
  gcloud secrets create gemini-api-key \
    --data-file=- \
    --project=$PROJECT_ID

# Allow the service account to read it
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:scr-mesh-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor \
  --project=$PROJECT_ID
```

### 1.2 Twilio credentials (SMS notifications)

```bash
firebase use production   # set in .firebaserc

firebase functions:secrets:set TWILIO_ACCOUNT_SID
# paste: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

firebase functions:secrets:set TWILIO_AUTH_TOKEN
# paste: your_auth_token

firebase functions:secrets:set TWILIO_PHONE_NUMBER
# paste: +1xxxxxxxxxx
```

If you don't have Twilio, leave these blank — the function gracefully skips SMS.

---

## Step 2 — Firebase Config Values

In Firebase Console → **Project Settings** → **Your apps** → add a **Web app** named `scr-mesh-admin`.  
Copy the config object and note down all values.

Create a file called `.env.deploy` (this file is gitignored — never commit it):

```bash
cp deploy/.env.example .env.deploy
# Edit .env.deploy with your real values
```

Then source it for the rest of this session:

```bash
source .env.deploy
```

---

## Step 3 — Build and Push Docker Images

Run from the **repo root**. Each command builds the image using the monorepo Dockerfile.

### 3.1 Authenticate Docker with GCP Container Registry

```bash
gcloud auth configure-docker
```

### 3.2 Build and push all images

```bash
# Web Admin (Next.js — Firebase config baked in at build time)
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
  -f apps/web-admin/Dockerfile \
  -t gcr.io/$PROJECT_ID/web-admin:latest .

docker push gcr.io/$PROJECT_ID/web-admin:latest

# Web Public (same Firebase config)
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
  -f apps/web-public/Dockerfile \
  -t gcr.io/$PROJECT_ID/web-public:latest .

docker push gcr.io/$PROJECT_ID/web-public:latest

# Gemini Orchestrator
docker build \
  -f services/gemini-orchestrator/Dockerfile \
  -t gcr.io/$PROJECT_ID/gemini-orchestrator:latest .

docker push gcr.io/$PROJECT_ID/gemini-orchestrator:latest

# AI Detection
docker build \
  -f services/ai-detection/Dockerfile \
  -t gcr.io/$PROJECT_ID/ai-detection:latest \
  services/ai-detection/

docker push gcr.io/$PROJECT_ID/ai-detection:latest

# Mesh Coordinator
docker build \
  -f services/mesh-coordinator/Dockerfile \
  -t gcr.io/$PROJECT_ID/mesh-coordinator:latest .

docker push gcr.io/$PROJECT_ID/mesh-coordinator:latest
```

> **Tip:** The first build takes 5–15 min per image (pnpm install + TypeScript compile).  
> Subsequent builds use Docker layer cache and complete in 1–3 min.

---

## Step 4 — Deploy Cloud Run Services

Replace `PROJECT_ID` in the YAML files under `deploy/cloud-run/` before running.  
You can do this with sed:

```bash
for f in deploy/cloud-run/*.yaml; do
  sed -i "s/PROJECT_ID/$PROJECT_ID/g" "$f"
done
```

Then deploy each service:

```bash
# Web Admin
gcloud run services replace deploy/cloud-run/web-admin.yaml \
  --region=$REGION --project=$PROJECT_ID

# Web Public
gcloud run services replace deploy/cloud-run/web-public.yaml \
  --region=$REGION --project=$PROJECT_ID

# Gemini Orchestrator
gcloud run services replace deploy/cloud-run/gemini-orchestrator.yaml \
  --region=$REGION --project=$PROJECT_ID

# AI Detection
gcloud run services replace deploy/cloud-run/ai-detection.yaml \
  --region=$REGION --project=$PROJECT_ID

# Mesh Coordinator
gcloud run services replace deploy/cloud-run/mesh-coordinator.yaml \
  --region=$REGION --project=$PROJECT_ID
```

Allow unauthenticated access to the web apps:

```bash
gcloud run services add-iam-policy-binding web-admin \
  --region=$REGION --project=$PROJECT_ID \
  --member="allUsers" --role="roles/run.invoker"

gcloud run services add-iam-policy-binding web-public \
  --region=$REGION --project=$PROJECT_ID \
  --member="allUsers" --role="roles/run.invoker"
```

Get the live URLs:

```bash
gcloud run services describe web-admin \
  --region=$REGION --project=$PROJECT_ID \
  --format="value(status.url)"

gcloud run services describe web-public \
  --region=$REGION --project=$PROJECT_ID \
  --format="value(status.url)"
```

---

## Step 5 — Deploy Firebase Functions + Firestore Rules

```bash
# Point Firebase CLI at the production project
firebase use production

# Deploy Firestore rules, indexes, and functions in one go
firebase deploy --only firestore,functions
```

If the `functions` deploy fails on missing env vars, check Step 1.2 (Twilio secrets).

---

## Step 6 — Set Up Pub/Sub Topics and Subscriptions

Run the setup script **after** all Cloud Run services are deployed:

```bash
export PROJECT_ID=$PROJECT_ID
export REGION=$REGION
bash deploy/pubsub/setup.sh
```

This creates:
- Topics: `incident.created`, `incident.critical`, `mesh.event.created`
- Push subscriptions: `gemini-orchestrator /pubsub`, `mesh-coordinator /pubsub`

---

## Step 7 — Firebase Hosting (Optional — for custom domain)

If you want Firebase Hosting to front the Cloud Run services (custom domain + CDN):

```bash
# Apply hosting targets defined in .firebaserc
firebase target:apply hosting admin scr-mesh-admin
firebase target:apply hosting public scr-mesh-public

firebase deploy --only hosting
```

The hosting sites must already exist in Firebase Console (Project Settings → Hosting).

---

## Step 8 — Seed Demo Data

Run the seed script to populate all 5 facilities and incidents into Firestore:

```bash
# Make sure .env.deploy is sourced (Step 2)
# The script reads NEXT_PUBLIC_FIREBASE_* from env
pnpm seed:demo
```

Alternatively, use the in-app bootstrap at:  
`https://<web-admin-url>/bootstrap`
1. Click **"1. Inject Demo Mesh Data"**
2. Click **"2. Bind Profile & Enter Admin"**

---

## Step 9 — Smoke Tests

After deploy, verify each layer:

| Check | How |
|---|---|
| Admin app loads | Open `<web-admin-url>` → login page appears |
| Bootstrap works | Go to `/bootstrap`, run both steps, land on `/admin` |
| Map shows 5 facilities | Admin → Mesh Live → 5 nodes with 2 red, 3 green |
| Incident flow | Admin → Incidents → Report new incident → status updates in real time |
| Pub/Sub flow | Report a critical incident → check Cloud Run logs for `gemini-orchestrator` and `mesh-coordinator` receiving messages |
| Firebase Functions | Firebase Console → Functions → view invocation logs |
| Community app | Open `<web-public-url>` → login → community home shows facility |

---

## Step 10 — Staging Environment (Optional)

To create a mirror staging environment:

```bash
# Create staging project
export STAGING_ID=scr-mesh-staging
gcloud projects create $STAGING_ID

# Repeat Steps 0–8 with PROJECT_ID=$STAGING_ID
# Use firebase use staging for Firebase commands
```

---

## Troubleshooting

### Docker build fails — `pnpm install` can't resolve workspace packages
Ensure you are running `docker build` from the **repo root** (not from inside the service directory).  
The Dockerfiles use `COPY package.json pnpm-lock.yaml pnpm-workspace.yaml` which only exist at the root.

### Next.js standalone — `server.js not found` at runtime
The standalone output in a pnpm monorepo places `server.js` at the workspace-relative path.  
If the container fails to start, run `docker run --rm gcr.io/$PROJECT_ID/web-admin:latest find / -name server.js 2>/dev/null` and update the `CMD` in the Dockerfile accordingly.

### Cloud Run — permission denied calling Firestore
Ensure the service account `scr-mesh-sa` has `roles/datastore.user` (Step 0.4).

### Pub/Sub push — 401 Unauthorized
Ensure the Pub/Sub service agent has `roles/iam.serviceAccountTokenCreator` (Step 0.5).

### Firebase Functions deploy — billing not enabled
Cloud Functions 2nd gen requires a Blaze (pay-as-you-go) plan.  
Go to Firebase Console → Usage & Billing → Upgrade to Blaze.

### `firebase deploy` — `functions.secrets` error
Run `firebase functions:secrets:set <SECRET_NAME>` for each secret (Step 1.2).

---

## Cost Estimate (rough)

| Service | Est. monthly cost (low traffic) |
|---|---|
| Cloud Run (5 services, min=0 except 2) | ~$15–30 |
| Firestore | Free tier covers demo; ~$1–5 for moderate use |
| Firebase Functions | Free tier covers demo |
| Pub/Sub | <$1 |
| Secret Manager | <$1 |
| **Total** | **~$20–40/month** |

Set billing alerts in GCP Console → Billing → Budgets & alerts.

---

## File Reference

```
deploy/
  cloud-run/
    web-admin.yaml            Cloud Run service spec
    web-public.yaml           Cloud Run service spec
    gemini-orchestrator.yaml  Cloud Run service spec (min-instances=1)
    ai-detection.yaml         Cloud Run service spec (2 CPU, 2Gi RAM)
    mesh-coordinator.yaml     Cloud Run service spec (min-instances=1)
  pubsub/
    setup.sh                  Creates topics + push subscriptions
  .env.example                Template for all required env vars

apps/web-admin/Dockerfile     Multi-stage Next.js standalone build
apps/web-public/Dockerfile    Multi-stage Next.js standalone build
services/mesh-coordinator/Dockerfile  Fixed pnpm workspace-aware build
firebase.json                 Firestore + Functions + Hosting targets
.firebaserc                   Project aliases (default/production/staging)
```
