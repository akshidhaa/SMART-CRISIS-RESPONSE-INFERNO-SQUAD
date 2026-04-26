# firebase/functions

Cloud Functions v2 (Node.js 20 + TypeScript).

Triggers:
- `onUserCreate` — initialize role='common' (Prompt 1.2)
- `onIncidentCreate` — fan out alerts based on playbook roles (Prompt 1.4)
- `dispatchAlerts` — FCM + Twilio SMS + mesh-relay fallback (Prompt 2.3)
- `escalateStaleIncidents` — scheduled escalation (Prompt 2.3)
- `simulateMeshRelay` — BLE mesh fallback simulation (Prompt 3.2)

Callable:
- `setUserRole` (admin-only, facility-scoped)
- `dismissMeshEvent`
