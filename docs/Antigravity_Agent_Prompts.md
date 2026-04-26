# SCR-Mesh: Antigravity Agent Prompts

**Project:** Smart Crisis Response Mesh (SCR-Mesh)
**Hackathon:** Google Developers Hackathon 2026
**IDE:** Google Antigravity
**Scope:** Multi-facility (Hospitals, Hotels, Schools, Colleges, Factories) with first-class mesh coordination
**Stack:** Next.js + Firebase + Firestore + Gemini + Google Maps + Cloud Run
**Connectivity Strategy:** Simulated / mocked multi-layer fallback for demo

---

## Core Design Principle: Mesh-First, Not Facility-First

SCR-Mesh is not five separate apps glued together. It is **one unified platform** where every facility — whether a hospital, hotel, school, college, or factory — is a node in a shared community mesh. The cross-entity coordination is the *product*, not a feature.

From Phase 1 onward, every module, data model, and workflow must treat the facility type as a runtime parameter, never as a hard-coded assumption. The same incident engine handles a weapon detection in a school, a fire in a factory, a health emergency in a hotel, and a patient attack in a hospital — and the mesh automatically coordinates response between all of them.

---

## How To Use This Document

These prompts are designed to be pasted **one at a time** into Antigravity's Agent Manager. Each prompt is scoped, self-contained, and produces a verifiable artifact. Work through them in order — each phase builds on the previous one.

**Workflow rhythm:**

1. Open Antigravity, start a new workspace.
2. Switch to **Manager view** for scaffolding prompts, **Editor view** for review and manual tweaks.
3. After each agent run, review the generated Artifacts tab (task list, screenshots, diffs).
4. Commit working code to git **before** running the next prompt — this gives you rollback safety.
5. When a prompt produces incorrect output, revise the prompt with more specificity and re-run.

**Model selection inside Antigravity:**
- Use **Gemini 3.1 Pro** for architecture, planning, and complex refactors.
- Use **Gemini 3 Flash** for quick boilerplate and simple edits (faster, cheaper).
- Use **Claude Sonnet 4.6** when Gemini struggles with nuanced TypeScript or debugging.

---

## Facility Type Matrix

All prompts reference this shared taxonomy. Build it once, use it everywhere.

| Facility | Tiers / Sizes | Example Designations | Most Common Crises |
|---|---|---|---|
| **Hospital** | small / medium / large / multi-specialty | Doctor, Nurse, Ward Boy, Security, Reception, Pharmacist, Admin | Patient attack, mass casualty, fire, medical equipment failure, epidemic outbreak |
| **Hotel** | 3-star / 4-star / 5-star / 7-star | Front Desk, Concierge, Housekeeping, Security, Chef, F&B Manager, GM | Robbery/hijack, fire, food poisoning, guest medical emergency, reputational crisis |
| **School** | primary / secondary / special-needs | Teacher, Principal, Counselor, Security, Nurse, Admin Staff | Intruder/lockdown, fire, bullying incident, medical emergency, natural disaster drill |
| **College** | small / large / residential-campus | Professor, HOD, Security, Warden, Medical Officer, Admin | Campus unrest, lab accident, fire, ragging/mental-health crisis, hostel emergency |
| **Factory** | small / medium / large / hazardous-materials | Operator, Shift Supervisor, Safety Officer, Security, Medical Officer, Plant Head | Chemical spill, equipment failure, fire/explosion, worker injury, sabotage/intrusion |

Every module must scope its UI, roles, and workflows based on `facility.type` and `facility.tier`.

---

## Project Structure (Target)

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

---

# PHASE 0 — Project Initialization

## Prompt 0.1 — Bootstrap Monorepo

```
You are setting up a new monorepo for SCR-Mesh, a multi-facility crisis response platform that supports Hospitals, Hotels, Schools, Colleges, and Factories as first-class entities linked through a community mesh.

Create the following structure at the repository root using pnpm workspaces:
- apps/web-admin (Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui) — serves admins and employees across ALL facility types
- apps/web-public (Next.js 14, minimal) — zero-login web app for common people via QR
- services/ai-detection (Python 3.11, FastAPI) — YOLOv8 anomaly detection
- services/gemini-orchestrator (Node.js + TypeScript) — AI incident triage
- services/mesh-coordinator (Node.js + TypeScript) — cross-entity coordination, the flagship service
- firebase/functions (Node.js 20 + TypeScript)
- shared/types (TypeScript shared package)
- shared/constants (facility taxonomy, designation lists, incident types)
- shared/playbooks (response playbooks keyed by facility.type + incident.type)

Steps:
1. Initialize a pnpm workspace with pnpm-workspace.yaml.
2. Create each app/service with its own package.json or requirements.txt.
3. Add a root README.md explaining the mesh-first philosophy and monorepo structure.
4. Add .gitignore for Node, Python, Next.js, Firebase.
5. Initialize git and make the first commit.

Produce a directory tree diagram as an Artifact.
```

## Prompt 0.2 — Firebase Project Setup

```
Configure Firebase for this monorepo.

Tasks:
1. In firebase/, create firebase.json, .firebaserc, firestore.rules, firestore.indexes.json, storage.rules.
2. Set up firebase/functions with TypeScript (firebase-functions v5).
3. Enable these services in config: Authentication, Firestore, Cloud Functions, Cloud Messaging, Hosting (web-admin and web-public as separate targets), Storage, Pub/Sub via EventArc.
4. In firestore.rules, stub with deny-all; we'll harden in Phase 1.
5. In apps/web-admin and apps/web-public, create a lib/firebase.ts client SDK initializer using env vars.
6. Create .env.example in both apps.
7. Add .env.example for services (PROJECT_ID, GEMINI_API_KEY, TWILIO_* vars).

Produce a Firebase Console checklist Artifact.
```

## Prompt 0.3 — Shared Facility Taxonomy

```
Populate shared/constants with the SCR-Mesh facility taxonomy — this is referenced by every app and service.

Create these files:

1. shared/constants/src/facilityTypes.ts — exports FacilityType ('hospital'|'hotel'|'school'|'college'|'factory') and FacilityTier union type for each.

2. shared/constants/src/designations.ts — exports DESIGNATIONS_BY_FACILITY: Record<FacilityType, string[]> with:
   - hospital: ['Doctor', 'Nurse', 'Ward Boy', 'Security', 'Reception', 'Pharmacist', 'Admin', 'Technician']
   - hotel: ['Front Desk', 'Concierge', 'Housekeeping', 'Security', 'Chef', 'F&B Manager', 'GM', 'Valet']
   - school: ['Teacher', 'Principal', 'Counselor', 'Security', 'Nurse', 'Admin Staff', 'Janitor']
   - college: ['Professor', 'HOD', 'Security', 'Warden', 'Medical Officer', 'Admin', 'Lab Technician']
   - factory: ['Operator', 'Shift Supervisor', 'Safety Officer', 'Security', 'Medical Officer', 'Plant Head', 'Electrician']

3. shared/constants/src/incidentTypes.ts — exports INCIDENT_TYPES_BY_FACILITY: Record<FacilityType, IncidentType[]>:
   - hospital: ['patient_attack', 'mass_casualty', 'fire', 'equipment_failure', 'outbreak', 'medical_emergency', 'intruder']
   - hotel: ['robbery', 'hijack', 'fire', 'food_poisoning', 'guest_medical', 'property_damage', 'intruder']
   - school: ['intruder', 'lockdown', 'fire', 'bullying', 'medical_emergency', 'natural_disaster', 'bomb_threat']
   - college: ['campus_unrest', 'lab_accident', 'fire', 'ragging_or_mental_health', 'hostel_emergency', 'intruder', 'protest']
   - factory: ['chemical_spill', 'equipment_failure', 'fire_explosion', 'worker_injury', 'intrusion', 'gas_leak', 'power_failure']

4. shared/constants/src/severity.ts — exports severity ladder and auto-escalation rules.

5. shared/playbooks/src/ — create one .ts file per facility type (hospital.ts, hotel.ts, school.ts, college.ts, factory.ts), each exporting a map of incidentType → Playbook. A Playbook has: title, primaryRoles[], secondaryRoles[], steps[], expectedResolutionMinutes, meshEvents[] (the cross-entity events this incident should publish).

Example playbook for school.intruder:
{
  title: 'Intruder Lockdown',
  primaryRoles: ['Security', 'Principal'],
  secondaryRoles: ['Teacher', 'Counselor'],
  steps: ['Announce lockdown code', 'Lock all classrooms', 'Account for all students', 'Notify police', 'Instruct staff via app'],
  expectedResolutionMinutes: 15,
  meshEvents: [
    { type: 'PREPARE_TRAUMA_TEAMS', target: 'hospital', radiusKm: 3 },
    { type: 'LOCKDOWN_VICINITY_ALERT', target: 'hotel', radiusKm: 1 },
    { type: 'SHELTER_IN_PLACE', target: 'school', radiusKm: 2 }
  ]
}

Seed playbooks for at least 3 incident types per facility (15 total).

Produce the taxonomy as a nicely formatted Markdown summary Artifact.
```

---

# PHASE 1 — Multi-Facility Core Platform

## Prompt 1.1 — Firestore Data Model (Mesh-Aware)

```
Design the Firestore data model for SCR-Mesh. The model must treat all 5 facility types uniformly and make cross-entity mesh coordination a first-class concept.

Create shared/types/src/models.ts with TypeScript interfaces:

1. facilities/{facilityId}
   - name, type ('hospital'|'hotel'|'school'|'college'|'factory'), tier, address, location (GeoPoint), floorPlans[], designations[], subscribedMeshRadiusKm, meshCapabilities { canPublish: string[], canReceive: string[] }, createdAt
   - IMPORTANT: meshCapabilities defines what mesh event types this facility is willing to publish and what it can receive.

2. users/{userId}
   - email, displayName, phoneNumber, role ('admin'|'employee'|'community'|'common'), designation (facility-specific, e.g., 'Doctor', 'Professor', 'Safety Officer'), facilityIds[], zones[], language ('en'|'hi'|'ta'|'te'|'mr'|'bn'), createdAt
   - A single user can be associated with multiple facilities (e.g., a doctor who consults at a hospital and teaches at a medical college).

3. incidents/{incidentId}
   - facilityId, facilityType (denormalized for query efficiency), type (facility-specific incident type), severity, status, reporterId, reporterRole, location { zone, floor, coordinates }, description, aiSummary, playbookId, assignedStaff[], meshEventsFired[], createdAt, acknowledgedAt, resolvedAt

4. alerts/{alertId}
   - incidentId, facilityId, recipientRole, recipientDesignation, recipientZone, message, messageTranslations { en, hi, ta, te, mr, bn }, acknowledged, deliveredVia, createdAt

5. evacuationRoutes/{routeId}
   - incidentId, facilityId, fromZone, toExit, waypoints[], transportOptions[], generatedAt

6. meshEvents/{eventId} — THE FLAGSHIP COLLECTION
   - sourceFacilityId, sourceFacilityType, sourceIncidentId, eventType (e.g., 'PREPARE_TRAUMA_TEAMS'), payload, targetFacilityTypes[], radiusKm, affectedFacilityIds[], status ('published'|'received'|'acknowledged'|'expired'), publishedAt, expiresAt
   - Represents a crisis signal broadcast from one facility to others in the mesh.

7. meshSubscriptions/{subscriptionId}
   - facilityId, eventTypes[], radiusKm, active
   - Defines which mesh events a facility is subscribed to receive.

8. cameras/{cameraId} — AI detection input
   - facilityId, zone, floor, streamUrl, enabledDetectors[] ('weapon'|'fire'|'crowd'|'ppe_violation'|'smoke'|'chemical_spill_visual'), active

9. zoneCheckIns/{checkInId} — for knowing who is where during a crisis
   - userId, facilityId, zone, checkedInAt, checkedOutAt

Tasks:
1. Write all interfaces in shared/types/src/models.ts.
2. Export from shared/types/src/index.ts.
3. Add Zod schemas in shared/types/src/schemas.ts.
4. Generate Firestore composite indexes for: incidents by facilityId+status, alerts by recipientRole+acknowledged, meshEvents by targetFacilityTypes+status, zoneCheckIns by facilityId+zone. Update firestore.indexes.json.

Produce an Entity Relationship Diagram (Mermaid) as an Artifact — make sure the meshEvents collection is visually central with arrows from every facility type.
```

## Prompt 1.2 — Role-Based Auth + Security Rules (Multi-Facility)

```
Implement role-based authentication for SCR-Mesh with multi-facility awareness.

Tasks:
1. In firebase/functions, create onUserCreate trigger that initializes role='common'.
2. Create callable `setUserRole` — admin-only, scoped to facilityId. An admin of Hospital A cannot grant roles in Hotel B.
3. Build Firebase Auth wrappers in apps/web-admin/lib/auth: signUp, signIn, signOut, useAuth() returning {user, role, designation, facilityIds, currentFacilityId, loading}.
4. Create protected route components: <AdminOnly facilityId={id}>, <EmployeeOrAbove>, <CommunityOrAbove>. Each redirects on role mismatch.
5. Add <FacilitySwitcher /> component in the header for users associated with multiple facilities — swaps the "active" facility context.

6. Write firestore.rules:
   - users: user reads own doc; admin reads/writes users scoped to their facilityIds
   - facilities: read for any authenticated user; write only admin of that facility
   - incidents: read by users who belong to same facilityId; create by any authenticated; update only by employee/admin of that facility
   - alerts: read only by intended recipient; update only by recipient (to acknowledge)
   - evacuationRoutes: read by authenticated; write only Cloud Functions
   - meshEvents: read by admin of any facilityId in affectedFacilityIds OR sourceFacilityId; write only Cloud Functions
   - meshSubscriptions: read/write only admin of that facility
   - cameras: read by employee/admin of that facility; write only admin
   - zoneCheckIns: user writes own; admin of facility reads all for their facility

7. Write 8 security-rules unit tests with @firebase/rules-unit-testing — include tests for cross-facility isolation (an admin of Hospital A must NOT read users of Hotel B).

Produce a test report Artifact with all 8 passing.
```

## Prompt 1.3 — Universal Admin Dashboard

```
Build the Admin dashboard in apps/web-admin — a single unified UI that adapts to the admin's facility type (hospital / hotel / school / college / factory).

Pages:
- / (redirects by role)
- /admin/overview — real-time stats filtered to the active facility: active incidents, staff online, zones covered, incoming mesh events from other facilities
- /admin/incidents — live list with filters (status, severity, facility-specific type, zone)
- /admin/staff — manage users with facility-appropriate designation picker (uses DESIGNATIONS_BY_FACILITY from shared/constants)
- /admin/facility — configure facility info, type, tier, upload floor plans, set mesh capabilities (which events to publish/subscribe)
- /admin/mesh — THE FLAGSHIP PAGE. Shows:
    (a) Mesh Events Inbox — events received from other facilities, with dismiss/acknowledge actions
    (b) Mesh Events Outbox — events this facility has published
    (c) Connected Facilities — a visual map of facilities in the mesh radius with their type icons and live status
    (d) Subscription Settings — which event types to receive, at what radius
- /admin/playbooks — view and customize response playbooks for this facility type
- /admin/analytics — incident history, MTA (mean time to acknowledge), MTR (mean time to resolve), mesh event contribution chart

Requirements:
1. The UI must visually adapt: a hospital admin sees red-cross iconography, a hotel admin sees a gold concierge palette, a school admin sees a friendlier blue/green, a factory admin sees high-contrast industrial yellow/black, a college admin sees academic purple.
2. The facility-type-specific theming should be driven by a shared theme map, not duplicated code.
3. Use shadcn/ui, lucide-react, onSnapshot for real-time.
4. Sidebar navigation, dark mode, responsive down to 1024px.

After building, trigger 3 test incidents across 3 different facility types and capture screenshots showing each theme variant. Attach as Artifacts.
```

## Prompt 1.4 — Universal Employee Module

```
Build the Employee module at /employee/* in apps/web-admin. Mobile-first. Must adapt to the employee's facility type.

Pages:
- /employee/home — incidents in the employee's zones only; shows facility-appropriate icons and labels. A nurse sees 'Patient Attack', a safety officer sees 'Chemical Spill', a teacher sees 'Lockdown'.
- /employee/tasks — dynamically-generated checklist from the matching playbook (shared/playbooks/{facilityType}.ts → incidentType → steps).
- /employee/chat — zone-based group chat.
- /employee/profile — designation, zones, shift, facility.
- /employee/drill — practice mode. Run mock scenarios without triggering real mesh events or SMS.

Critical behaviors:
1. Request Notification permission; register FCM token.
2. Haptic vibration on critical alert.
3. One-thumb quick-acknowledge button.
4. Offline-first Firestore persistence.
5. Playbook engine: when an incident matches, fetch the playbook by `${facilityType}:${incidentType}` key and render the step list with checkboxes. Completed steps sync back to Firestore.
6. Facility-specific language defaults — a school in Tamil Nadu defaults to Tamil; a factory in Maharashtra defaults to Marathi.

Cloud Function `onIncidentCreate`:
- Read the incident's facilityType + type
- Look up the playbook to find primaryRoles + secondaryRoles
- Query users where role='employee' AND facilityIds contains incident.facilityId AND designation in (primaryRoles ∪ secondaryRoles) AND zones contains incident.zone
- Send FCM to those users and create alerts documents

Produce a demo video Artifact showing the SAME employee app rendering correctly for three different facility types with different playbooks.
```

## Prompt 1.5 — Community Member Module (Facility-Aware)

```
Build the Community Member module at /community/* — adapts to the member's facility context.

Semantics across facility types:
- Hospital → patients, their families, resident doctors
- Hotel → registered guests, long-stay residents
- School → students (age-appropriate version), faculty
- College → students (hostel residents especially), faculty
- Factory → contract workers, visiting inspectors, resident staff

Pages:
- /community/home — current facility status banner, facility name + type
- /community/sos — press-and-hold SOS with a modal letting the user pick the incident category from INCIDENT_TYPES_BY_FACILITY for their facility. A school student sees "Bullying / Fire / Medical / Other"; a factory worker sees "Injury / Chemical Spill / Equipment / Other".
- /community/navigate — indoor navigation to the nearest safe exit
- /community/contacts — emergency contacts auto-notified on SOS
- /community/checkin — QR scan to check into a zone

Requirements:
1. SOS button press-and-hold 2s, confirmation screen, vibration feedback.
2. Includes user's last known zone.
3. Auto-notifies emergency contacts via Twilio SMS Cloud Function.
4. Multi-language via next-intl (en, hi, ta, te, mr, bn).
5. PWA with offline SOS capability.
6. Age-appropriate simplification for primary school students (larger icons, fewer words).
7. Facility-specific tips card on the home page — "In a hospital fire, do not use the elevators", "In a factory chemical spill, move upwind", etc.

Produce screenshots of the SOS screen rendered for a patient, a hotel guest, a school student, and a factory worker as Artifacts.
```

## Prompt 1.6 — Common People Module (Zero-Login QR Entry)

```
Build apps/web-public — lightweight zero-login web app for walk-in visitors/bystanders across all 5 facility types.

Entry: QR at the venue entrance encodes https://scr-mesh.app/v/{facilityId}. The URL param loads facility context (name, type, active status, emergency numbers).

Pages:
- / — facility name, type-appropriate safety status banner, SOS button, language selector
- /sos — facility-scoped incident category picker (uses INCIDENT_TYPES_BY_FACILITY)
- /evacuate — if evacuation active, show nearest safe exit + transport options
- /info — facility emergency contacts + nearest police/fire station/hospital

Requirements:
1. No login. Anonymous session ID in localStorage.
2. Sub-2-second load on slow 3G. Lighthouse perf > 90.
3. Auto-detect browser locale, fallback to English.
4. No external fonts.
5. PWA installable after 30s.
6. Facility type aware — a visitor to a factory sees different SOS categories than a visitor to a hotel.
7. When multiple common-people SOS signals arrive at the same facility within 2 minutes, Gemini (Phase 2) auto-escalates severity to critical.

Run Lighthouse on all 5 facility QR flows and attach the scores as Artifacts.
```

## Prompt 1.7 — Seed Multi-Facility Demo Data

```
Create scripts/seed-demo.ts that populates Firestore with realistic demo data covering ALL 5 facility types within a 3km urban zone (Bangalore coordinates).

Seed:
1. Facilities:
   - 'Apollo City Hospital' (hospital, multi-specialty)
   - 'The Grand Marina Hotel' (hotel, 5-star)
   - 'Greenwood International School' (school, secondary)
   - 'IISc Campus East Gate Block' (college, residential)
   - 'TATA Motors Assembly Unit 7' (factory, large)

2. Users: 30 total — 5 admins (one per facility), 15 employees across all facilities with facility-appropriate designations, 7 community members, 3 common.

3. Floor plans: one per facility with 4-6 zones each. Use simple SVG placeholders.

4. Mesh subscriptions: all 5 facilities subscribed to the default event types with 3km radius.

5. 10 historical resolved incidents spread across all 5 facilities, so analytics charts populate.

6. 2 cameras per facility mapped to zones, with enabledDetectors aligned to likely incidents (hospital cameras watch for intruder, weapon; factory cameras watch for fire, chemical_spill_visual, ppe_violation; school cameras watch for intruder, weapon; hotel for robbery/intruder; college for unrest/fire).

Also create scripts/trigger-demo-scenarios.ts with these scripted scenarios:
- Scenario 1: Hospital patient_attack — triggers mesh events to nearby police station + hotel (family accommodation) + other hospitals
- Scenario 2: Hotel robbery — triggers mesh events to nearby hospitals (trauma prep) + school (shelter-in-place) + police
- Scenario 3: School intruder lockdown — triggers mesh events to all facilities within 2km
- Scenario 4: Factory chemical_spill — triggers mesh events to nearby hospitals (chemical exposure protocol) + school (shelter-in-place, HVAC off) + hotel (evacuate rooms facing factory)
- Scenario 5: College lab_accident — triggers mesh events to hospital (burn unit prep) + factory (if nearby, chemical protocol)

Each scenario prints a timeline of events across all affected facilities.

Produce a terminal log of Scenario 4 (factory chemical spill) showing mesh events propagating to the 4 other facility types as an Artifact.
```

---

# PHASE 2 — AI Detection & Intelligence (All Facilities)

## Prompt 2.1 — Gemini Incident Orchestrator

```
Build services/gemini-orchestrator — a Node.js + TypeScript service on Cloud Run.

Flow:
1. Pub/Sub topic `incident.created` fires on new incidents.
2. Fetch the incident + facility + matching playbook from Firestore.
3. Call Gemini 3.1 Pro with a structured prompt that includes facility type, incident type, reporter role, location, description, and the base playbook.
4. Gemini returns JSON: { severity, refinedSummary, multiLanguageSummaries { en, hi, ta, te, mr, bn }, suggestedProtocolDeltas (additions to the base playbook), recommendedRoles, estimatedResponseMinutes, meshEventRecommendations (array of { type, target, radiusKm, reason }) }.
5. Update the incident with aiSummary, severity, and spawn a downstream `incident.critical` publish if severity is critical.
6. Use meshEventRecommendations to inform the mesh-coordinator service (Phase 3 of this document).

System prompt:
"You are the SCR-Mesh crisis triage AI. Given a structured incident report from a hospital, hotel, school, college, or factory, output strictly valid JSON matching the schema. Consider facility type in your reasoning — a fire in a factory with chemical inventory is more severe than a small kitchen fire in a hotel. Generate culturally appropriate and concise translations (max 140 chars). Recommend mesh events only when genuinely warranted to avoid alert fatigue across the community."

Implementation:
- @google/generative-ai SDK, Zod validation, one retry with a stricter prompt.
- Structured logging via Google Cloud Logging.
- /health endpoint for Cloud Run.
- Multi-stage Dockerfile.

Produce 5 sample Gemini responses (one for each facility type) as an Artifact to prove the reasoning adapts correctly.
```

## Prompt 2.2 — YOLOv8 Multi-Facility Detection Service

```
Build services/ai-detection as Python + FastAPI with YOLOv8-based detection tuned per facility type.

Endpoints:
- POST /detect — multipart image + cameraId. Returns { detections, anomalies } filtered by the camera's enabledDetectors.
- POST /detect-stream — websocket stub.
- GET /health

Detectors to support (via ultralytics + HuggingFace):
- weapon (hospitals, hotels, schools, colleges)
- fire/smoke (all facilities)
- crowd_surge (schools, colleges, hospitals, hotels)
- ppe_violation (factories — helmet, vest, goggles compliance check)
- chemical_spill_visual (factories — large liquid puddles or colored spill patches)
- intruder_after_hours (all facilities — person detection outside schedule)

Implementation:
1. Load yolov8n.pt for base person/object detection.
2. Load specialized models as plugins: yolov8-weapons.pt, yolov8-ppe.pt. Use HuggingFace Hub placeholders; document model URLs in README.
3. Smoke/fire: lightweight classifier head on top of frame crops.
4. Chemical spill: color-based segmentation + pooling detection.
5. Crowd surge: person-density threshold per zone region.
6. When a critical anomaly is detected, call Firestore REST to create an incident with facilityType inherited from camera.facilityId lookup.

Demo assets in services/ai-detection/demo-assets/ — one short video per facility type:
- hospital_intruder.mp4
- hotel_robbery.mp4
- school_weapon.mp4
- college_protest_surge.mp4
- factory_ppe_missing.mp4 + factory_chemical_spill.mp4

Create demo.py that runs each video through /detect and prints the detection timeline.

Produce the demo.py output for all 5 facility types as an Artifact.
```

## Prompt 2.3 — Multi-Language Alert Dispatcher

```
Add a Cloud Function `dispatchAlerts` (triggered on new alerts docs) to firebase/functions.

Behavior:
1. Read recipient user's language preference.
2. Select translation from alert.messageTranslations[lang].
3. Dispatch via:
   - FCM push if fcmTokens exist
   - Twilio SMS if severity='critical' and phoneNumber present
   - Fallback write to mesh-relay simulated store
4. Mark alert.deliveredVia with the channel used.
5. Retry up to 3x with exponential backoff.

Also add `escalateStaleIncidents` scheduled every 60s:
- Query incidents where status='active' AND createdAt > 3min ago AND no acknowledgment.
- Promote severity by one level.
- Re-fire dispatchAlerts with the higher-severity recipients (admin gets looped in).
- If severity was already 'critical' and still stale at 5min, auto-publish a mesh event requesting external emergency response.

Write unit tests with firebase-functions-test covering each facility type.

Produce the test output as an Artifact.
```

---

# PHASE 3 — Cross-Entity Mesh (The Core Differentiator)

## Prompt 3.1 — Mesh Coordinator Service

```
Build services/mesh-coordinator as Node.js + TypeScript on Cloud Run. THIS IS THE FLAGSHIP SERVICE.

Purpose: Make facility types cooperate. When ANY facility has a critical incident, relevant nearby facilities of other types receive contextualized coordination events.

Flow:
1. Subscribe to Pub/Sub topic `incident.critical`.
2. Read source facility (type, tier, location) + incident (type, severity).
3. Look up the matching playbook's meshEvents array (e.g., school.intruder → [PREPARE_TRAUMA_TEAMS→hospital, LOCKDOWN_VICINITY_ALERT→hotel, SHELTER_IN_PLACE→school]).
4. Merge with Gemini's meshEventRecommendations from incident.aiSummary for AI-enriched targeting.
5. For each recommended mesh event, query facilities within radiusKm of the source where type ∈ target list AND meshSubscriptions allow this eventType.
6. Write meshEvents documents for each match. Publish `mesh.event.created` to inform target facility admin UIs.
7. Apply rate limits: max 10 outbound mesh events per source facility per hour.

Mesh event taxonomy (baseline — extend in playbooks):
- PREPARE_TRAUMA_TEAMS (hospitals receive when intruder/weapon/explosion nearby)
- PREPARE_FAMILY_ACCOMMODATION (hotels receive when mass casualty at hospital)
- PREPARE_CHEMICAL_EXPOSURE_PROTOCOL (hospitals receive when chemical spill at factory)
- LOCKDOWN_VICINITY_ALERT (hotels/colleges receive when intruder/hijack nearby)
- SHELTER_IN_PLACE (schools/colleges/hotels receive when threat outside)
- EVACUATE_WINDWARD_SIDE (hotels/schools receive when chemical spill at factory)
- PREPARE_BURN_UNIT (hospitals receive when factory/college lab accident)
- SECURE_PERIMETER (factories receive when civil unrest at college/school)
- MEDIA_BLACKOUT_REQUEST (all facilities receive when reputational-crisis event at one facility)

Build an admin UI component <MeshEventsPanel /> for /admin/mesh showing:
- Inbox of received events with dismiss / acknowledge buttons
- Outbox of published events
- Live map visualization of connected facilities in the mesh radius (use @react-google-maps/api) with animated lines showing event propagation

Produce a sequence diagram (Mermaid) showing a factory chemical spill triggering mesh events to a hospital, a school, and a hotel as an Artifact.
```

## Prompt 3.2 — Simulated Multi-Layer Connectivity

```
Create a client-side connectivity simulator in apps/web-admin/lib/connectivity.ts.

Purpose: Visibly demonstrate Wi-Fi → BLE mesh → cellular fallback during the hackathon demo across all facility types.

Features:
1. ConnectivityProvider React context exposing { mode: 'wifi'|'ble-mesh'|'cellular', isOnline, forceMode(mode) }.
2. Dev toolbar at the top with 3 toggles. Clicking simulates that mode.
3. 'wifi' mode: normal Firestore real-time.
4. 'ble-mesh' mode: disable Firestore listeners, poll a local IndexedDB mesh-sim store every 500ms. Alerts badged "via BLE Mesh".
5. 'cellular' mode: Firestore + banner "via Cellular (SMS fallback active)"; every alert also triggers Twilio SMS.
6. Visual connection indicator with an icon per mode in the top bar.

Cloud Function `simulateMeshRelay` writes alerts to a parallel mesh-relay Firestore collection. The BLE-mesh simulated mode reads from there.

Demo script:
- Trigger a critical incident at any facility type.
- Toggle Wi-Fi off.
- Show the alert still reaching the employee via BLE-mesh simulation.
- Toggle cellular — Twilio SMS visible in Firebase emulator logs.
- Repeat across 3 facility types (hospital, factory, school) to prove universality.

Produce a screen recording of this demo as an Artifact.
```

## Prompt 3.3 — Mesh Visualization Dashboard

```
Build a high-impact visualization page at /admin/mesh/live that judges will remember.

Features:
1. Full-screen Google Maps centered on the community (user's facility + mesh radius).
2. Each facility rendered as an animated marker with its type icon. Live pulsing ring when an incident is active at that facility.
3. Every mesh event is drawn as an animated arc from the source facility to each target facility — like a ripple propagating across the community.
4. A side panel shows the live event stream — "Factory TATA → Hospital Apollo: PREPARE_CHEMICAL_EXPOSURE_PROTOCOL".
5. Time scrubber: replay any past mesh-event sequence from history.
6. Heat map overlay toggle showing historical incident density by facility type.

Tech: @react-google-maps/api + Framer Motion for arc animations + Firestore onSnapshot for live event stream.

Build it so that during the hackathon demo, a judge can watch one incident trigger cascading mesh events across 3-4 facility types in real time. This visual is the money shot for the pitch.

Produce a 20-second screen recording of Scenario 4 (factory chemical spill) playing out on the live mesh map as an Artifact.
```

---

# PHASE 4 — Map & Navigation (Community + Indoor)

## Prompt 4.1 — Community Navigation

```
Integrate Google Maps Platform at /map.

Features:
1. Display all registered facilities as markers, color-coded and icon-coded by type:
   - Hospital: red cross
   - Hotel: gold bed
   - School: green graduation cap
   - College: purple book
   - Factory: orange gear
2. Markers pulse red during active critical incidents.
3. Click marker: info card with name, type, tier, live incident status, "Get directions" button.
4. 5km radius circle around facilities with active mesh events.
5. Transit layer toggle with metro + bus.
6. Directions API from user's location to nearest safe facility (by type) with mode toggle (walk, drive, transit).

Dedicated /evacuate page (auto-opens on alert receipt):
- User's location + nearest safe exit within facility (indoor — Prompt 4.2)
- Nearest transit via Google Places: "Metro in 5 min at Station X, 200m west. Bus 34 in 3 min at Stop Y."
- Safe-direction advisory if chemical spill nearby ("Move windward — west").

Produce a screenshot showing markers of all 5 facility types with one pulsing critical as an Artifact.
```

## Prompt 4.2 — Indoor Floor Plan Navigation (Per Facility Type)

```
Build indoor navigation that works for hospital wards, hotel floors, school classrooms, college hostels/blocks, and factory production lines.

Approach:
1. Admins upload floor plans (SVG/PNG) during facility setup.
2. Admin UI provides a zone editor: draw polygon zones on the floor plan, label them with facility-appropriate names (ward/room/classroom/lab/machine-line), and draw connections between adjacent zones.
3. Store as GeoJSON in facility.floorPlans[floor].zones + connections.
4. Pathfinding: Dijkstra on the zone graph, routing around zones flagged as affected by the active incident.
5. User's position = last QR zone check-in. Arrow overlay points to the shortest path out.

Facility-specific nuances:
- Factory: hazardous zones tagged with chemical/fire risk; path planner avoids these even when no incident active.
- Hospital: zones tagged with 'critical care' — restricted during fire (elevators disabled).
- School: age-appropriate visuals; primary schools show cartoon arrows.
- Hotel: suite-to-exit routing with stairwell prioritization during fire.
- College: outdoor paths between hostels/academic blocks included in graph.

Libraries: react-konva OR fabric.js for floor plan canvas. Custom Dijkstra.

Stretch: Web Bluetooth API beacon positioning (Chrome-only).

Produce a screenshot of a factory floor plan with a chemical-spill zone (red) and a routed evacuation path (green) as an Artifact.
```

---

# PHASE 5 — Demo Polish & Pitch

## Prompt 5.1 — Multi-Facility Demo Scenarios

```
Enhance scripts/trigger-demo-scenarios.ts to run 5 cascading scenarios (one per facility-type origin) plus one grand-finale "community cascade" where a factory fire triggers mesh events that in turn trigger secondary responses at hospitals, which then trigger tertiary alerts to hotels (evacuation of upper floors for smoke).

Each scenario should:
- Print a detailed timeline with timestamps and facility origins
- Show mesh events cascading (up to 2 hops)
- Log every user notification sent
- Calculate total response coordination time

The grand-finale scenario should run in under 60 seconds of simulated time and produce an output that is visually stunning when paired with the /admin/mesh/live dashboard.

Produce the full terminal log of the grand-finale scenario as an Artifact.
```

## Prompt 5.2 — Pitch-Ready Landing Page

```
Build apps/web-admin/app/page.tsx — public landing page.

Sections:
1. Hero: "SCR-Mesh: One Network. Every Crisis. Every Facility." Subtitle explains the 5-facility-type mesh. CTAs: "Launch Live Demo", "Scan as Visitor" (opens the QR simulator).
2. The Problem: 5 cards showing today's siloed systems per facility type with red X's between them.
3. The Solution: Animated diagram morphing into a connected mesh between hospital, hotel, school, college, factory icons (Framer Motion).
4. Live Demo: iframe of /admin/mesh/live in auto-play mode.
5. AI Detection: side-by-side showcasing YOLOv8 detecting a weapon (school), a chemical spill (factory), and fire (hospital).
6. Multi-language Alerts: carousel showing the same alert in EN, HI, TA, TE, MR, BN.
7. Mesh Coordination: the Mermaid sequence diagram from Prompt 3.1 rendered as an animated SVG.
8. Tech Stack: Firebase, Gemini, Google Maps, Cloud Run, Antigravity logos.
9. Team: placeholder.

Design: enterprise aesthetic, blue/slate base, red accents. Mobile responsive. Lottie animations for critical flows.

Produce desktop + mobile screenshots as Artifacts.
```

## Prompt 5.3 — Judge Demo Video Script

```
Create docs/demo-script.md — a 3-minute hackathon demo narrative.

Structure:
- 0:00–0:15 — Hook: "In a smart city, crises don't respect facility boundaries. A fire at a factory affects the hospital next door, the school across the street, the hotel on the corner. Today, we're showing the first platform that treats the entire community as one organism."
- 0:15–0:45 — The problem: story narrative of the factory chemical spill cascading chaos across hospitals/schools/hotels with no coordination.
- 0:45–1:45 — The live demo: trigger the grand-finale scenario. Show mesh events propagating on the live map. Show a doctor at the hospital receiving PREPARE_CHEMICAL_EXPOSURE_PROTOCOL in Hindi. Show a teacher at the school receiving SHELTER_IN_PLACE in Tamil. Show a hotel front-desk getting EVACUATE_WINDWARD_SIDE.
- 1:45–2:30 — The AI moment: YOLOv8 catching the spill on factory CCTV, Gemini auto-classifying severity, multilingual alerts dispatching, mesh events firing.
- 2:30–3:00 — The close: "SCR-Mesh: 5 facility types, 1 unified mesh, 6 languages, built on Google Cloud + Gemini + Antigravity." Call to action.

Include:
- Exact screen captures for each beat
- 10 judge Q&A questions with prepared answers
- Fallback backup scenarios in case a service fails mid-demo

Produce the complete script as an Artifact.
```

---

# PHASE 6 — Deployment & Submission

## Prompt 6.1 — Full-Stack Deployment

```
Deploy the whole platform.

Tasks:
1. Deploy apps/web-admin and apps/web-public to Firebase Hosting (separate targets).
2. Deploy firebase/functions.
3. Build and deploy services/gemini-orchestrator, services/ai-detection, services/mesh-coordinator to Cloud Run (min-instances=1 on gemini-orchestrator and mesh-coordinator during judging window; min=0 otherwise for cost).
4. Create Pub/Sub topics: incident.created, incident.critical, mesh.event.created.
5. Wire EventArc subscriptions.
6. Create staging Firebase project scr-mesh-staging; mirror everything.
7. Run `pnpm seed:demo` against staging so judges see a pre-populated 5-facility community.
8. Optional custom domains.
9. Add DEPLOY.md documenting every step.

Smoke tests (post-deploy):
- Landing page loads
- Admin login for each facility type
- Trigger one incident per facility type; verify mesh propagation

Produce final demo URLs + deployment log as Artifacts.
```

## Prompt 6.2 — Hackathon Submission Package

```
Assemble docs/submission/:
1. README.md — problem, solution, mesh-first philosophy, demo URL, video link.
2. ARCHITECTURE.md — 3-plane architecture, mesh flow diagrams.
3. TEAM.md
4. DEMO.md — scenarios + seed data.
5. FUTURE.md — real BLE mesh, 22 Indian languages, government API integration (112-emergency), hardware IoT sensors, additional facility types (airports, malls, stadiums), AR indoor navigation.
6. LIMITATIONS.md — honestly document simulated connectivity, pre-trained model sourcing, judging demo prerequisites.
7. demo-video.mp4 (or YouTube link).
8. One-page executive PDF summary via pdf skill.

Produce the full docs/submission/ tree as an Artifact.
```

---

# Appendix A — Antigravity-Specific Tips

**Parallel agents:** Manager view lets you run independent prompts concurrently. You can run 1.3 (Admin dashboard) + 1.4 (Employee) + 1.5 (Community) simultaneously since they touch different route directories. Do NOT parallelize 0.3 (taxonomy) or 1.1 (data model) — later prompts depend on their output.

**Artifact review:** Always open the Artifacts tab. Look for full task-list completion, accurate screenshots, zero failing tests, and a clean git diff.

**Hallucination recovery:** Paste errors back into the session for self-correction. Switch to Claude Sonnet 4.6 for that prompt if Gemini spirals. Break big prompts in half if both fail.

**Cost control:** Gemini 3 Flash for boilerplate; Gemini 3.1 Pro only for architecture and multi-file refactors.

---

# Appendix B — Knowledge You Need

**Firebase** — Firestore real-time listeners, security rules syntax, Cloud Functions v2 (Firestore/Pub/Sub/HTTPS triggers), FCM token lifecycle.

**Next.js 14 App Router** — Server vs Client components, Server Actions, Route Handlers, Middleware.

**Gemini API** — JSON mode, system instructions, multi-turn, 1M token limit (Pro) / 128K (Flash).

**YOLOv8** — Ultralytics CLI, pre-trained weights, confidence thresholds.

**Google Maps Platform** — JS API, Directions, Places, Transit layer, billing quotas.

**FCM** — Web push HTTPS requirement, service worker setup, token refresh.

**Twilio SMS** — A2P 10DLC for US production; trial works for demo.

**PWA** — Service worker, manifest, offline-first Firestore, install prompt UX.

**Cross-facility data modeling** — Denormalize facilityType onto child documents for query efficiency; avoid joins.

---

# Appendix C — Pitfalls To Avoid

1. **Do not hard-code facility logic.** Everything flows from shared/constants + shared/playbooks. If you find yourself writing `if (facility.type === 'hospital')` in UI code, refactor into a config.
2. **Firestore security rules are non-negotiable.** Cross-facility isolation must be tested.
3. **Gemini JSON output can be malformed.** Zod-validate + one-retry-with-stricter-prompt.
4. **Floor-plan zone editing is a rabbit hole.** Pre-make 5 JSON floor plans (one per facility) rather than building a full polygon editor for the demo.
5. **FCM on iOS needs APNs certs.** Demo on Android/Web.
6. **Cloud Run cold starts kill demos.** Set min-instances=1 on gemini-orchestrator + mesh-coordinator during judging.
7. **Mesh rate-limits matter.** Without them, one flaky sensor spams the whole community.
8. **Test the mesh cascade with a stopwatch.** Judges respond to "under 30 seconds end-to-end across 5 facilities" as a hard KPI.

---

# Appendix D — Stretch Features

- **Real BLE mesh** using Web Bluetooth API.
- **Voice-activated SOS** via Gemini Live audio.
- **Drone integration** for outdoor incident verification.
- **Citizen responders network** — verified local residents opt-in as first-on-scene volunteers.
- **Post-incident AI debrief** — Gemini generates RCA docs.
- **Predictive risk scoring** per zone per facility type using Vertex AI.
- **Additional facility types** — airports, malls, stadiums, convention centers.
- **Cross-city mesh federation** — multiple community meshes linked at the metro level.
- **Government integration** — 112 Emergency Response Support System API, Aarogya Setu, DigiLocker identity verification.

---

**End of Agent Prompts Document**

SCR-Mesh isn't about protecting a single building. It's about wiring an entire urban community together so the next crisis doesn't catch anyone off guard. Build accordingly.
