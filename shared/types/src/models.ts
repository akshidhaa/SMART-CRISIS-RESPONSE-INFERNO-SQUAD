// SCR-Mesh — Firestore data model (mesh-aware).
// All 5 facility types (hospital, hotel, school, college, factory) share the
// same collections. Cross-entity coordination flows through `meshEvents`.

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type FacilityId = string;
export type UserId = string;
export type IncidentId = string;
export type AlertId = string;
export type RouteId = string;
export type MeshEventId = string;
export type SubscriptionId = string;
export type CameraId = string;
export type CheckInId = string;

export type FacilityType =
  | 'hospital'
  | 'hotel'
  | 'school'
  | 'college'
  | 'factory';

export type UserRole = 'admin' | 'employee' | 'community' | 'common';

export type Language = 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'bn';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus =
  | 'reported'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'closed';

export type MeshEventStatus =
  | 'published'
  | 'received'
  | 'acknowledged'
  | 'expired';

export type DetectorType =
  | 'weapon'
  | 'fire'
  | 'crowd'
  | 'ppe_violation'
  | 'smoke'
  | 'chemical_spill_visual';

export type DeliveryChannel = 'push' | 'sms' | 'email' | 'in_app' | 'voice';

/** Firestore GeoPoint shape (server & client SDKs agree on this structure). */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Accepts either a native Date or a Firestore Timestamp-like object. */
export type Timestamp = Date | { seconds: number; nanoseconds: number };

// ---------------------------------------------------------------------------
// Embedded value objects
// ---------------------------------------------------------------------------

export interface FloorPlan {
  floorId: string;
  name: string;
  imageUrl?: string;
  zones: string[];
}

export interface Designation {
  id: string;
  label: string;
  role: UserRole;
}

export interface MeshCapabilities {
  /** Mesh event types this facility is willing to publish. */
  canPublish: string[];
  /** Mesh event types this facility is willing to receive. */
  canReceive: string[];
}

export interface IncidentLocation {
  zone: string;
  floor: string;
  coordinates?: GeoPoint;
}

export type MessageTranslations = Record<Language, string>;

// ---------------------------------------------------------------------------
// 1. facilities/{facilityId}
// ---------------------------------------------------------------------------
export interface Facility {
  name: string;
  type: FacilityType;
  tier: string;
  address: string;
  location: GeoPoint;
  floorPlans: FloorPlan[];
  designations: Designation[];
  subscribedMeshRadiusKm: number;
  meshCapabilities: MeshCapabilities;
  createdAt: Timestamp;
}

export interface FacilityNode {
  id: string;
  data: Facility;
  position: { lat: number; lng: number };
}

// ---------------------------------------------------------------------------
// 2. users/{userId}
// ---------------------------------------------------------------------------
export interface User {
  email: string;
  displayName: string;
  phoneNumber: string;
  role: UserRole;
  /** Facility-specific designation, e.g. 'Doctor', 'Professor', 'Safety Officer'. */
  designation: string;
  /** A user can be associated with multiple facilities. */
  facilityIds: FacilityId[];
  zones: string[];
  language: Language;
  /** FCM registration tokens. One per installed device; rotate on app launch. */
  fcmTokens?: string[];
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// 3. incidents/{incidentId}
// ---------------------------------------------------------------------------
export interface Incident {
  facilityId: FacilityId;
  /** Denormalized for query efficiency. */
  facilityType: FacilityType;
  /** Facility-specific incident type (e.g. 'code_blue', 'fire', 'intruder'). */
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reporterId: UserId;
  reporterRole: UserRole;
  location: IncidentLocation;
  description: string;
  aiSummary?: string;
  playbookId?: string;
  assignedStaff: UserId[];
  meshEventsFired: MeshEventId[];
  createdAt: Timestamp;
  reportedAtMs?: number;
  acknowledgedAt?: Timestamp;
  resolvedAt?: Timestamp;
  /** True when incident was auto-created by services/ai-detection from a
   *  camera frame anomaly. Lets downstream UI tag AI-sourced incidents. */
  aiDetected?: boolean;
  /** Populated when `aiDetected` is true — the camera whose frame fired. */
  cameraId?: CameraId;
}

// ---------------------------------------------------------------------------
// 4. alerts/{alertId}
// ---------------------------------------------------------------------------
export interface Alert {
  incidentId: IncidentId;
  facilityId: FacilityId;
  recipientRole: UserRole;
  recipientDesignation?: string;
  recipientZone?: string;
  /** Populated when the alert fanout targets a specific user doc. */
  recipientId?: UserId;
  message: string;
  messageTranslations: MessageTranslations;
  acknowledged: boolean;
  deliveredVia: DeliveryChannel[];
  /** Attempts made by the dispatcher (0 = never tried, capped at 3). */
  retries?: number;
  /** Last dispatch error string — surfaced for debugging retries. */
  lastError?: string;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// 5. evacuationRoutes/{routeId}
// ---------------------------------------------------------------------------
export interface EvacuationWaypoint {
  zone: string;
  floor: string;
  coordinates?: GeoPoint;
  instruction?: string;
}

export interface EvacuationRoute {
  incidentId: IncidentId;
  facilityId: FacilityId;
  fromZone: string;
  toExit: string;
  waypoints: EvacuationWaypoint[];
  transportOptions: string[];
  generatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// 6. meshEvents/{eventId} — FLAGSHIP COLLECTION
// ---------------------------------------------------------------------------
export interface MeshEvent {
  sourceFacilityId: FacilityId;
  sourceFacilityType: FacilityType;
  sourceIncidentId: IncidentId;
  /** e.g. 'PREPARE_TRAUMA_TEAMS', 'EVACUATE_DOWNWIND', 'LOCKDOWN_NEARBY'. */
  eventType: string;
  payload: Record<string, unknown>;
  targetFacilityTypes: FacilityType[];
  radiusKm: number;
  affectedFacilityIds: FacilityId[];
  status: MeshEventStatus;
  publishedAt: Timestamp;
  expiresAt: Timestamp;
}

// ---------------------------------------------------------------------------
// 7. meshSubscriptions/{subscriptionId}
// ---------------------------------------------------------------------------
export interface MeshSubscription {
  facilityId: FacilityId;
  eventTypes: string[];
  radiusKm: number;
  active: boolean;
}

// ---------------------------------------------------------------------------
// 8. cameras/{cameraId} — AI detection input
// ---------------------------------------------------------------------------
export interface Camera {
  facilityId: FacilityId;
  zone: string;
  floor: string;
  streamUrl: string;
  enabledDetectors: DetectorType[];
  active: boolean;
}

// ---------------------------------------------------------------------------
// 9. zoneCheckIns/{checkInId}
// ---------------------------------------------------------------------------
export interface ZoneCheckIn {
  userId: UserId;
  facilityId: FacilityId;
  zone: string;
  checkedInAt: Timestamp;
  checkedOutAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Convenience unions & constants
// ---------------------------------------------------------------------------

export const FACILITY_TYPES: readonly FacilityType[] = [
  'hospital',
  'hotel',
  'school',
  'college',
  'factory',
] as const;

export const LANGUAGES: readonly Language[] = [
  'en',
  'hi',
  'ta',
  'te',
  'mr',
  'bn',
] as const;

export const USER_ROLES: readonly UserRole[] = [
  'admin',
  'employee',
  'community',
  'common',
] as const;

// ---------------------------------------------------------------------------
// Row types for Firestore queries (with document ID)
// ---------------------------------------------------------------------------

export type MeshEventRow = MeshEvent & { id: string; publishedAtMs: number };
export type IncidentRow = Incident & { id: string; createdAtMs: number; reportedAtMs: number };
