"use strict";
// @scr-mesh/playbooks
// Default response playbooks. Keyed as `${facilityType}:${incidentType}`.
// A playbook is an ordered list of steps; each step targets a role + zone
// and carries a default time-to-action used by /admin/analytics.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAYBOOKS = void 0;
exports.playbooksForFacility = playbooksForFacility;
const HOSPITAL_CODE_BLUE = {
    id: 'hospital:code_blue',
    facilityType: 'hospital',
    incidentType: 'code_blue',
    title: 'Code Blue — Cardiac Arrest',
    steps: [
        { id: 'cb-1', action: 'Page on-call physician + nurse to scene', targetRole: 'employee', ttaSeconds: 30 },
        { id: 'cb-2', action: 'Bring crash cart to zone', targetRole: 'employee', ttaSeconds: 60 },
        { id: 'cb-3', action: 'Clear corridor for response team', targetRole: 'employee', ttaSeconds: 90 },
        { id: 'cb-4', action: 'Notify family liaison', targetRole: 'admin', ttaSeconds: 300 },
    ],
};
const HOSPITAL_CODE_RED = {
    id: 'hospital:code_red',
    facilityType: 'hospital',
    incidentType: 'code_red',
    title: 'Code Red — Fire',
    steps: [
        { id: 'cr-1', action: 'Pull fire alarm + confirm zone', targetRole: 'employee', ttaSeconds: 15 },
        { id: 'cr-2', action: 'Evacuate ambulatory patients first', targetRole: 'employee', ttaSeconds: 120 },
        { id: 'cr-3', action: 'Publish EVACUATE_DOWNWIND mesh event', targetRole: 'admin', ttaSeconds: 60, meshEventOnFail: 'EVACUATE_DOWNWIND' },
        { id: 'cr-4', action: 'Stage triage at primary muster point', targetRole: 'employee', ttaSeconds: 300 },
    ],
    meshEvents: [
        { eventType: 'EVACUATE_WINDWARD_SIDE', targetFacilityTypes: ['hotel', 'school', 'college'], radiusKm: 1, ttlMinutes: 60 },
        { eventType: 'PREPARE_FAMILY_ACCOMMODATION', targetFacilityTypes: ['hotel'], radiusKm: 3, ttlMinutes: 120 },
    ],
};
const HOTEL_FIRE = {
    id: 'hotel:fire',
    facilityType: 'hotel',
    incidentType: 'fire',
    title: 'Fire — Hotel',
    steps: [
        { id: 'hf-1', action: 'Confirm + isolate affected floor', targetRole: 'employee', ttaSeconds: 30 },
        { id: 'hf-2', action: 'PA system: announce evacuation in guest languages', targetRole: 'employee', ttaSeconds: 45 },
        { id: 'hf-3', action: 'Publish PREPARE_TRAUMA_TEAMS to nearby hospitals', targetRole: 'admin', ttaSeconds: 60, meshEventOnFail: 'PREPARE_TRAUMA_TEAMS' },
        { id: 'hf-4', action: 'Account for all guests at muster point', targetRole: 'employee', ttaSeconds: 600 },
    ],
    meshEvents: [
        { eventType: 'PREPARE_TRAUMA_TEAMS', targetFacilityTypes: ['hospital'], radiusKm: 5, ttlMinutes: 120 },
        { eventType: 'PREPARE_BURN_UNIT', targetFacilityTypes: ['hospital'], radiusKm: 5, ttlMinutes: 120 },
    ],
};
const SCHOOL_LOCKDOWN = {
    id: 'school:lockdown',
    facilityType: 'school',
    incidentType: 'lockdown',
    title: 'Lockdown — Active Threat',
    steps: [
        { id: 'sl-1', action: 'Trigger lockdown alarm + lock classroom doors', targetRole: 'employee', ttaSeconds: 15 },
        { id: 'sl-2', action: 'Publish LOCKDOWN_NEARBY mesh event', targetRole: 'admin', ttaSeconds: 30, meshEventOnFail: 'LOCKDOWN_NEARBY' },
        { id: 'sl-3', action: 'Account for all students by classroom', targetRole: 'employee', ttaSeconds: 180 },
        { id: 'sl-4', action: 'Notify parents via mass-message channel', targetRole: 'admin', ttaSeconds: 300 },
    ],
    meshEvents: [
        { eventType: 'PREPARE_TRAUMA_TEAMS', targetFacilityTypes: ['hospital'], radiusKm: 3, ttlMinutes: 120 },
        { eventType: 'LOCKDOWN_VICINITY_ALERT', targetFacilityTypes: ['hotel', 'college', 'school', 'factory'], radiusKm: 1, ttlMinutes: 60 },
        { eventType: 'SHELTER_IN_PLACE', targetFacilityTypes: ['school', 'college'], radiusKm: 2, ttlMinutes: 90 },
    ],
};
const COLLEGE_LOCKDOWN = {
    id: 'college:lockdown',
    facilityType: 'college',
    incidentType: 'lockdown',
    title: 'Lockdown — College',
    steps: [
        { id: 'cl-1', action: 'Trigger campus-wide lockdown alarm', targetRole: 'employee', ttaSeconds: 30 },
        { id: 'cl-2', action: 'Publish LOCKDOWN_NEARBY mesh event', targetRole: 'admin', ttaSeconds: 60, meshEventOnFail: 'LOCKDOWN_NEARBY' },
        { id: 'cl-3', action: 'Hostel wardens secure all blocks', targetRole: 'employee', ttaSeconds: 180 },
        { id: 'cl-4', action: 'Mass-SMS students with status updates', targetRole: 'admin', ttaSeconds: 300 },
    ],
    meshEvents: [
        { eventType: 'LOCKDOWN_VICINITY_ALERT', targetFacilityTypes: ['hotel', 'school', 'college', 'factory'], radiusKm: 1.5, ttlMinutes: 90 },
        { eventType: 'PREPARE_TRAUMA_TEAMS', targetFacilityTypes: ['hospital'], radiusKm: 3, ttlMinutes: 120 },
        { eventType: 'SECURE_PERIMETER', targetFacilityTypes: ['factory'], radiusKm: 2, ttlMinutes: 60 },
    ],
};
const FACTORY_CHEM_SPILL = {
    id: 'factory:chemical_spill',
    facilityType: 'factory',
    incidentType: 'chemical_spill',
    title: 'Chemical Spill',
    steps: [
        { id: 'fc-1', action: 'Sound chemical alarm + isolate area', targetRole: 'employee', ttaSeconds: 30 },
        { id: 'fc-2', action: 'Don PPE + deploy spill kit', targetRole: 'employee', ttaSeconds: 90 },
        { id: 'fc-3', action: 'Publish EVACUATE_DOWNWIND mesh event', targetRole: 'admin', ttaSeconds: 60, meshEventOnFail: 'EVACUATE_DOWNWIND' },
        { id: 'fc-4', action: 'Notify environmental authority', targetRole: 'admin', ttaSeconds: 600 },
    ],
    meshEvents: [
        { eventType: 'PREPARE_CHEMICAL_EXPOSURE_PROTOCOL', targetFacilityTypes: ['hospital'], radiusKm: 5, ttlMinutes: 180 },
        { eventType: 'EVACUATE_WINDWARD_SIDE', targetFacilityTypes: ['hotel', 'school', 'college'], radiusKm: 3, ttlMinutes: 180 },
        { eventType: 'SHELTER_IN_PLACE', targetFacilityTypes: ['school', 'hotel'], radiusKm: 2, ttlMinutes: 120 },
    ],
};
exports.PLAYBOOKS = {
    [HOSPITAL_CODE_BLUE.id]: HOSPITAL_CODE_BLUE,
    [HOSPITAL_CODE_RED.id]: HOSPITAL_CODE_RED,
    [HOTEL_FIRE.id]: HOTEL_FIRE,
    [SCHOOL_LOCKDOWN.id]: SCHOOL_LOCKDOWN,
    [COLLEGE_LOCKDOWN.id]: COLLEGE_LOCKDOWN,
    [FACTORY_CHEM_SPILL.id]: FACTORY_CHEM_SPILL,
};
function playbooksForFacility(facilityType) {
    return Object.values(exports.PLAYBOOKS).filter((p) => p.facilityType === facilityType);
}
