import type { FacilityType, UserRole } from '@scr-mesh/types';
export interface PlaybookStep {
    id: string;
    /** Human-readable instruction. */
    action: string;
    /** Who is supposed to act. */
    targetRole: UserRole;
    /** Optional zone restriction; empty = facility-wide. */
    targetZone?: string;
    /** Suggested time-to-action in seconds (used by analytics + drills). */
    ttaSeconds: number;
    /** Whether failing this step should auto-fire a mesh event. */
    meshEventOnFail?: string;
}
/** A mesh event rule attached to a playbook. The mesh-coordinator reads the
 *  `meshEvents` array on the matching playbook and fans out one outbound
 *  meshEvent per rule whose target facilities are within radiusKm. */
export interface PlaybookMeshEvent {
    /** Canonical event type — UPPER_SNAKE_CASE, see Phase 3.1 taxonomy. */
    eventType: string;
    /** Facility types that should receive this event. */
    targetFacilityTypes: FacilityType[];
    /** Geographic radius from the source facility (km). */
    radiusKm: number;
    /** Auto-expire after this many minutes. */
    ttlMinutes: number;
    /** Free-form payload hints baked into the event for the receiving UI. */
    payloadHints?: Record<string, string | number>;
}
export interface Playbook {
    id: string;
    facilityType: FacilityType;
    incidentType: string;
    title: string;
    steps: PlaybookStep[];
    /** Cross-entity coordination — fired by mesh-coordinator on critical
     *  incidents matching this playbook. Empty/undefined = no outbound events. */
    meshEvents?: PlaybookMeshEvent[];
}
export declare const PLAYBOOKS: Record<string, Playbook>;
export declare function playbooksForFacility(facilityType: FacilityType): Playbook[];
