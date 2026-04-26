# SCR-Mesh — Commands & Links Cheatsheet

---

## Credentials

| What | Value |
|---|---|
| Admin password | `Hush$1415` |
| Admin login page | http://localhost:3000 |
| Bootstrap page (first-time setup) | http://localhost:3000/bootstrap |

---

## One-Time Setup

```bash
# 1. Install pnpm (if not installed)
npm install -g pnpm@9

# 2. Install Firebase CLI (if not installed)
npm install -g firebase-tools

# 3. Install all project dependencies (run from repo root)
pnpm install

# 4. Login to Firebase
firebase login

# 5. Copy env template
cp apps/web-admin/.env.local.example apps/web-admin/.env.local
# Then fill in the Firebase config values inside .env.local
```

---

## Local Development

### Start Firebase Emulators (run this FIRST, in its own terminal)

```bash
firebase emulators:start
```

### Start Web Admin (new terminal)

```bash
pnpm dev:admin
```

### Start Web Public (new terminal)

```bash
pnpm dev:public
```

### Start Backend Services (only needed for full mesh testing)

```bash
# Gemini Orchestrator — new terminal
cd services/gemini-orchestrator
PORT=3002 pnpm dev

# Mesh Coordinator — new terminal
cd services/mesh-coordinator
PORT=3003 pnpm dev

# AI Detection (Python) — new terminal
cd services/ai-detection
PORT=3004 uvicorn main:app --host 0.0.0.0 --port 3004 --reload
```

---

## All Localhost URLs

| Service | URL |
|---|---|
| **Web Admin** | http://localhost:3000 |
| **Web Public** | http://localhost:3001 |
| **Firebase Emulator UI** | http://localhost:4000 |
| Firestore Emulator | http://localhost:8080 |
| Auth Emulator | http://localhost:9099 |
| Functions Emulator | http://localhost:5001 |
| Gemini Orchestrator (local) | http://localhost:3002 |
| Mesh Coordinator (local) | http://localhost:3003 |
| AI Detection (local) | http://localhost:3004 |

### Key App Pages

| Page | URL |
|---|---|
| Login | http://localhost:3000 |
| Bootstrap (seed data + create profile) | http://localhost:3000/bootstrap |
| Admin Dashboard | http://localhost:3000/admin |
| Admin Overview | http://localhost:3000/admin/overview |
| Incidents | http://localhost:3000/admin/incidents |
| Mesh Live Map | http://localhost:3000/admin/mesh/live |
| Community Home | http://localhost:3000/community/home |
| Community Map | http://localhost:3000/community/navigate |
| Community SOS | http://localhost:3000/community/sos |
| Evacuation Map | http://localhost:3000/map |
| Employee Portal | http://localhost:3000/employee |

### Health Check Endpoints (local)

| Service | URL |
|---|---|
| Gemini Orchestrator | http://localhost:3002/health |
| Mesh Coordinator | http://localhost:3003/health |
| AI Detection | http://localhost:3004/health |

---

## Bootstrap Sequence (First Time)

Run this every time the emulator is restarted (emulator data resets on restart):

1. Open http://localhost:3000 → log in with your account
2. Go to http://localhost:3000/bootstrap
3. Click **"1. Inject Demo Mesh Data"** — waits until it says "Success"
4. Click **"2. Bind Profile & Enter Admin"** — redirects to `/admin`

---

## Seed & Demo Scripts

```bash
# Seed demo data into Firebase (production/staging)
pnpm seed:demo

# Trigger demo scenarios
pnpm demo:scenarios

# Trigger finale scenario
pnpm demo:finale
```

---

## Build Commands

```bash
# Build everything (all packages + apps + services)
pnpm build

# Build only web-admin
pnpm --filter web-admin build

# Build only web-public
pnpm --filter web-public build

# Build shared packages (run before building apps)
pnpm --filter @scr-mesh/types build
pnpm --filter @scr-mesh/constants build
pnpm --filter @scr-mesh/playbooks build

# Build Firebase Functions
pnpm --filter firebase-functions-scr-mesh build

# Build Gemini Orchestrator
pnpm --filter @scr-mesh/gemini-orchestrator build

# Build Mesh Coordinator
pnpm --filter mesh-coordinator build
```

---

## Firebase Commands

```bash
# Login
firebase login

# Switch to production project
firebase use production

# Switch to staging project
firebase use staging

# Switch to local dev project
firebase use default

# Deploy everything (rules + functions + hosting)
firebase deploy

# Deploy only Firestore rules + indexes
firebase deploy --only firestore

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# Start emulators (local dev)
firebase emulators:start

# Start emulators and keep data between restarts
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data

# View function logs
firebase functions:log

# Set a secret (e.g. Twilio)
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_PHONE_NUMBER
```

---

## Docker & Cloud Run Commands

```bash
# Build and push web-admin image (fill in PROJECT_ID)
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=... \
  -f apps/web-admin/Dockerfile \
  -t gcr.io/PROJECT_ID/web-admin:latest .

docker push gcr.io/PROJECT_ID/web-admin:latest

# Deploy Cloud Run service from YAML
gcloud run services replace deploy/cloud-run/web-admin.yaml \
  --region=us-central1 --project=PROJECT_ID

# Get a Cloud Run service URL
gcloud run services describe web-admin \
  --region=us-central1 --project=PROJECT_ID \
  --format="value(status.url)"

# View Cloud Run logs
gcloud run services logs tail web-admin --region=us-central1

# Set up Pub/Sub topics + subscriptions
export PROJECT_ID=your-project-id
bash deploy/pubsub/setup.sh
```

---

## Tests

```bash
# Run mesh-coordinator unit tests
pnpm --filter mesh-coordinator test

# Run Firebase function tests
cd firebase/functions && pnpm test
```

---

## Troubleshooting

```bash
# Clear pnpm cache and reinstall
pnpm store prune
pnpm install

# Kill all local dev servers (Mac/Linux)
kill $(lsof -t -i:3000,3001,3002,3003,3004,4000,5001,8080,9099)

# Reset emulator data (wipe Firestore, Auth, etc.)
rm -rf emulator-data
firebase emulators:start

# Check which process is using a port (Windows)
netstat -ano | findstr :3000

# Check which process is using a port (Mac/Linux)
lsof -i :3000
```
