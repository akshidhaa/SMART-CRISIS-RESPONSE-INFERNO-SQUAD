# SCR-Mesh — Project Memory

**Purpose of this file:** Drop this into Claude Projects (or any LLM context) so every future conversation starts with full awareness of the project's identity, decisions, stack, and state. Keep it up to date as the project evolves.

---

## 1. Project Identity

- **Name:** Smart Crisis Response Mesh (**SCR-Mesh**)
- **Context:** Google Developers Hackathon 2026
- **Owner:** Saikalyan (gsaikalyan2@gmail.com)
- **IDE:** Google Antigravity (agentic AI IDE built on VS Code, launched Jan 2026, uses Gemini 3.1 Pro / 3 Flash + Claude Sonnet/Opus 4.6 + GPT-OSS)
- **Local path:** `C:\Users\saika\Downloads\scr-mesh`

---

## 2. Problem Statement

Urban communities (hospitals, hotels, schools, colleges, factories) face unpredictable crises — patient attacks, fires, hotel hijacks, intruder threats, chemical spills, lockdowns. Today's systems are siloed: hospitals have notifications, hotels rely on CCTV, schools depend on manual drills, factories have SCADA alarms. No unified, intelligent platform detects threats early, alerts stakeholders instantly, and coordinates a response across multiple facility types in the same community.

## 3. Objective

Design a robust solution that instantly detects, reports, and synchronizes crisis response efforts across a **decentralized multi-facility ecosystem** — eliminating fragmented communication by creating a reliable bridge between distressed individuals, active personnel, and emergency services. Critically: facilities **collaborate** with each other during a crisis (e.g., a factory chemical spill preps the nearby hospital's trauma team, shelters the school, and evacuates the hotel's windward floors).

## 4. Core Design Principle — Mesh-First

SCR-Mesh is **not** five separate apps glued together. It is **one unified platform** where every facility is a node in a shared community mesh. Cross-entity coordination is the *product*, not a feature. Every module, data model, and workflow treats facility type as a runtime parameter — never as a hard-coded assumption.

---

## 5. Facility Types (All First-Class)

| Facility | Tiers | Example Designations | Common Crises |
|---|---|---|---|
| Hospital | small / medium / large / multi-specialty | Doctor, Nurse, Ward Boy, Security, Reception, Pharmacist, Admin, Technician | Patient attack, mass casualty, fire, equipment failure, outbreak, intruder |
| Hotel | 3-star / 4-star / 5-star / 7-star | Front Desk, Concierge, Housekeeping, Security, Chef, F&B Manager, GM, Valet | Robbery, hijack, fire, food poisoning, guest medical, property damage |
| School | primary / secondary / special-needs | Teacher, Principal, Counselor, Security, Nurse, Admin Staff, Janitor | Intruder, lockdown, fire, bullying, medical, natural disaster, bomb threat |
| College | small / large / residential-campus | Professor, HOD, Security, Warden, Medical Officer, Admin, Lab Technician | Campus unrest, lab accident, fire, ragging/mental-health, hostel emergency |
| Factory | small / medium / large / hazardous | Operator, Shift Supervisor, Safety Officer, Security, Medical Officer, Plant Head | Chemical spill, equipment failure, fire/explosion, worker injury, gas leak |

## 6. Four User Modules (All Facility-Agnostic)

1. **Admin** — Facility directors, security heads, IT. Dashboards, rule config, staff management, audit logs, cross-entity mesh controls.
2. **Employee** — Staff with facility-specific designations. Zone-scoped alerts, playbook checklists, intra-team chat, drill mode.
3. **Community Member** — Registered patients, guests, students, faculty, contractors. Verified identity, SOS button, indoor nav, emergency contact auto-notification, QR check-in.
4. **Common People** — Walk-in visitors via QR code at entrance. Zero-login PWA, anonymous SOS, multi-language evacuation guidance, transport info.

---

## 7. Confirmed Decisions

- ✅ **Stack:** Google-heavy — Next.js 14 + Firebase + Firestore + Gemini 3.1 Pro + Google Maps + Cloud Run + Twilio SMS fallback.
- ✅ **Connectivity strategy:** Simulated / mocked multi-layer fallback (Wi-Fi → BLE mesh → cellular) for the hackathon demo; real BLE mesh is stretch only.
- ✅ **Scope:** All 5 facility types treated equally; mesh coordination is a Phase 1 concept, not a later add-on.
- ✅ **First deliverable:** Antigravity Agent Prompts document (completed).
- ✅ **Languages supported:** EN, HI, TA, TE, MR, BN (English, Hindi, Tamil, Telugu, Marathi, Bengali).
- ✅ **Novel contribution:** Unified mesh across facility types + tiered coverage + multi-layer connectivity fallback + transport integration into crisis alerts.

## 8. Architecture — Three Planes

**Plane 1 — Edge / Detection (per facility)**
AI cameras (YOLOv8 for weapons, fire, crowd, PPE, chemical spills), IoT sensors, local edge gateway with Bluetooth mesh + Wi-Fi that functions even if internet drops.

**Plane 2 — Facility Coordination (per entity)**
Local dashboard, staff mobile app, evacuation logic. Role-scoped views for Admin, Employee, Community Member, Common Person. Facility-specific workflows driven by shared playbooks.

**Plane 3 — Community Mesh (cross-entity)** — **THE DIFFERENTIATOR**
Federated cloud layer where facilities publish anonymized incident signals. Example mesh events:
- `PREPARE_TRAUMA_TEAMS` → hospitals receive when intruder/weapon/explosion nearby
- `PREPARE_FAMILY_ACCOMMODATION` → hotels receive when mass casualty at hospital
- `PREPARE_CHEMICAL_EXPOSURE_PROTOCOL` → hospitals receive when chemical spill at factory
- `LOCKDOWN_VICINITY_ALERT` → hotels/colleges receive when intruder/hijack nearby
- `SHELTER_IN_PLACE` → schools/colleges/hotels receive when threat outside
- `EVACUATE_WINDWARD_SIDE` → hotels/schools receive when chemical spill at factory
- `PREPARE_BURN_UNIT` → hospitals receive when factory/college lab accident
- `SECURE_PERIMETER` → factories receive when civil unrest at college/school

## 9. Tech Stack Detail

- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui + Framer Motion
- **Mobile:** Flutter (optional Phase 6)
- **Backend:** Firebase Auth + Firestore + Cloud Functions v2 + FCM + Hosting + Storage
- **AI Orchestration:** Gemini 3.1 Pro (triage, multi-language alerts, playbook deltas, mesh event recommendations)
- **Visual AI:** YOLOv8 (weapon, fire/smoke, crowd, PPE, chemical spill, intruder detection)
- **Compute:** Google Cloud Run for Python + Node services
- **Messaging:** FCM push + Twilio SMS fallback for critical
- **Eventing:** Pub/Sub + EventArc (topics: `incident.created`, `incident.critical`, `mesh.event.created`)
- **Maps:** Google Maps JS API + Directions + Places + Transit Layer
- **Indoor Nav:** Custom SVG floor plan editor + Dijkstra pathfinding + QR zone check-ins
- **State:** Firestore real-time listeners + offline persistence

## 10. Project Folder Structure

```
scr-mesh/
├── apps/
│   ├── web-admin/           Next.js dashboard (Admin + Employee + Community)
│   ├── web-public/          Zero-login PWA (Common People via QR)
│   └── mobile/              Flutter (optional Phase 6)
├── services/
│   ├── ai-detection/        Python + FastAPI + YOLOv8 (Cloud Run)
│   ├── gemini-orchestrator/ Node + Gemini AI triage (Cloud Run)
│   └── mesh-coordinator/    FLAGSHIP — cross-entity pub-sub (Cloud Run)
├── firebase/
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── functions/           Cloud Functions v2
├── shared/
│   ├── types/               TypeScript models + Zod schemas
│   ├── constants/           Facility taxonomy, designations, incident types
│   └── playbooks/           Response playbooks per (facilityType, incidentType)
├── docs/
│   └── Antigravity_Agent_Prompts.md
└── README.md
```

## 11. Firestore Data Model Summary

- `facilities/{id}` — type, tier, location, floor plans, mesh capabilities
- `users/{id}` — role, designation, facilityIds[], zones[], language
- `incidents/{id}` — facilityId, facilityType, type, severity, status, location, AI summary, playbookId, mesh events fired
- `alerts/{id}` — incidentId, recipient role/designation/zone, multi-language translations, delivery channel
- `evacuationRoutes/{id}` — waypoints + transport options
- `meshEvents/{id}` — **flagship collection** — source, target types, radius, status
- `meshSubscriptions/{id}` — per-facility event subscriptions
- `cameras/{id}` — facility zone + enabled detectors
- `zoneCheckIns/{id}` — knowing who is where during a crisis

## 12. Build Phases

- **Phase 0:** Monorepo bootstrap + Firebase setup + Shared facility taxonomy + playbooks
- **Phase 1:** Multi-facility core — data model, RBAC, Admin / Employee / Community / Common modules, seed data for 5 facility types
- **Phase 2:** AI — Gemini incident orchestrator, YOLOv8 detection, multi-language alert dispatcher
- **Phase 3:** Mesh Coordinator service + simulated multi-layer connectivity + live mesh visualization dashboard
- **Phase 4:** Google Maps community nav + indoor floor plan routing (facility-specific nuances)
- **Phase 5:** Demo scenarios (5 per-facility + 1 grand-finale community cascade) + landing page + judge demo script
- **Phase 6:** Deployment (Firebase Hosting + Cloud Run) + hackathon submission package

## 13. Demo Scenarios Designed

1. Hospital patient_attack → mesh to police + hotel (family) + other hospitals
2. Hotel robbery → mesh to hospitals (trauma) + school (shelter-in-place) + police
3. School intruder lockdown → mesh to all facilities within 2km
4. Factory chemical_spill → mesh to hospitals (chemical protocol) + school (shelter + HVAC off) + hotel (evacuate windward)
5. College lab_accident → mesh to hospital (burn unit) + factory (if chemical nearby)
6. Grand finale: Factory fire → cascading mesh across all 4 other facility types in <60s

## 14. Key Files Already Generated

- `PROJECT_MEMORY.md` (this file) — drop into Claude Projects
- `docs/Antigravity_Agent_Prompts.md` — phase-by-phase agent prompt playbook (all 6 phases + 4 appendices)
- `README.md`, `package.json`, `pnpm-workspace.yaml`, `.gitignore`
- `firebase/firestore.rules` (deny-all stub) + `firestore.indexes.json`
- Populated `README.md` in every subfolder (self-documenting)
- `setup.sh` (bash) + `setup.ps1` (PowerShell) — re-scaffold anywhere

## 15. Known Pitfalls / Trade-offs

- BLE mesh is **simulated** for the hackathon — real implementation is post-hackathon.
- YOLOv8 weapon + PPE models sourced from HuggingFace (pre-trained placeholders).
- iOS FCM push needs APNs certs — demo on Android/Web during judging.
- Cloud Run cold starts kill live demos — set min-instances=1 on gemini-orchestrator and mesh-coordinator during the judging window.
- Firestore security rules are non-negotiable; cross-facility isolation tests are mandatory.

## 16. Next Immediate Actions

1. `git init` inside `C:\Users\saika\Downloads\scr-mesh`
2. Open folder in **Google Antigravity**
3. Open `docs/Antigravity_Agent_Prompts.md` in a side panel
4. Switch to **Manager view**
5. Paste **Prompt 0.1** to start monorepo bootstrap
6. Commit after every successful prompt before running the next

## 17. Stretch Features (If Ahead)

- Real Web Bluetooth BLE mesh (Chrome-only)
- Voice-activated SOS via Gemini Live audio streaming
- Drone integration for outdoor incident verification
- Citizen responders volunteer network
- Post-incident AI root-cause debrief via Gemini
- Vertex AI predictive risk scoring per zone
- Additional facility types: airports, malls, stadiums
- Cross-city mesh federation at metro level
- Government integration: 112 ERSS API, Aarogya Setu, DigiLocker

## 18. Pitch Positioning (For Judges)

- **Hook:** "Crises don't respect facility boundaries. A fire at a factory affects the hospital next door, the school across the street, the hotel on the corner. SCR-Mesh treats the entire community as one organism."
- **Money shot:** Live mesh visualization dashboard showing animated arcs of mesh events cascading between facility icons on a Google Map in real time.
- **Technical bragging rights:** Built entirely on Google Cloud + Gemini 3.1 Pro + Antigravity (meta-appropriate for a Google hackathon).
- **Hard KPI to cite:** Under 30 seconds end-to-end coordination across 5 facility types on the grand-finale scenario.

---

**End of Project Memory**

*Last updated: April 15, 2026. Update this file whenever a major decision changes, a phase completes, or a new constraint emerges.*
