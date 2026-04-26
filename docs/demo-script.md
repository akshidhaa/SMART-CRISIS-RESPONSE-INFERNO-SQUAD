# SCR-Mesh — 3-Minute Hackathon Demo Script

**Event:** Google Developers Hackathon 2026  
**Track:** Smart City / Community Safety  
**Presenter:** [Your name]  
**Demo URL:** http://localhost:3000 (or deployed URL)  
**Pre-flight checklist:** See §6 before going on stage

---

## Pre-Demo Setup (10 min before)

Run these in separate terminals before you walk on stage:

```bash
# Terminal 1 — Next.js frontend
pnpm dev:admin
# → http://localhost:3000

# Terminal 2 — Firebase emulators
firebase emulators:start --only firestore,auth,functions

# Terminal 3 — Seed demo data (run once)
pnpm seed:demo
```

Browser tabs to open in order:
1. `http://localhost:3000` — landing page (start here)
2. `http://localhost:3000/login` — admin login
3. `http://localhost:3000/admin/mesh/live` — live mesh (the money shot)
4. `http://localhost:3000/admin/overview` — incident overview
5. `http://localhost:3000/employee/home` — employee app (on phone / second window)

Log in as admin user for `apex_manufacturing` (factory) in Tab 2 before the demo starts.  
Keep Tab 3 (`/admin/mesh/live`) ready — this is the centrepiece.

---

## ── BEAT 1: Hook (0:00 – 0:15) ──────────────────────────────────────────────

### What to show

> **Screen:** `http://localhost:3000` — the landing page hero section.  
> The animated mesh diagram is slowly connecting the 5 facility nodes.  
> The headline reads: *"One Network. Every Crisis. Every Facility."*

### What to say (verbatim)

> *"In a smart city, crises don't respect facility boundaries.  
> A fire at a factory affects the hospital next door, the school across the street, the hotel on the corner.  
> Today, we're showing the first platform that treats the entire community as one organism —  
> SCR-Mesh."*

### Presenter action

- Point to the animated SVG on screen as each node lights up.
- Pause one beat after "one organism" — let the mesh animation complete.
- Do NOT click anything yet. The hero speaks for itself.

---

## ── BEAT 2: The Problem (0:15 – 0:45) ──────────────────────────────────────

### What to show

> **Screen:** Scroll slowly down to the **"Five facilities. Five silos."** section.  
> Five cards appear: Hospital ✗, Hotel ✗, School ✗, College ✗, Factory ✗.  
> Each card shows a red ✗ with "No connection" underneath.

### What to say (verbatim)

> *"Picture this — it's a Tuesday afternoon. At Apex Manufacturing, a solvent tank ruptures.  
> Chlorine gas starts forming a plume moving north-east at 18 kilometres per hour.*
>
> *The factory's emergency team knows. But does the school 600 metres downwind know to seal its windows?  
> Does the hospital 2 kilometres away know to stage decontamination at the ER forecourt?  
> Does the hotel know to evacuate the rooms on its north-east face?*
>
> *Today, none of them do. They're all islands. Five separate apps, five separate alarm systems,  
> zero coordination. In the 8 minutes it takes the hospital to find out, 23 workers have already arrived  
> at the ER with no decon protocol in place.*
>
> *That's the problem. And it happens every time."*

### Presenter action

- Speak slowly through the story — this is the emotional hook.
- As you say each facility name, gesture toward that card on screen.
- Pause after "That's the problem." — let silence land.

---

## ── BEAT 3: The Live Demo (0:45 – 1:45) ─────────────────────────────────────

### 0:45 — Navigate to Live Mesh Map

> **Screen:** Click to Tab 3 → `http://localhost:3000/admin/mesh/live`  
> The full-screen Google Map loads. Five facility markers are visible —  
> hospital (red), hotel (amber), school (blue), college (purple), factory (yellow).  
> The event stream panel is empty. The scrubber shows no events yet.

### What to say

> *"This is the SCR-Mesh live coordination dashboard.  
> Five facilities, visible right now on a shared map.  
> Watch what happens when the factory fires."*

---

### 0:55 — Trigger the Grand Finale Cascade

> **Screen:** Click the red **"Run demo cascade"** button in the top-right of the live mesh header.  
> The button turns to a spinner: *"Running cascade…"*  
> A progress bar begins moving across the sub-header strip.

### What to say

> *"I'm triggering the community cascade — a factory fire that propagates through 3 hops  
> across all 5 facilities in under 60 seconds."*

---

### 1:00 – 1:15 — Arcs appear (Hop 0→1)

> **Screen:** After ~4 seconds, the first arc fires from the factory marker to the hospital marker —  
> a yellow animated line curving across the map.  
> The event stream panel on the right reads:  
> `[T+4s] PREPARE_BURN_UNIT — Apex Manufacturing → City General Hospital`
>
> Seconds later, three more arcs appear simultaneously:  
> Factory → School (blue arc), Factory → College (purple arc), Factory → Hotel (amber arc).
>
> The progress strip reads: `HOP 0→1 — Factory → Hospital: PREPARE_BURN_UNIT · 12 notifs`

### What to say

> *"Four arcs. Hop zero to one. The factory has automatically broadcast to every relevant facility  
> within 5 kilometres — the hospital is told to prepare a burn unit,  
> the school is told to shelter in place, the college to evacuate downwind,  
> and the hotel to clear its north-east-facing rooms.*
>
> *In the real world, that notification takes 8 minutes of phone calls.  
> Here — 4 seconds."*

---

### 1:15 – 1:30 — Hospital activates, Hop 1→2 fires

> **Screen:** At ~16 seconds, a pulsing red ring appears on the hospital marker.  
> Two new arcs fire from the hospital: hospital → hotel, hospital → college + school.  
> Event stream now shows:  
> `[T+20s] PREPARE_FAMILY_ACCOMMODATION — City General Hospital → Grand Horizon Hotel`  
> `[T+23s] BLOOD_DONATION_NEEDED — City General → State University + Lincoln High`
>
> Progress strip: `HOP 1→2 · 2 events · 288 notifs · 20.1s`

### What to say

> *"The hospital just received the burn unit alert. It has now activated its mass casualty protocol  
> and published its own mesh events — secondary cascade, hop one to two.*
>
> *The hotel is being told to reserve ground-floor rooms for 23 patient families.  
> The college and school are getting an urgent blood donation request — O-negative, 40 units  
> needed in 2 hours.*
>
> *The mesh is now running 2 hops deep. Entirely automated. No phone calls."*

---

### 1:30 – 1:45 — Hotel joins, Hop 2→3 completes

> **Screen:** At ~28 seconds, a pulsing amber ring appears on the hotel marker.  
> A third wave of arcs fires from the hotel to the factory, school, and college.  
> Event stream: `[T+30s] TRAFFIC_DIVERSION — Grand Horizon Hotel → Apex + Lincoln High + State University`
>
> The progress strip turns green: `✅ Cascade complete · 7 events · 3 hops · 881 notifs · 55.1s`

### What to say

> *"And now the hotel has joined the mesh — it detected smoke ingress on its upper floors  
> and is broadcasting a traffic diversion: Main Street is closed, route via Riverside Drive.*
>
> *7 mesh events. 3 hops. 881 users notified — workers, doctors, teachers, students, hotel guests.  
> All 5 facilities, coordinated. In 55 seconds.*
>
> *Under one minute. From ignition to full community response."*

---

## ── BEAT 4: The AI Moment (1:45 – 2:30) ────────────────────────────────────

### 1:45 — Switch to the employee view (Hindi / Tamil)

> **Screen:** Open a new tab or phone mirror → `http://localhost:3000/employee/home`  
> Log in as the hospital employee (doctor, language: Hindi).  
> The notification banner at the top reads (in Hindi):  
> *"गंभीर: एपेक्स फैक्ट्री में रासायनिक रिसाव। डीकॉन्टामिनेशन स्टेशन ER के बाहर तैयार करें।"*

### What to say

> *"Let me show you what the doctor at City General just received on her phone.  
> She set her language preference to Hindi when she registered.*
>
> *Gemini translated the alert in under 2 seconds — culturally appropriate, under 140 characters,  
> ready for push notification and SMS.*
>
> *Meanwhile, 600 metres away at Lincoln High…"*

---

### 2:00 — Tamil teacher receives shelter alert

> **Screen:** Switch to the school employee account (language: Tamil).  
> Notification reads:  
> *"அவசரம்: அனைத்து மாணவர்களையும் வகுப்பறைகளில் தங்க வையுங்கள். HVAC மூடுங்கள்."*  
> The task checklist shows Playbook steps pre-populated:  
> ✓ Announce shelter-in-place code · ☐ Seal HVAC · ☐ Account for students · ☐ Notify parents

### What to say

> *"The teacher at Lincoln High received her shelter-in-place alert — in Tamil.  
> And the playbook engine has already loaded the response steps, pulled from our shared playbook  
> library for a school + chemical spill event.*
>
> *She just needs to tick the boxes. No manual lookup. No confusion."*

---

### 2:10 — Gemini AI classification (overlay or description)

> **Screen:** Return to `/admin/overview` or `/admin/incidents`.  
> The incident created by the cascade shows:  
> `Type: fire · Severity: CRITICAL · AI Summary: "Electrical fire spreading rapidly..."`  
> The `aiSummary` field is populated: *"Electrical fire on Floor 1 spread to Floor 2. Chemical Store at risk.  
> Estimated 8 burn casualties. Recommend staging burn ICU + decon."*

### What to say

> *"Every incident flows through Gemini 1.5 Pro. It reads the incident type, facility type,  
> zone, and description — then returns severity classification, a refined summary,  
> translations in all 6 languages, and mesh event recommendations.*
>
> *Our mesh coordinator uses those recommendations to decide which facilities to notify  
> and with which event types. The AI is the brain. The mesh is the nervous system."*

---

## ── BEAT 5: The Close (2:30 – 3:00) ─────────────────────────────────────────

### What to show

> **Screen:** Return to `http://localhost:3000` — the landing page.  
> The animated terminal in the "Grand Finale" section is still auto-typing the cascade steps.  
> Scroll slowly to the Tech Stack section.

### What to say

> *"SCR-Mesh isn't a hospital app with extra features.  
> It's not a factory safety tool with a map.*
>
> *It is a community mesh — one platform that connects every type of facility  
> through a shared intelligence layer, so the next crisis doesn't catch anyone off guard.*
>
> *5 facility types. 1 unified mesh. 6 languages.  
> Built on Google Cloud, Gemini, Google Maps Platform, Cloud Run,  
> Firebase, and Next.js 14.*
>
> *We believe every urban community deserves infrastructure like this.  
> And we built it — in this hackathon.*
>
> *Thank you."*

### Presenter action

- Pause for 2 full seconds after "Thank you."
- Keep the landing page on screen — don't close the browser.
- Smile. Breathe. Wait for applause before taking questions.

---

## ── §5: Screen Capture Reference ──────────────────────────────────────────────

| Time | URL | What judges see |
|------|-----|-----------------|
| 0:00 | `/` | Animated mesh hero, 5 facility nodes connecting |
| 0:20 | `/` | Problem section — 5 siloed cards, red ✗ |
| 0:45 | `/admin/mesh/live` | Live map, 5 facility markers, empty event stream |
| 0:55 | `/admin/mesh/live` | "Run demo cascade" button clicked, spinner |
| 1:00 | `/admin/mesh/live` | First 4 arcs: factory → hospital/school/college/hotel |
| 1:15 | `/admin/mesh/live` | Hop 1→2: hospital arcs fire, red ring on hospital |
| 1:30 | `/admin/mesh/live` | Hop 2→3: hotel arcs fire, cascade complete banner |
| 1:45 | `/employee/home` (HI) | Hindi push notification, PREPARE_CHEMICAL_EXPOSURE_PROTOCOL |
| 2:00 | `/employee/home` (TA) | Tamil push notification + playbook checklist |
| 2:10 | `/admin/incidents` | AI summary card, severity=CRITICAL, meshEventsFired |
| 2:30 | `/` | Landing page terminal + tech stack |

---

## ── §6: Pre-Flight Checklist ───────────────────────────────────────────────

Run through this 10 minutes before the pitch:

- [ ] `pnpm dev:admin` running, `localhost:3000` loads without error
- [ ] Firebase emulators running (Firestore + Functions)
- [ ] `pnpm seed:demo` completed — 5 facilities visible on `/admin/mesh/live`
- [ ] Admin login works for `apex_manufacturing` (factory) account
- [ ] `/admin/mesh/live` shows all 5 markers on the map
- [ ] Google Maps API key is set in `.env.local` and the map loads
- [ ] "Run demo cascade" button visible in live mesh header
- [ ] Second browser window logged in as hospital employee (language: Hindi)
- [ ] Third browser window logged in as school employee (language: Tamil)
- [ ] Screen recording software ready (OBS / Loom) in case of need
- [ ] Phone mirroring ready for mobile employee demo
- [ ] Backup video ready (see §8)
- [ ] Slides closed — demo is entirely in-browser

---

## ── §7: Judge Q&A — 10 Questions with Prepared Answers ────────────────────

### Q1: How does the mesh know which facility to notify?

> **Answer:** Each facility has a `meshCapabilities` document in Firestore that lists the event types it can publish and receive, and a `subscribedMeshRadiusKm`. When an incident fires, the Mesh Coordinator service queries all facilities within that radius whose `canReceive` list includes the event type. The playbook for that facility+incident combo also recommends a default target list. Gemini's AI output layer adds further refinements based on wind direction, chemical type, and severity. So the decision is a three-way intersection: geography, subscription, and AI recommendation.

---

### Q2: What happens if the internet goes down — does the mesh still work?

> **Answer:** We've built a three-layer connectivity simulation: Wi-Fi → BLE Mesh → Cellular. In BLE-mesh mode, alerts are written to a local IndexedDB store and a Cloud Function `simulateMeshRelay` simultaneously. Employee devices poll that relay every 500ms. In cellular fallback, Twilio SMS is triggered for every critical alert regardless of app connectivity. You can toggle these modes from the dev toolbar in the app right now. The design mirrors how real BLE mesh networks like Thread or Zigbee would work — we've simulated the protocol, not the radio.

---

### Q3: Is the YOLOv8 AI actually running in real-time?

> **Answer:** The AI detection service (`services/ai-detection`) is a real FastAPI + Python service running YOLOv8n as the base model, with specialized detection heads for weapon, PPE violation, fire/smoke, and chemical spill visual. It exposes a `/detect` endpoint that accepts image frames. In the demo, the seed script mimics a camera feed triggering it. For a production deployment, you'd point your RTSP camera stream at the service. The model weights are in the repo; no external API call is needed for inference.

---

### Q4: How do you prevent alert fatigue across the mesh?

> **Answer:** Three mechanisms. First, rate limiting in the Mesh Coordinator: max 10 outbound mesh events per source facility per hour. Second, Gemini's system prompt explicitly says "recommend mesh events only when genuinely warranted to avoid alert fatigue." Third, facility admins can configure their `meshCapabilities.canReceive` list — if a factory doesn't want to receive blood donation appeals, they remove `BLOOD_DONATION_NEEDED` from their subscription. The mesh respects that.

---

### Q5: How does indoor navigation know where a person is?

> **Answer:** For the demo, location comes from the last QR zone check-in. When an employee scans the QR code at their zone entrance, we write a `zoneCheckIns` document. The `/evacuate` page reads that to know where you are, then runs Dijkstra on the pre-built zone graph to find the shortest path to the nearest exit — routing around any zones flagged as incident-affected or chemically hazardous. As a stretch feature, we've noted Web Bluetooth beacon positioning — that would replace QR-based location with continuous BLE tracking.

---

### Q6: Why 6 languages specifically?

> **Answer:** EN, HI, TA, TE, MR, BN cover approximately 85% of India's urban population. We chose them because the 5 facility types we support — factories, hospitals, schools, colleges, hotels — cluster in tier-1 and tier-2 Indian cities where these languages dominate. Gemini handles the translation in a single API call with a max-140-character constraint so the output fits inside an SMS and a push notification at the same time. The language preference is set per-user at registration. Adding more languages is a one-line change to the `Language` type.

---

### Q7: Can a facility opt out of the mesh entirely?

> **Answer:** Yes. Setting `meshCapabilities.canReceive = []` means no incoming events reach that facility. Setting `meshCapabilities.canPublish = []` means it never broadcasts. The admin configures this in `/admin/facility` under "Mesh capabilities" — each event type has a Publish and Receive toggle. This matters for situations like a hospital that doesn't want to receive construction-related traffic diversions from a nearby factory renovation.

---

### Q8: What is the actual deployment cost at scale?

> **Answer:** At hackathon scale — 5 facilities, 50 concurrent users — the Firebase free tier covers everything. At city scale — say 200 facilities, 10,000 concurrent users — the main cost drivers are: Firestore reads ($0.06/100K), Cloud Run compute (gemini-orchestrator + mesh-coordinator at min-1 instances, ~$15/month each), Gemini API calls (~$0.003/incident enrichment), and Twilio SMS ($0.0075/message for critical alerts only). Total estimated: under $200/month for a medium-sized urban cluster. The mesh architecture scales horizontally — each Cloud Run service is stateless.

---

### Q9: How does this scale to 100 facilities?

> **Answer:** The Mesh Coordinator is stateless and runs on Cloud Run — it scales to 0 when idle and spins up instances under load automatically. Firestore handles millions of documents with sub-50ms reads. The main bottleneck is the mesh event fan-out: if 100 facilities are within radius of a source, the coordinator writes 100 meshEvent documents. The rate limit cap of 10 events/hour/source prevents runaway cascades. For very dense meshes, we'd add a priority queue in front of the coordinator using Cloud Tasks to smooth burst traffic.

---

### Q10: What would you build next if you had 6 more months?

> **Answer:** Four things. First, real BLE mesh using Web Bluetooth API — so the network is self-healing and internet-independent. Second, 22 official Indian languages via Google Translate API, not just the 6 we have now. Third, government API integration — the 112 Emergency Response Support System so mesh alerts can automatically page police/fire/ambulance. Fourth, additional facility types: airports, malls, stadiums, metro stations — anywhere crowds gather is a mesh node waiting to be connected. The architecture already supports them; it's purely a data model extension.

---

## ── §8: Fallback Scenarios ───────────────────────────────────────────────────

### Fallback A: Firebase emulators fail to start

**Symptom:** `localhost:3000` shows auth errors or blank Firestore data.

**Recovery:**
1. Point the app at the production Firebase project — set `NEXT_PUBLIC_USE_EMULATOR=false` in `.env.local` and restart `pnpm dev:admin`.
2. Log in with the pre-seeded cloud account credentials.
3. Tell judges: *"We have a cloud deployment — this is actually more production-realistic."*

---

### Fallback B: Google Maps doesn't load (API key issue / rate limit)

**Symptom:** Grey map tile on `/admin/mesh/live` or `/map`.

**Recovery:**
1. Switch to the pre-recorded screen capture of the cascade (OBS recording from a test run).
2. Navigate to `/admin/mesh` (the non-map Mesh Events Inbox/Outbox view) — this is fully functional without Maps.
3. Tell judges: *"The live map requires a Maps API key — let me show you the event stream directly."*

---

### Fallback C: "Run demo cascade" button produces no arcs

**Symptom:** Cascade progress bar runs but no arcs appear on the map.

**Root cause:** Likely a Firestore permission issue or missing facility documents.

**Recovery:**
1. Open a second terminal and run: `pnpm demo:finale` — the terminal-based cascade writes directly to Firestore.
2. The event stream panel on the right of the live mesh page will still update in real-time from the terminal run.
3. Tell judges: *"The terminal version gives you the full timeline — let me show you the data flowing."*

---

### Fallback D: Gemini AI alerts aren't showing multilingual text

**Symptom:** Alert cards show English only / `aiSummary` is empty.

**Root cause:** Gemini API key not set or rate-limited.

**Recovery:**
1. Navigate to the landing page (`/`) — the `AlertCarousel` component cycles through all 6 pre-written translations with animation. Use this as the multilingual demo.
2. Tell judges: *"In staging, Gemini generates these in real-time. I've pre-loaded the 6 translations here so you can see the quality."*

---

### Fallback E: Seed data is missing (blank map / no facilities)

**Symptom:** Live mesh map shows no markers.

**Recovery:**
1. Run `pnpm seed:demo` from any terminal — takes ~15 seconds.
2. Refresh the browser tab.
3. If still blank, navigate to `/bootstrap` in the app — click "Inject Demo Mesh Data" — same result, browser-based.

---

### Fallback F: Demo runs long (> 3 minutes)

**Recovery plan:** Cut Beat 4 (the AI Moment) entirely.

Revised flow:
- 0:00–0:15: Hook (unchanged)
- 0:15–0:35: Problem (shortened — just say the factory spill story in 20s)
- 0:35–1:50: Live Demo (spend all remaining time on the cascade arcs)
- 1:50–2:00: The close (just the tagline + "Thank you")

The cascade is the product. If time is short, that's all you need to show.

---

## ── §9: Timing Reference Card ──────────────────────────────────────────────

Print this and keep it on the podium:

```
00:00  Hero — "One Network. Every Crisis."
00:15  Problem — Factory spill story
00:45  Live Mesh Map open
00:55  Click "Run demo cascade"
01:00  Arcs fire — Hop 0→1
01:15  Hospital activates — Hop 1→2
01:30  Hotel joins — Hop 2→3 ✅
01:45  Employee app — Hindi doctor
02:00  Employee app — Tamil teacher + playbook
02:10  Admin incidents — AI summary
02:30  Landing page — tech stack
02:45  Closing tagline
03:00  "Thank you."
```

---

## ── §10: Closing Tagline (memorise this) ──────────────────────────────────

> *"SCR-Mesh: 5 facility types, 1 unified mesh, 6 languages —*  
> *built on Google Cloud, Gemini, and Google Maps Platform.*  
> *Because in a smart city, no crisis should be anyone's problem alone."*

---

*Document generated for the SCR-Mesh hackathon submission.*  
*Keep this file out of the public repo — it contains demo credentials context.*
