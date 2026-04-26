# shared/playbooks

Response playbooks keyed by `${facilityType}:${incidentType}`.

Each playbook contains:

- `title`
- `primaryRoles[]` and `secondaryRoles[]` — drive staff notification
- `steps[]` — checklist rendered in the employee app
- `expectedResolutionMinutes` — SLA for escalation
- `meshEvents[]` — cross-entity coordination events this incident should publish (type, target facility, radiusKm)

## Files (one per facility type)

- `hospital.ts`
- `hotel.ts`
- `school.ts`
- `college.ts`
- `factory.ts`

Seeded from **Prompt 0.3** with at least 3 incident types each (15+ playbooks total).
