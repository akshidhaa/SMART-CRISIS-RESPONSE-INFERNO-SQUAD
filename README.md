# SCR-Mesh

**Smart Crisis Response Mesh** — a unified, multi-facility crisis response platform that wires Hospitals, Hotels, Schools, Colleges, and Factories into one intelligent community mesh.

## Core Philosophy

SCR-Mesh is not five separate apps glued together. It's one unified platform where every facility is a node in a shared community mesh. Cross-entity coordination is the *product*, not a feature.

## Monorepo Structure

```
scr-mesh/
├── apps/
│   ├── web-admin/              # Admin + Employee dashboards (all facility types)
│   ├── web-public/             # Lightweight web app for common people (QR entry)
│   └── mobile/                 # Flutter app (optional Phase 6)
├── services/
│   ├── ai-detection/           # Python + YOLOv8 + OpenCV (Cloud Run)
│   ├── gemini-orchestrator/    # Incident classification & multilingual alerts
│   └── mesh-coordinator/       # Cross-entity pub-sub — THE CORE SERVICE
├── firebase/
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── functions/              # Cloud Functions
├── shared/
│   ├── types/                  # Shared TypeScript types & facility taxonomy
│   ├── constants/              # Designation lists, incident types per facility
│   └── playbooks/              # Response playbooks per facility+incident combo
├── docs/
└── README.md
```

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Firebase (Auth, Firestore, Cloud Functions, FCM, Hosting, Storage)
- **AI:** Gemini 3.1 Pro (orchestration) + YOLOv8 (visual detection)
- **Maps:** Google Maps Platform + Places + Directions APIs
- **Compute:** Google Cloud Run for Python and Node services
- **Messaging:** Firebase Cloud Messaging + Twilio SMS fallback
- **Eventing:** Pub/Sub + EventArc for mesh coordination

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 (Firebase Functions runtime targets Node 20 specifically)
- **pnpm** 9 — `npm install -g pnpm@9`
- **Python** 3.11 (for `services/ai-detection` only) — see `services/ai-detection/.python-version`

### Install

```bash
pnpm install
```

This resolves all `workspace:*` cross-references between the three `@scr-mesh/*` shared packages (`types`, `constants`, `playbooks`), the two Next.js apps, the two Node services, and the Firebase Functions package.

### Run the apps

```bash
pnpm dev:admin          # web-admin  →  http://localhost:3000
pnpm dev:public         # web-public →  http://localhost:3001
```

### Build / lint the whole monorepo

```bash
pnpm build              # pnpm -r build   — builds every workspace package
pnpm lint               # pnpm -r lint    — lints every workspace package
```

### Python AI-detection service (not a pnpm workspace member)

```bash
cd services/ai-detection
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Agent-driven phased build

Open this folder in **Google Antigravity** and run the prompts in `docs/Antigravity_Agent_Prompts.md` starting from Phase 0 to fill in feature code for each scaffolded package.

## License

TBD
