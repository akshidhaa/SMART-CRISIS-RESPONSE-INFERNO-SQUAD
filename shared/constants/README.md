# shared/constants

Facility-type taxonomy: designations, incident types, severity ladders.

## Exports

- `FacilityType` — 'hospital' | 'hotel' | 'school' | 'college' | 'factory'
- `DESIGNATIONS_BY_FACILITY` — designation lists per facility type
- `INCIDENT_TYPES_BY_FACILITY` — incident catalog per facility type
- Severity escalation rules

Built by **Prompt 0.3**.

Everything downstream (auth, dashboards, playbook resolution, Gemini prompts, YOLO detector routing) reads from this single source of truth. Do not hard-code facility logic elsewhere.
