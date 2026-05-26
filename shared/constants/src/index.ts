// @scr-mesh/constants
// Facility-keyed data tables that drive dropdowns, theming, and filters.
// Anything that needs to "vary by facility type" lives here, in one place.

import type { FacilityType, UserRole } from '@scr-mesh/types';

export const FACILITY_TYPES = ['hospital', 'hotel', 'school', 'college', 'factory'] as const;

// ---------------------------------------------------------------------------
// Designations — staff job titles a facility admin can assign to a user.
// `role` is the minimum role the designation implies in our hierarchy.
// ---------------------------------------------------------------------------

export interface DesignationOption {
  id: string;
  label: string;
  role: UserRole;
}

export const DESIGNATIONS_BY_FACILITY: Record<FacilityType, DesignationOption[]> = {
  hospital: [
    { id: 'doctor', label: 'Doctor', role: 'employee' },
    { id: 'nurse', label: 'Nurse', role: 'employee' },
    { id: 'paramedic', label: 'Paramedic', role: 'employee' },
    { id: 'security', label: 'Security', role: 'employee' },
    { id: 'admin_staff', label: 'Hospital Admin', role: 'admin' },
    { id: 'visitor', label: 'Visitor', role: 'common' },
  ],
  hotel: [
    { id: 'front_desk', label: 'Front Desk', role: 'employee' },
    { id: 'housekeeping', label: 'Housekeeping', role: 'employee' },
    { id: 'security', label: 'Security', role: 'employee' },
    { id: 'manager', label: 'Manager', role: 'admin' },
    { id: 'guest', label: 'Guest', role: 'common' },
  ],
  school: [
    { id: 'teacher', label: 'Teacher', role: 'employee' },
    { id: 'principal', label: 'Principal', role: 'admin' },
    { id: 'counselor', label: 'Counselor', role: 'employee' },
    { id: 'security', label: 'Security', role: 'employee' },
    { id: 'parent', label: 'Parent', role: 'community' },
    { id: 'student', label: 'Student', role: 'common' },
  ],
  college: [
    { id: 'professor', label: 'Professor', role: 'employee' },
    { id: 'dean', label: 'Dean', role: 'admin' },
    { id: 'warden', label: 'Hostel Warden', role: 'employee' },
    { id: 'security', label: 'Security', role: 'employee' },
    { id: 'student', label: 'Student', role: 'common' },
  ],
  factory: [
    { id: 'safety_officer', label: 'Safety Officer', role: 'employee' },
    { id: 'supervisor', label: 'Floor Supervisor', role: 'employee' },
    { id: 'plant_manager', label: 'Plant Manager', role: 'admin' },
    { id: 'operator', label: 'Operator', role: 'employee' },
    { id: 'visitor', label: 'Visitor', role: 'common' },
  ],
};

// ---------------------------------------------------------------------------
// Incident types — what kinds of incidents each facility can report.
// `defaultSeverity` seeds the form; admins can override per incident.
// ---------------------------------------------------------------------------

export interface IncidentTypeOption {
  value: string;
  label: string;
  defaultSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export const INCIDENT_TYPES_BY_FACILITY: Record<FacilityType, IncidentTypeOption[]> = {
  hospital: [
    { value: 'code_blue', label: 'Code Blue (cardiac arrest)', defaultSeverity: 'critical' },
    { value: 'code_red', label: 'Code Red (fire)', defaultSeverity: 'high' },
    { value: 'code_pink', label: 'Code Pink (infant abduction)', defaultSeverity: 'critical' },
    { value: 'mass_casualty', label: 'Mass Casualty Incoming', defaultSeverity: 'critical' },
    { value: 'violent_patient', label: 'Violent Patient', defaultSeverity: 'high' },
    { value: 'biohazard_spill', label: 'Biohazard Spill', defaultSeverity: 'high' },
  ],
  hotel: [
    { value: 'fire', label: 'Fire', defaultSeverity: 'critical' },
    { value: 'medical_guest', label: 'Guest Medical Emergency', defaultSeverity: 'high' },
    { value: 'intruder', label: 'Intruder / Trespasser', defaultSeverity: 'high' },
    { value: 'gas_leak', label: 'Gas Leak', defaultSeverity: 'critical' },
    { value: 'flood', label: 'Flood / Water Damage', defaultSeverity: 'medium' },
    { value: 'evacuation_drill', label: 'Evacuation Drill', defaultSeverity: 'low' },
  ],
  school: [
    { value: 'lockdown', label: 'Lockdown (active threat)', defaultSeverity: 'critical' },
    { value: 'fire', label: 'Fire', defaultSeverity: 'high' },
    { value: 'medical_student', label: 'Student Medical Emergency', defaultSeverity: 'high' },
    { value: 'fight', label: 'Fight / Altercation', defaultSeverity: 'medium' },
    { value: 'missing_child', label: 'Missing Child', defaultSeverity: 'critical' },
    { value: 'bomb_threat', label: 'Bomb Threat', defaultSeverity: 'critical' },
  ],
  college: [
    { value: 'lockdown', label: 'Lockdown', defaultSeverity: 'critical' },
    { value: 'protest', label: 'Protest / Unrest', defaultSeverity: 'medium' },
    { value: 'fire', label: 'Fire', defaultSeverity: 'high' },
    { value: 'medical_student', label: 'Student Medical Emergency', defaultSeverity: 'high' },
    { value: 'hostel_violence', label: 'Hostel Violence', defaultSeverity: 'high' },
    { value: 'sexual_harassment', label: 'Harassment Report', defaultSeverity: 'high' },
  ],
  factory: [
    { value: 'chemical_spill', label: 'Chemical Spill', defaultSeverity: 'critical' },
    { value: 'machine_injury', label: 'Machine Injury', defaultSeverity: 'high' },
    { value: 'fire', label: 'Fire', defaultSeverity: 'critical' },
    { value: 'gas_leak', label: 'Gas Leak', defaultSeverity: 'critical' },
    { value: 'ppe_violation', label: 'PPE Violation', defaultSeverity: 'low' },
    { value: 'electrical_hazard', label: 'Electrical Hazard', defaultSeverity: 'high' },
  ],
};

// ---------------------------------------------------------------------------
// Mesh event taxonomy — the cross-facility event types our coordinator
// orchestrates. Both publishers and subscribers reference these IDs.
// ---------------------------------------------------------------------------

export interface MeshEventTypeOption {
  value: string;
  label: string;
  description: string;
  /** Facility types that typically *publish* this event. */
  typicalSources: FacilityType[];
  /** Facility types that typically *subscribe* to this event. */
  typicalTargets: FacilityType[];
}

export const MESH_EVENT_TYPES: MeshEventTypeOption[] = [
  {
    value: 'PREPARE_TRAUMA_TEAMS',
    label: 'Prepare Trauma Teams',
    description: 'Mass casualty event nearby — hospitals stand up trauma capacity.',
    typicalSources: ['hotel', 'school', 'college', 'factory'],
    typicalTargets: ['hospital'],
  },
  {
    value: 'EVACUATE_DOWNWIND',
    label: 'Evacuate Downwind',
    description: 'Chemical / smoke release — facilities downwind initiate evacuation.',
    typicalSources: ['factory', 'hospital'],
    typicalTargets: ['hospital', 'hotel', 'school', 'college', 'factory'],
  },
  {
    value: 'LOCKDOWN_NEARBY',
    label: 'Lockdown Nearby',
    description: 'Active threat — surrounding facilities go into lockdown.',
    typicalSources: ['school', 'college'],
    typicalTargets: ['school', 'college', 'hospital', 'hotel'],
  },
  {
    value: 'SHELTER_REQUEST',
    label: 'Shelter Request',
    description: 'Displaced occupants need shelter — hotels/schools open doors.',
    typicalSources: ['hospital', 'factory'],
    typicalTargets: ['hotel', 'school', 'college'],
  },
  {
    value: 'TRAFFIC_DIVERSION',
    label: 'Traffic Diversion',
    description: 'Notify neighbors that incoming/outgoing roads are blocked.',
    typicalSources: ['hospital', 'factory', 'school'],
    typicalTargets: ['hospital', 'hotel', 'school', 'college', 'factory'],
  },
  {
    value: 'BLOOD_DONATION_NEEDED',
    label: 'Blood Donation Needed',
    description: 'Hospital running low on blood type — community alert.',
    typicalSources: ['hospital'],
    typicalTargets: ['hotel', 'school', 'college', 'factory'],
  },
  // Phase 3.1 taxonomy ----------------------------------------------------
  {
    value: 'PREPARE_FAMILY_ACCOMMODATION',
    label: 'Prepare Family Accommodation',
    description: 'Mass casualty at hospital — hotels reserve family rooms.',
    typicalSources: ['hospital'],
    typicalTargets: ['hotel'],
  },
  {
    value: 'PREPARE_CHEMICAL_EXPOSURE_PROTOCOL',
    label: 'Prepare Chemical Exposure Protocol',
    description: 'Chemical spill nearby — hospitals stage decontamination + ER.',
    typicalSources: ['factory'],
    typicalTargets: ['hospital'],
  },
  {
    value: 'LOCKDOWN_VICINITY_ALERT',
    label: 'Lockdown Vicinity Alert',
    description: 'Active threat — neighbors restrict entry/exit.',
    typicalSources: ['school', 'college'],
    typicalTargets: ['hotel', 'school', 'college', 'factory'],
  },
  {
    value: 'SHELTER_IN_PLACE',
    label: 'Shelter In Place',
    description: 'External threat — schools/hotels keep occupants inside.',
    typicalSources: ['school', 'college', 'factory'],
    typicalTargets: ['school', 'college', 'hotel'],
  },
  {
    value: 'EVACUATE_WINDWARD_SIDE',
    label: 'Evacuate Windward Side',
    description: 'Chemical release nearby — evacuate rooms on the windward face.',
    typicalSources: ['factory', 'hospital'],
    typicalTargets: ['hotel', 'school', 'college'],
  },
  {
    value: 'PREPARE_BURN_UNIT',
    label: 'Prepare Burn Unit',
    description: 'Fire / lab accident nearby — hospitals stand up burn capacity.',
    typicalSources: ['factory', 'college', 'hotel'],
    typicalTargets: ['hospital'],
  },
  {
    value: 'SECURE_PERIMETER',
    label: 'Secure Perimeter',
    description: 'Civil unrest at neighbor — factories tighten gate access.',
    typicalSources: ['college', 'school'],
    typicalTargets: ['factory'],
  },
  {
    value: 'MEDIA_BLACKOUT_REQUEST',
    label: 'Media Blackout Request',
    description: 'Reputational crisis — coordinated comms freeze across mesh.',
    typicalSources: ['hospital', 'hotel', 'school', 'college', 'factory'],
    typicalTargets: ['hospital', 'hotel', 'school', 'college', 'factory'],
  },
];

// ---------------------------------------------------------------------------
// Facility theming — single source of truth for accent colors, icons,
// and short labels. Drives <FacilityThemeScope> + sidebar/header UI.
//
// Colors are HSL strings (no hsl() wrapper) so they slot directly into the
// shadcn CSS-vars system: e.g. `--primary: ${theme.accent}`.
// ---------------------------------------------------------------------------

export interface FacilityTheme {
  label: string;
  short: string;
  /** lucide-react icon name. */
  icon: 'HeartPulse' | 'Hotel' | 'School' | 'GraduationCap' | 'Factory';
  /** Tailwind-friendly accent classes for ad-hoc badges. */
  accentClass: string;
  /** HSL triplet (no `hsl()`) for light-theme `--primary`. */
  accent: string;
  /** HSL triplet for `--primary-foreground`. */
  accentForeground: string;
  /** HSL triplet for `--ring`. */
  ring: string;
  /** Subtle band color used by sidebar headers / facility chips. */
  bandClass: string;
  /** Hex color for map markers. */
  accentHex: string;
}

export const FACILITY_THEME: Record<FacilityType, FacilityTheme> = {
  hospital: {
    label: 'Hospital',
    short: 'Hosp',
    icon: 'HeartPulse',
    accentClass: 'bg-red-600 text-white',
    accent: '0 84% 50%',
    accentForeground: '0 0% 100%',
    ring: '0 84% 50%',
    bandClass: 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100',
    accentHex: '#e53e3e',
  },
  hotel: {
    label: 'Hotel',
    short: 'Hotel',
    icon: 'Hotel',
    accentClass: 'bg-amber-500 text-black',
    accent: '38 92% 50%',
    accentForeground: '0 0% 0%',
    ring: '38 92% 50%',
    bandClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100',
    accentHex: '#f6ad55',
  },
  school: {
    label: 'School',
    short: 'School',
    icon: 'School',
    accentClass: 'bg-blue-600 text-white',
    accent: '221 83% 53%',
    accentForeground: '0 0% 100%',
    ring: '221 83% 53%',
    bandClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100',
    accentHex: '#3b82f6',
  },
  college: {
    label: 'College',
    short: 'College',
    icon: 'GraduationCap',
    accentClass: 'bg-purple-600 text-white',
    accent: '262 83% 58%',
    accentForeground: '0 0% 100%',
    ring: '262 83% 58%',
    bandClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100',
    accentHex: '#805ad5',
  },
  factory: {
    label: 'Factory',
    short: 'Plant',
    icon: 'Factory',
    accentClass: 'bg-yellow-400 text-black',
    accent: '48 96% 53%',
    accentForeground: '0 0% 0%',
    ring: '48 96% 53%',
    bandClass: 'bg-yellow-50 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-100',
    accentHex: '#facc15',
  },
};

// ---------------------------------------------------------------------------
// Zone presets — the default list of zones a freshly-created facility gets.
// Admins can override / extend in /admin/facility.
// ---------------------------------------------------------------------------

export const ZONE_PRESETS: Record<FacilityType, string[]> = {
  hospital: ['ER', 'ICU', 'Ward A', 'Ward B', 'OT', 'Pharmacy', 'Reception', 'Parking'],
  hotel: ['Lobby', 'Pool', 'Restaurant', 'Floor 1', 'Floor 2', 'Floor 3', 'Kitchen', 'Parking'],
  school: ['Classrooms', 'Playground', 'Cafeteria', 'Library', 'Gym', 'Office', 'Assembly Hall'],
  college: ['Lecture Hall', 'Lab', 'Hostel A', 'Hostel B', 'Library', 'Cafeteria', 'Sports Ground'],
  factory: ['Floor 1', 'Floor 2', 'Loading Dock', 'Chemical Store', 'Control Room', 'Canteen'],
};

// ---------------------------------------------------------------------------
// Severity + status helpers — small lookup tables for badge colors.
// ---------------------------------------------------------------------------

export const SEVERITY_BADGE_CLASS: Record<'low' | 'medium' | 'high' | 'critical', string> = {
  low: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  medium: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
  critical: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
};

export const STATUS_BADGE_CLASS: Record<string, string> = {
  reported: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200',
  acknowledged: 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200',
  in_progress: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  resolved: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  closed: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};
